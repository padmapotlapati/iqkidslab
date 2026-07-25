"""Razorpay Router — Kids IQ Test.

Plans:
  - Single Assessment Pass (one-time): ₹9  → grants 1 assessment_credit
  - Monthly Premium (recurring): ₹99/month
  - Yearly Premium (recurring): ₹799/year

Assessment quota logic (enforced in server.POST /api/sessions/start):
  is_premium → unlimited (no consumption)
  assessment_credits > 0 → allow, deduct 1
  free_assessments_used < 1 → allow, increment counter
  otherwise → 402 Payment Required

Security:
  - Order created server-side only; amount is not trusted from the client
  - HMAC signature verification on all payment confirmations
  - Optional webhook with X-Razorpay-Signature check
"""
import hmac
import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import razorpay
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field


PLANS = {
    "single":  {"id": "single",  "kind": "one_time",     "amount_paise": 900,     "amount_display": 9,   "currency": "INR", "label": "Single Assessment Pass",   "duration_days": None, "grants_credits": 1},
    "monthly": {"id": "monthly", "kind": "subscription", "amount_paise": 9900,    "amount_display": 99,  "currency": "INR", "label": "Monthly Premium",          "duration_days": 30,   "grants_credits": 0},
    "yearly":  {"id": "yearly",  "kind": "subscription", "amount_paise": 79900,   "amount_display": 799, "currency": "INR", "label": "Yearly Premium",           "duration_days": 365,  "grants_credits": 0},
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _client() -> razorpay.Client:
    key_id = os.environ.get("RAZORPAY_KEY_ID")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        raise HTTPException(status_code=500, detail="Razorpay is not configured")
    c = razorpay.Client(auth=(key_id, key_secret))
    return c


def build_razorpay_router(db, get_current_user, push_notification) -> APIRouter:
    router = APIRouter(prefix="/api/razorpay")

    # ============ Pydantic Models ============
    class CreateOrderIn(BaseModel):
        plan_id: str = Field(..., description="single | monthly | yearly")

    class VerifyIn(BaseModel):
        razorpay_order_id: str
        razorpay_payment_id: str
        razorpay_signature: str

    # ============ Endpoints ============

    @router.get("/config")
    async def config():
        """Public Razorpay config for the frontend checkout modal."""
        return {"key_id": os.environ.get("RAZORPAY_KEY_ID", ""), "currency": "INR"}

    @router.get("/plans")
    async def plans():
        return {"plans": list(PLANS.values())}

    @router.post("/order")
    async def create_order(payload: CreateOrderIn, user=Depends(get_current_user)):
        plan = PLANS.get(payload.plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail="Unknown plan")

        # Receipt must be ≤ 40 chars (Razorpay limit)
        receipt = f"kiq-{plan['id']}-{user['id'][-10:]}-{int(_now().timestamp())}"[:40]

        try:
            order = _client().order.create({
                "amount": plan["amount_paise"],
                "currency": plan["currency"],
                "receipt": receipt,
                "notes": {
                    "user_id": user["id"], "user_email": user.get("email", ""),
                    "plan_id": plan["id"], "plan_label": plan["label"],
                },
                "payment_capture": 1,
            })
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Razorpay error: {e}")

        # Belt-and-suspenders: confirm SDK didn't tamper with the amount
        if int(order.get("amount", 0)) != plan["amount_paise"]:
            raise HTTPException(status_code=500, detail="Order amount mismatch")

        # Persist transaction record (status: created)
        await db.payment_transactions.insert_one({
            "provider": "razorpay",
            "user_id": user["id"], "user_email": user.get("email"),
            "plan_id": plan["id"], "plan_label": plan["label"],
            "amount_paise": plan["amount_paise"], "currency": plan["currency"],
            "order_id": order["id"], "receipt": receipt,
            "status": "created", "kind": plan["kind"],
            "created_at": _now().isoformat(),
        })

        return {
            "order_id": order["id"],
            "amount_paise": plan["amount_paise"],
            "currency": plan["currency"],
            "key_id": os.environ.get("RAZORPAY_KEY_ID", ""),
            "plan": plan,
            "prefill": {"email": user.get("email", ""), "name": user.get("name", "")},
        }

    async def _grant_entitlement(user_id: str, plan: dict, order_id: str, payment_id: str) -> dict:
        """Grant credits or subscription based on plan.kind. Idempotent by order_id."""
        # Idempotency guard: if we already marked this order as paid, skip
        existing = await db.payment_transactions.find_one({"order_id": order_id, "status": "paid"})
        if existing:
            return {"already_processed": True, "kind": plan["kind"]}

        if plan["kind"] == "one_time":
            # Add credits
            await db.users.update_one({"_id": ObjectId(user_id)}, {"$inc": {"assessment_credits": plan["grants_credits"]}})
            return {"granted_credits": plan["grants_credits"], "kind": "one_time"}

        # subscription: deactivate any existing active subs, then create fresh one
        expires = _now() + timedelta(days=plan["duration_days"])
        await db.subscriptions.update_many(
            {"user_id": user_id, "active": True},
            {"$set": {"active": False, "superseded_at": _now().isoformat()}},
        )
        await db.subscriptions.insert_one({
            "user_id": user_id, "provider": "razorpay",
            "plan_id": plan["id"], "plan_label": plan["label"],
            "amount_paise": plan["amount_paise"], "currency": plan["currency"],
            "active": True,
            "started_at": _now().isoformat(),
            "expires_at": expires.isoformat(),
            "order_id": order_id, "payment_id": payment_id,
        })
        return {"kind": "subscription", "expires_at": expires.isoformat()}

    @router.post("/verify")
    async def verify_payment(payload: VerifyIn, user=Depends(get_current_user)):
        """Verify HMAC signature and unlock entitlements."""
        # Look up our record for this order
        tx = await db.payment_transactions.find_one({"order_id": payload.razorpay_order_id, "user_id": user["id"]})
        if not tx:
            raise HTTPException(status_code=404, detail="Order not found")

        # HMAC verification
        secret = os.environ.get("RAZORPAY_KEY_SECRET", "").encode()
        body = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode()
        expected = hmac.new(secret, body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, payload.razorpay_signature):
            await db.payment_transactions.update_one({"_id": tx["_id"]}, {"$set": {
                "status": "signature_failed", "verified_at": _now().isoformat(),
            }})
            raise HTTPException(status_code=400, detail="Payment signature verification failed")

        # Grant entitlement
        plan = PLANS[tx["plan_id"]]
        result = await _grant_entitlement(user["id"], plan, payload.razorpay_order_id, payload.razorpay_payment_id)

        await db.payment_transactions.update_one({"_id": tx["_id"]}, {"$set": {
            "status": "paid",
            "payment_id": payload.razorpay_payment_id,
            "signature": payload.razorpay_signature,
            "verified_at": _now().isoformat(),
        }})
        await push_notification(
            user["id"], "payment_success",
            f"Payment successful — {plan['label']} unlocked!",
            "You can now use your Premium features.",
            "/dashboard",
        )
        return {"ok": True, "plan": plan, "grant": result}

    @router.post("/webhook")
    async def webhook(request: Request):
        """Optional webhook: reconciles orders that never completed client-side."""
        body = await request.body()
        signature = request.headers.get("X-Razorpay-Signature", "")
        secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
        if secret:
            expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(expected, signature):
                raise HTTPException(status_code=400, detail="Invalid webhook signature")
        try:
            evt = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid payload")
        event = evt.get("event", "")
        await db.razorpay_webhook_events.insert_one({
            "event": event, "payload": evt, "received_at": _now().isoformat(),
        })

        if event == "payment.captured":
            payment = (evt.get("payload") or {}).get("payment", {}).get("entity", {}) or {}
            order_id = payment.get("order_id")
            if order_id:
                tx = await db.payment_transactions.find_one({"order_id": order_id})
                if tx and tx.get("status") != "paid":
                    plan = PLANS.get(tx["plan_id"])
                    if plan:
                        await _grant_entitlement(tx["user_id"], plan, order_id, payment.get("id", ""))
                        await db.payment_transactions.update_one({"_id": tx["_id"]}, {"$set": {
                            "status": "paid", "payment_id": payment.get("id"),
                            "verified_at": _now().isoformat(), "verified_via": "webhook",
                        }})
        return {"ok": True}

    @router.get("/subscription")
    async def current_subscription(user=Depends(get_current_user)):
        raw_user = await db.users.find_one({"_id": ObjectId(user["id"])})
        credits = int((raw_user or {}).get("assessment_credits", 0))
        free_used = int((raw_user or {}).get("free_assessments_used", 0))
        sub = await db.subscriptions.find_one(
            {"user_id": user["id"], "active": True}, sort=[("started_at", -1)],
        )
        active = None
        if sub:
            expires = sub.get("expires_at")
            expiry_dt = None
            if isinstance(expires, str):
                try: expiry_dt = datetime.fromisoformat(expires)
                except Exception: expiry_dt = None
            if expiry_dt and expiry_dt.tzinfo is None:
                expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
            if expiry_dt and expiry_dt < _now():
                # Expired — deactivate
                await db.subscriptions.update_one({"_id": sub["_id"]}, {"$set": {"active": False, "expired_at": _now().isoformat()}})
            else:
                active = {
                    "plan_id": sub.get("plan_id"),
                    "plan_label": sub.get("plan_label"),
                    "started_at": sub.get("started_at"),
                    "expires_at": expires,
                    "amount_display": PLANS.get(sub.get("plan_id"), {}).get("amount_display"),
                }
        return {
            "is_premium": bool(active),
            "subscription": active,
            "assessment_credits": credits,
            "free_assessments_used": free_used,
            "free_assessments_remaining": max(0, 1 - free_used),
        }

    @router.post("/subscription/cancel")
    async def cancel_subscription(user=Depends(get_current_user)):
        r = await db.subscriptions.update_many(
            {"user_id": user["id"], "active": True},
            {"$set": {"active": False, "cancelled_at": _now().isoformat()}},
        )
        return {"ok": True, "cancelled_count": r.modified_count}

    @router.get("/history")
    async def purchase_history(user=Depends(get_current_user)):
        items = []
        async for t in db.payment_transactions.find(
            {"user_id": user["id"]}, sort=[("created_at", -1)],
        ).limit(50):
            items.append({
                "order_id": t.get("order_id"),
                "payment_id": t.get("payment_id"),
                "plan_id": t.get("plan_id"),
                "plan_label": t.get("plan_label"),
                "amount_paise": t.get("amount_paise"),
                "amount_display": (t.get("amount_paise", 0) or 0) // 100,
                "currency": t.get("currency", "INR"),
                "status": t.get("status"),
                "kind": t.get("kind"),
                "created_at": t.get("created_at"),
                "verified_at": t.get("verified_at"),
            })
        return {"items": items, "count": len(items)}

    return router
