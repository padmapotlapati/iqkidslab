"""Part 3: SaaS extensions - admin, payments, blog, analytics, activity logs, complete brain games."""
import os
import csv
import io
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest,
)

# Subscription plans (INR base prices, server-side only)
PLANS = {
    "pay_per_test": {
        "name": "Pay Per Test", "amount": 9.0, "currency": "inr",
        "mode": "one_time", "credits": 1,
        "description": "One complete AI-powered assessment",
    },
    "starter_pack": {
        "name": "Starter Pack", "amount": 39.0, "currency": "inr",
        "mode": "one_time", "credits": 5,
        "description": "5 assessments with AI reports & certificates",
    },
    "family_pack": {
        "name": "Family Pack", "amount": 69.0, "currency": "inr",
        "mode": "one_time", "credits": 10,
        "description": "10 assessments across multiple children",
    },
    "premium_monthly": {
        "name": "Premium Monthly", "amount": 99.0, "currency": "inr",
        "mode": "subscription", "interval": "month",
        "billing_period_days": 30,
        "description": "Unlimited everything for a month",
    },
    "premium_yearly": {
        "name": "Premium Yearly", "amount": 799.0, "currency": "inr",
        "mode": "subscription", "interval": "year",
        "billing_period_days": 365,
        "description": "Save 33% — best value for the year",
    },
}


class CheckoutIn(BaseModel):
    plan_id: str
    origin_url: str
    coupon_code: Optional[str] = None


class CouponIn(BaseModel):
    code: str
    discount_percent: int = Field(..., ge=1, le=100)
    max_redemptions: Optional[int] = None
    expires_at: Optional[str] = None


class BlogPostIn(BaseModel):
    title: str
    slug: str
    excerpt: str
    content: str
    cover_image: Optional[str] = ""
    tags: List[str] = []
    category: Optional[str] = "general"
    status: str = "published"


class QuestionUpdateIn(BaseModel):
    prompt: Optional[str] = None
    options: Optional[List[str]] = None
    answer: Optional[int] = None
    difficulty: Optional[int] = None
    category: Optional[str] = None
    status: Optional[str] = None


class ContactMessageIn(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


class TrackPageViewIn(BaseModel):
    path: str
    referrer: Optional[str] = ""
    user_agent: Optional[str] = ""
    visitor_id: Optional[str] = ""


def build_router(db, require_admin, get_current_user, push_notification):
    """Build the SaaS router. Deps injected from main server.py."""
    router = APIRouter(prefix="/api")

    # ============ PUBLIC PLANS ============
    @router.get("/plans")
    async def list_plans():
        return [{"id": k, **v} for k, v in PLANS.items()]

    # ============ ANALYTICS TRACK (public, unauth) ============
    @router.post("/track/pageview")
    async def track_pageview(payload: TrackPageViewIn, request: Request):
        doc = {
            "path": payload.path,
            "referrer": payload.referrer or "",
            "user_agent": payload.user_agent or request.headers.get("user-agent", ""),
            "visitor_id": payload.visitor_id or "",
            "ip_hash": _hash_ip(request.client.host if request.client else ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        }
        await db.pageviews.insert_one(doc)
        return {"ok": True}

    # ============ CONTACT ============
    @router.post("/contact")
    async def submit_contact(payload: ContactMessageIn):
        doc = payload.model_dump()
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        doc["status"] = "new"
        await db.contact_messages.insert_one(doc)
        return {"ok": True, "message": "Thanks for reaching out! We'll get back within 48h."}

    # ============ PAYMENTS ============
    @router.post("/payments/checkout")
    async def create_checkout(payload: CheckoutIn, request: Request, user=Depends(get_current_user)):
        if payload.plan_id not in PLANS:
            raise HTTPException(400, "Invalid plan")
        plan = PLANS[payload.plan_id]
        amount = plan["amount"]
        discount_pct = 0
        applied_coupon = None
        if payload.coupon_code:
            coupon = await db.coupons.find_one({"code": payload.coupon_code.upper().strip(), "active": True})
            if coupon and (not coupon.get("max_redemptions") or coupon.get("redemptions", 0) < coupon["max_redemptions"]):
                discount_pct = coupon["discount_percent"]
                applied_coupon = coupon["code"]
                amount = round(amount * (100 - discount_pct) / 100, 2)

        host = str(request.base_url)
        webhook_url = f"{host}api/webhook/stripe"
        stripe_checkout = StripeCheckout(
            api_key=os.environ.get("STRIPE_API_KEY", "sk_test_emergent"),
            webhook_url=webhook_url,
        )
        req = CheckoutSessionRequest(
            amount=float(amount),
            currency=plan["currency"],
            success_url=f"{payload.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{payload.origin_url}/payment/cancel",
            metadata={
                "user_id": user["id"],
                "plan_id": payload.plan_id,
                "coupon": applied_coupon or "",
                "mode": plan.get("mode", "subscription"),
            },
        )
        session = await stripe_checkout.create_checkout_session(req)
        await db.payment_transactions.insert_one({
            "session_id": session.session_id,
            "user_id": user["id"],
            "plan_id": payload.plan_id,
            "plan_name": plan.get("name"),
            "mode": plan.get("mode", "subscription"),
            "amount": float(amount),
            "currency": plan["currency"],
            "coupon": applied_coupon,
            "status": "initiated",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"checkout_url": session.url, "session_id": session.session_id}

    @router.get("/payments/status/{session_id}")
    async def payment_status(session_id: str, request: Request):
        record = await db.payment_transactions.find_one({"session_id": session_id})
        if not record:
            raise HTTPException(404, "Transaction not found")
        if record.get("payment_status") != "paid":
            try:
                host = str(request.base_url)
                stripe_checkout = StripeCheckout(
                    api_key=os.environ.get("STRIPE_API_KEY", "sk_test_emergent"),
                    webhook_url=f"{host}api/webhook/stripe",
                )
                status = await stripe_checkout.get_checkout_status(session_id)
                if status.payment_status == "paid" or status.status == "complete":
                    await _mark_paid(db, session_id, record)
                    record = await db.payment_transactions.find_one({"session_id": session_id})
            except Exception:
                pass
        return {
            "session_id": record["session_id"],
            "status": record["status"],
            "payment_status": record["payment_status"],
            "amount": record.get("amount"),
            "plan_id": record.get("plan_id"),
        }

    @router.post("/webhook/stripe")
    async def stripe_webhook(request: Request):
        body = await request.body()
        host = str(request.base_url)
        stripe_checkout = StripeCheckout(
            api_key=os.environ.get("STRIPE_API_KEY", "sk_test_emergent"),
            webhook_url=f"{host}api/webhook/stripe",
        )
        try:
            wr = await stripe_checkout.handle_webhook(body, request.headers.get("Stripe-Signature", ""))
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=400)
        if wr.payment_status == "paid":
            record = await db.payment_transactions.find_one({"session_id": wr.session_id})
            if record:
                await _mark_paid(db, wr.session_id, record)
        return {"status": "ok"}

    @router.get("/payments/history")
    async def payment_history(user=Depends(get_current_user)):
        items = []
        async for p in db.payment_transactions.find({"user_id": user["id"]}).sort("created_at", -1):
            p["id"] = str(p["_id"]); p.pop("_id", None); items.append(p)
        return items

    @router.get("/subscription/me")
    async def my_subscription(user=Depends(get_current_user)):
        sub = await db.subscriptions.find_one({"user_id": user["id"], "active": True})
        if not sub:
            return {"active": False, "plan": "free"}
        sub["id"] = str(sub["_id"]); sub.pop("_id", None)
        return {"active": True, **sub}

    # ============ COUPONS ============
    @router.get("/coupons/{code}")
    async def check_coupon(code: str):
        c = await db.coupons.find_one({"code": code.upper().strip(), "active": True})
        if not c: raise HTTPException(404, "Coupon not found")
        c.pop("_id", None)
        return {"code": c["code"], "discount_percent": c["discount_percent"]}

    @router.post("/admin/coupons")
    async def create_coupon(payload: CouponIn, admin=Depends(require_admin)):
        doc = payload.model_dump()
        doc["code"] = doc["code"].upper().strip()
        doc["active"] = True
        doc["redemptions"] = 0
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        doc["created_by"] = admin["id"]
        try:
            r = await db.coupons.insert_one(doc)
        except Exception:
            raise HTTPException(400, "Coupon code already exists")
        doc["id"] = str(r.inserted_id)
        doc.pop("_id", None)
        return doc

    @router.get("/admin/coupons")
    async def list_coupons(admin=Depends(require_admin)):
        items = []
        async for c in db.coupons.find({}).sort("created_at", -1):
            c["id"] = str(c["_id"]); c.pop("_id", None); items.append(c)
        return items

    # ============ GEO DETECTION ============
    @router.get("/geo/detect")
    async def geo_detect(request: Request):
        # Cheap heuristic: use Accept-Language + CF-IPCountry (if present)
        cf_country = request.headers.get("cf-ipcountry", "").upper()
        if cf_country and cf_country not in ("XX", ""):
            country = cf_country
        else:
            al = request.headers.get("accept-language", "").lower()
            if "-in" in al or al.startswith("hi") or al.startswith("te") or al.startswith("ta"):
                country = "IN"
            else:
                country = "OTHER"
        return {"country": country, "is_india": country == "IN", "currency": "INR" if country == "IN" else "USD"}

    # ============ REFERRALS ============
    @router.get("/referrals/me")
    async def my_referral(user=Depends(get_current_user)):
        # Get or create a stable referral code for this user
        existing = await db.referral_codes.find_one({"user_id": user["id"]})
        if existing:
            code = existing["code"]
        else:
            import secrets as _sec
            code = "KIQ-" + _sec.token_hex(3).upper()
            await db.referral_codes.insert_one({"user_id": user["id"], "code": code, "created_at": datetime.now(timezone.utc).isoformat()})
        count = await db.referrals.count_documents({"referrer_id": user["id"]})
        rewarded = await db.referrals.count_documents({"referrer_id": user["id"], "rewarded": True})
        return {"code": code, "referred_signups": count, "rewarded_purchases": rewarded, "credits_per_referral": 3}

    class ReferralApply(BaseModel):
        code: str

    @router.post("/referrals/apply")
    async def apply_referral(payload: ReferralApply, user=Depends(get_current_user)):
        code = payload.code.upper().strip()
        entry = await db.referral_codes.find_one({"code": code})
        if not entry: raise HTTPException(404, "Invalid referral code")
        if entry["user_id"] == user["id"]: raise HTTPException(400, "Cannot use your own code")
        existing = await db.referrals.find_one({"referee_id": user["id"]})
        if existing: raise HTTPException(400, "You have already used a referral code")
        await db.referrals.insert_one({
            "referrer_id": entry["user_id"],
            "referee_id": user["id"],
            "code": code,
            "rewarded": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"ok": True, "message": "Referral applied! Both you and your referrer get 3 free assessments after your first purchase."}

    # ============ REVENUE ANALYTICS (admin) ============
    @router.get("/admin/revenue")
    async def admin_revenue(admin=Depends(require_admin)):
        now = datetime.now(timezone.utc)
        today = now.strftime("%Y-%m-%d")
        month_start = now.strftime("%Y-%m")
        year_start = now.strftime("%Y")

        revenue_today = 0.0
        revenue_month = 0.0
        revenue_year = 0.0
        total_paid = 0
        total_attempts = 0
        plan_counts = {}
        recent = []

        async for p in db.payment_transactions.find({}).sort("created_at", -1):
            total_attempts += 1
            amt = float(p.get("amount", 0))
            if p.get("payment_status") == "paid":
                total_paid += 1
                created = p.get("created_at", "")
                if created.startswith(today): revenue_today += amt
                if created.startswith(month_start): revenue_month += amt
                if created.startswith(year_start): revenue_year += amt
                pid = p.get("plan_id", "unknown")
                plan_counts[pid] = plan_counts.get(pid, 0) + 1

        # 30 recent
        async for p in db.payment_transactions.find({}).sort("created_at", -1).limit(30):
            p["id"] = str(p["_id"]); p.pop("_id", None); recent.append(p)

        most_purchased = max(plan_counts.items(), key=lambda x: x[1]) if plan_counts else (None, 0)
        # Free to paid conversion
        total_parents = await db.users.count_documents({"role": "parent"})
        paid_users_ids = set()
        async for p in db.payment_transactions.find({"payment_status": "paid"}, {"user_id": 1}):
            paid_users_ids.add(p.get("user_id"))
        conversion = round((len(paid_users_ids) / total_parents * 100), 1) if total_parents else 0

        return {
            "revenue_today": round(revenue_today, 2),
            "revenue_month": round(revenue_month, 2),
            "revenue_year": round(revenue_year, 2),
            "total_paid_count": total_paid,
            "payment_success_rate": round((total_paid / total_attempts * 100), 1) if total_attempts else 0,
            "plan_counts": plan_counts,
            "most_purchased_plan": most_purchased[0],
            "conversion_rate": conversion,
            "paid_users": len(paid_users_ids),
            "total_parents": total_parents,
            "recent_transactions": recent,
            "currency": "INR",
        }

    # ============ ADMIN STATS ============
    @router.get("/admin/stats")
    async def admin_stats(admin=Depends(require_admin)):
        total_parents = await db.users.count_documents({"role": "parent"})
        total_children = await db.children.count_documents({})
        total_assessments = await db.assessments.count_documents({})
        total_certificates = await db.certificates.count_documents({})
        total_pageviews = await db.pageviews.count_documents({})

        # Unique visitors (distinct ip_hash)
        unique_visitors = await db.pageviews.distinct("ip_hash")
        # Active users last 7 days (logged assessments or games)
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        active_users_ids = await db.assessments.distinct("parent_id", {"created_at": {"$gte": week_ago}})
        # Premium subs
        premium_subs = await db.subscriptions.count_documents({"active": True})
        # Revenue (sum of paid transactions)
        revenue = 0.0
        async for p in db.payment_transactions.find({"payment_status": "paid"}):
            revenue += float(p.get("amount", 0))

        # Recent activities (last 10)
        recent = []
        async for a in db.audit_logs.find({}).sort("created_at", -1).limit(10):
            a["id"] = str(a["_id"]); a.pop("_id", None); recent.append(a)

        # Signups over last 14 days
        signup_trend = []
        for i in range(14, -1, -1):
            day = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
            count = await db.users.count_documents({"created_at": {"$regex": f"^{day}"}})
            signup_trend.append({"date": day, "count": count})

        # Traffic by day (last 14)
        traffic_trend = []
        for i in range(14, -1, -1):
            day = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
            count = await db.pageviews.count_documents({"date": day})
            traffic_trend.append({"date": day, "count": count})

        # Top pages
        pipeline = [
            {"$group": {"_id": "$path", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 8},
        ]
        top_pages = []
        async for row in db.pageviews.aggregate(pipeline):
            top_pages.append({"path": row["_id"], "count": row["count"]})

        return {
            "total_parents": total_parents,
            "total_children": total_children,
            "total_assessments": total_assessments,
            "total_certificates": total_certificates,
            "total_pageviews": total_pageviews,
            "unique_visitors": len(unique_visitors),
            "active_users_7d": len(active_users_ids),
            "premium_subscribers": premium_subs,
            "revenue_total": round(revenue, 2),
            "recent_activities": recent,
            "signup_trend": signup_trend,
            "traffic_trend": traffic_trend,
            "top_pages": top_pages,
        }

    # ============ ADMIN USER MGMT ============
    @router.get("/admin/users")
    async def admin_list_users(admin=Depends(require_admin), search: Optional[str] = None, blocked: Optional[bool] = None):
        query = {}
        if search:
            query["$or"] = [
                {"email": {"$regex": re.escape(search), "$options": "i"}},
                {"name": {"$regex": re.escape(search), "$options": "i"}},
            ]
        if blocked is not None:
            query["blocked"] = blocked
        items = []
        async for u in db.users.find(query).sort("created_at", -1).limit(500):
            u["id"] = str(u["_id"]); u.pop("_id", None); u.pop("password_hash", None)
            u["children_count"] = await db.children.count_documents({"parent_id": u["id"]})
            u["assessments_count"] = await db.assessments.count_documents({"parent_id": u["id"]})
            items.append(u)
        return items

    @router.post("/admin/users/{user_id}/block")
    async def admin_block_user(user_id: str, admin=Depends(require_admin)):
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"blocked": True}})
        await _audit(db, admin["id"], "block_user", {"target": user_id})
        return {"ok": True}

    @router.post("/admin/users/{user_id}/unblock")
    async def admin_unblock_user(user_id: str, admin=Depends(require_admin)):
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"blocked": False}})
        await _audit(db, admin["id"], "unblock_user", {"target": user_id})
        return {"ok": True}

    @router.delete("/admin/users/{user_id}")
    async def admin_delete_user(user_id: str, admin=Depends(require_admin)):
        if user_id == admin["id"]:
            raise HTTPException(400, "Cannot delete yourself")
        await db.users.delete_one({"_id": ObjectId(user_id)})
        await db.children.delete_many({"parent_id": user_id})
        await db.assessments.delete_many({"parent_id": user_id})
        await db.certificates.delete_many({"parent_id": user_id})
        await _audit(db, admin["id"], "delete_user", {"target": user_id})
        return {"ok": True}

    @router.get("/admin/users/export.csv")
    async def admin_export_users_csv(admin=Depends(require_admin)):
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(["id", "email", "name", "role", "xp", "coins", "created_at", "blocked", "children_count", "assessments_count"])
        async for u in db.users.find({}):
            uid = str(u["_id"])
            writer.writerow([
                uid, u.get("email"), u.get("name"), u.get("role"),
                u.get("xp", 0), u.get("coins", 0), u.get("created_at"),
                bool(u.get("blocked", False)),
                await db.children.count_documents({"parent_id": uid}),
                await db.assessments.count_documents({"parent_id": uid}),
            ])
        out.seek(0)
        return StreamingResponse(io.BytesIO(out.getvalue().encode()), media_type="text/csv",
                                 headers={"Content-Disposition": 'attachment; filename="users.csv"'})

    # ============ ADMIN QUESTION MGMT ============
    @router.get("/admin/questions/all")
    async def admin_list_all_questions(admin=Depends(require_admin)):
        # Merge builtin + custom
        from questions_data import QUESTIONS as BUILTIN
        items = list(BUILTIN)
        async for q in db.custom_questions.find({}):
            q["id"] = q.get("q_id", str(q["_id"])); q.pop("_id", None); items.append(q)
        return {"count": len(items), "items": items}

    @router.patch("/admin/questions/{q_id}")
    async def admin_update_question(q_id: str, payload: QuestionUpdateIn, admin=Depends(require_admin)):
        update = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not update:
            raise HTTPException(400, "No fields to update")
        # Only custom_questions are editable (builtin bank is code)
        r = await db.custom_questions.update_one({"q_id": q_id}, {"$set": update})
        if r.matched_count == 0:
            raise HTTPException(400, "Cannot edit builtin questions. Only custom (custom-XXX) questions are editable.")
        await _audit(db, admin["id"], "update_question", {"q_id": q_id, "fields": list(update.keys())})
        return {"ok": True}

    @router.delete("/admin/questions/{q_id}")
    async def admin_delete_question(q_id: str, admin=Depends(require_admin)):
        r = await db.custom_questions.delete_one({"q_id": q_id})
        if r.deleted_count == 0:
            raise HTTPException(400, "Cannot delete builtin questions.")
        await _audit(db, admin["id"], "delete_question", {"q_id": q_id})
        return {"ok": True}

    @router.get("/admin/questions/export.csv")
    async def admin_export_questions_csv(admin=Depends(require_admin)):
        from questions_data import QUESTIONS as BUILTIN
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(["id", "age_group", "category", "question_type", "difficulty", "prompt", "options", "answer", "explanation", "points", "source"])
        for q in BUILTIN:
            writer.writerow([q["id"], q["age_group"], q["category"], q["question_type"], q["difficulty"],
                             q["prompt"], " | ".join(q["options"]), q["answer"], q["explanation"], q["points"], "builtin"])
        async for q in db.custom_questions.find({}):
            writer.writerow([q.get("q_id"), q.get("age_group"), q.get("category"), q.get("question_type"),
                             q.get("difficulty"), q.get("prompt"), " | ".join(q.get("options", [])),
                             q.get("answer"), q.get("explanation", ""), q.get("points", 10), "custom"])
        out.seek(0)
        return StreamingResponse(io.BytesIO(out.getvalue().encode()), media_type="text/csv",
                                 headers={"Content-Disposition": 'attachment; filename="questions.csv"'})

    # ============ BLOG (admin CRUD + public list) ============
    @router.get("/blog")
    async def list_blog(category: Optional[str] = None, tag: Optional[str] = None, search: Optional[str] = None):
        query = {"status": "published"}
        if category: query["category"] = category
        if tag: query["tags"] = tag
        if search:
            query["$or"] = [
                {"title": {"$regex": re.escape(search), "$options": "i"}},
                {"excerpt": {"$regex": re.escape(search), "$options": "i"}},
            ]
        items = []
        async for p in db.blog_posts.find(query).sort("created_at", -1):
            p["id"] = str(p["_id"]); p.pop("_id", None); items.append(p)
        return items

    @router.get("/blog/{slug}")
    async def get_blog_post(slug: str):
        p = await db.blog_posts.find_one({"slug": slug, "status": "published"})
        if not p: raise HTTPException(404, "Not found")
        p["id"] = str(p["_id"]); p.pop("_id", None)
        # Increment views
        await db.blog_posts.update_one({"slug": slug}, {"$inc": {"views": 1}})
        return p

    @router.post("/admin/blog")
    async def create_blog(payload: BlogPostIn, admin=Depends(require_admin)):
        doc = payload.model_dump()
        if await db.blog_posts.find_one({"slug": doc["slug"]}):
            raise HTTPException(400, "Slug already exists")
        doc["author_id"] = admin["id"]
        doc["author_name"] = admin.get("name", "Admin")
        doc["views"] = 0
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        r = await db.blog_posts.insert_one(doc)
        doc["id"] = str(r.inserted_id); doc.pop("_id", None)
        await _audit(db, admin["id"], "create_blog", {"slug": doc["slug"]})
        return doc

    @router.delete("/admin/blog/{slug}")
    async def delete_blog(slug: str, admin=Depends(require_admin)):
        r = await db.blog_posts.delete_one({"slug": slug})
        if r.deleted_count == 0:
            raise HTTPException(404, "Not found")
        await _audit(db, admin["id"], "delete_blog", {"slug": slug})
        return {"ok": True}

    # ============ AUDIT LOGS ============
    @router.get("/admin/audit-logs")
    async def list_audit_logs(admin=Depends(require_admin), limit: int = 100):
        items = []
        async for a in db.audit_logs.find({}).sort("created_at", -1).limit(min(limit, 500)):
            a["id"] = str(a["_id"]); a.pop("_id", None); items.append(a)
        return items

    # ============ CONTACT MESSAGES ============
    @router.get("/admin/contact-messages")
    async def list_contact_messages(admin=Depends(require_admin)):
        items = []
        async for m in db.contact_messages.find({}).sort("created_at", -1).limit(200):
            m["id"] = str(m["_id"]); m.pop("_id", None); items.append(m)
        return items

    # ============ EMAIL "SENDS" (MOCKED - logs to DB) ============
    @router.get("/admin/email-log")
    async def email_log(admin=Depends(require_admin)):
        items = []
        async for e in db.emails_sent.find({}).sort("created_at", -1).limit(200):
            e["id"] = str(e["_id"]); e.pop("_id", None); items.append(e)
        return items

    return router


# ---------- helpers ----------
def _hash_ip(ip: str) -> str:
    import hashlib
    return hashlib.sha256((ip or "unknown").encode()).hexdigest()[:16]


async def _audit(db, user_id: str, action: str, meta: dict):
    await db.audit_logs.insert_one({
        "user_id": user_id, "action": action, "meta": meta,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def _mark_paid(db, session_id: str, record: dict):
    """Idempotently mark payment as paid + activate subscription OR add credits."""
    existing = await db.payment_transactions.find_one({"session_id": session_id, "payment_status": "paid"})
    if existing:
        return
    plan_id = record.get("plan_id")
    plan = PLANS.get(plan_id, {})
    now = datetime.now(timezone.utc)
    await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid", "updated_at": now.isoformat()}},
    )
    mode = plan.get("mode", "subscription")
    if mode == "subscription":
        expires = now + timedelta(days=plan.get("billing_period_days", 30))
        await db.subscriptions.update_many({"user_id": record["user_id"]}, {"$set": {"active": False}})
        await db.subscriptions.insert_one({
            "user_id": record["user_id"],
            "plan_id": plan_id,
            "plan_name": plan.get("name"),
            "amount": record.get("amount"),
            "currency": record.get("currency", "inr"),
            "active": True,
            "started_at": now.isoformat(),
            "expires_at": expires.isoformat(),
            "session_id": session_id,
        })
        title = "Welcome to Premium!"
        body_email = f"Thank you for subscribing to {plan.get('name')}. Your access is active until {expires.strftime('%b %d, %Y')}."
    else:
        # One-time purchase: add assessment credits
        credits = plan.get("credits", 0)
        from bson import ObjectId as _OID
        await db.users.update_one({"_id": _OID(record["user_id"])}, {"$inc": {"assessment_credits": credits}})
        title = f"{credits} assessment{'s' if credits != 1 else ''} added!"
        body_email = f"Your {plan.get('name')} purchase was successful. {credits} assessment credit(s) added to your account."
    # Referral reward: give both sides a bonus if this user was referred
    referred_by = await db.referrals.find_one({"referee_id": record["user_id"], "rewarded": False})
    if referred_by:
        from bson import ObjectId as _OID
        await db.users.update_one({"_id": _OID(referred_by["referrer_id"])}, {"$inc": {"assessment_credits": 3}})
        await db.users.update_one({"_id": _OID(record["user_id"])}, {"$inc": {"assessment_credits": 3}})
        await db.referrals.update_one({"_id": referred_by["_id"]}, {"$set": {"rewarded": True, "rewarded_at": now.isoformat()}})
    # Bump coupon redemptions
    if record.get("coupon"):
        await db.coupons.update_one({"code": record["coupon"]}, {"$inc": {"redemptions": 1}})
    # Log email + notification
    await db.emails_sent.insert_one({
        "to": record.get("user_id"),
        "template": "payment_success",
        "subject": title,
        "body": body_email,
        "created_at": now.isoformat(),
    })
    await db.notifications.insert_one({
        "user_id": record["user_id"], "kind": "payment_success",
        "title": title,
        "body": body_email,
        "link": "/dashboard",
        "read": False,
        "created_at": now.isoformat(),
    })
    await db.audit_logs.insert_one({
        "user_id": record["user_id"], "action": "purchase_completed",
        "meta": {"plan": plan_id, "amount": record.get("amount"), "mode": mode},
        "created_at": now.isoformat(),
    })
