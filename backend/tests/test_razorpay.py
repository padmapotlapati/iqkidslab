"""Razorpay integration tests — orders, verify HMAC, subscriptions, history, webhook, quota gate."""
import os
import hmac
import hashlib
import uuid
import asyncio
import pytest
import requests
from bson import ObjectId

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://brain-skills-kids.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

RAZORPAY_KEY_SECRET = "8jdthiYidO5nGvJABJ3XrNgB"  # from backend/.env (test)
PARENT_EMAIL = "parent@test.com"
PARENT_PW = "Parent@12345"


def _login(email=PARENT_EMAIL, pw=PARENT_PW):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


def _hmac_sig(order_id: str, payment_id: str) -> str:
    body = f"{order_id}|{payment_id}".encode()
    return hmac.new(RAZORPAY_KEY_SECRET.encode(), body, hashlib.sha256).hexdigest()


# ============ Public endpoints ============
class TestPublicConfig:
    def test_config(self):
        r = requests.get(f"{API}/razorpay/config")
        assert r.status_code == 200
        d = r.json()
        assert d["key_id"].startswith("rzp_test_")
        assert d["currency"] == "INR"

    def test_plans_shape(self):
        r = requests.get(f"{API}/razorpay/plans")
        assert r.status_code == 200
        plans = {p["id"]: p for p in r.json()["plans"]}
        assert plans["single"]["amount_paise"] == 900
        assert plans["monthly"]["amount_paise"] == 9900
        assert plans["yearly"]["amount_paise"] == 79900
        assert plans["monthly"]["duration_days"] == 30
        assert plans["yearly"]["duration_days"] == 365
        assert plans["single"]["grants_credits"] == 1


# ============ Auth-required endpoints ============
class TestSubscriptionEndpoint:
    def test_subscription_shape(self):
        s = _login()
        r = s.get(f"{API}/razorpay/subscription")
        assert r.status_code == 200
        d = r.json()
        for k in ("is_premium", "subscription", "assessment_credits", "free_assessments_used", "free_assessments_remaining"):
            assert k in d, f"missing key {k}"
        assert isinstance(d["assessment_credits"], int)


class TestCreateOrder:
    def test_order_single(self):
        s = _login()
        r = s.post(f"{API}/razorpay/order", json={"plan_id": "single"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["order_id"].startswith("order_")
        assert d["amount_paise"] == 900
        assert d["currency"] == "INR"
        assert d["key_id"].startswith("rzp_test_")

    def test_order_monthly(self):
        s = _login()
        r = s.post(f"{API}/razorpay/order", json={"plan_id": "monthly"})
        assert r.status_code == 200, r.text
        assert r.json()["amount_paise"] == 9900

    def test_order_yearly(self):
        s = _login()
        r = s.post(f"{API}/razorpay/order", json={"plan_id": "yearly"})
        assert r.status_code == 200, r.text
        assert r.json()["amount_paise"] == 79900

    def test_order_invalid_plan(self):
        s = _login()
        r = s.post(f"{API}/razorpay/order", json={"plan_id": "NOPE"})
        assert r.status_code == 400

    def test_order_unauth(self):
        r = requests.post(f"{API}/razorpay/order", json={"plan_id": "single"})
        assert r.status_code in (401, 403)


class TestVerifyPayment:
    def test_verify_invalid_signature_marks_signature_failed(self):
        s = _login()
        # Create an order first
        r = s.post(f"{API}/razorpay/order", json={"plan_id": "single"})
        order_id = r.json()["order_id"]

        bad = s.post(f"{API}/razorpay/verify", json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_TESTFAKE12345",
            "razorpay_signature": "deadbeef" * 8,
        })
        assert bad.status_code == 400

        # Confirm history shows this tx as signature_failed
        h = s.get(f"{API}/razorpay/history").json()
        found = [x for x in h["items"] if x["order_id"] == order_id]
        assert found and found[0]["status"] == "signature_failed"

    def test_verify_valid_signature_grants_credit_single_and_is_idempotent(self):
        s = _login()

        # Baseline credits
        before = s.get(f"{API}/razorpay/subscription").json()["assessment_credits"]

        r = s.post(f"{API}/razorpay/order", json={"plan_id": "single"})
        order_id = r.json()["order_id"]
        fake_pay = f"pay_TEST{uuid.uuid4().hex[:16]}"
        sig = _hmac_sig(order_id, fake_pay)

        ok = s.post(f"{API}/razorpay/verify", json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": fake_pay,
            "razorpay_signature": sig,
        })
        assert ok.status_code == 200, ok.text
        after = s.get(f"{API}/razorpay/subscription").json()["assessment_credits"]
        assert after == before + 1, f"credits {before} → {after}"

        # Idempotency — second call must not double grant
        ok2 = s.post(f"{API}/razorpay/verify", json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": fake_pay,
            "razorpay_signature": sig,
        })
        assert ok2.status_code == 200
        after2 = s.get(f"{API}/razorpay/subscription").json()["assessment_credits"]
        assert after2 == after, "Double-grant on idempotent verify"

    def test_verify_monthly_creates_active_subscription(self):
        s = _login()
        r = s.post(f"{API}/razorpay/order", json={"plan_id": "monthly"})
        order_id = r.json()["order_id"]
        pay = f"pay_TEST{uuid.uuid4().hex[:16]}"
        sig = _hmac_sig(order_id, pay)
        ok = s.post(f"{API}/razorpay/verify", json={
            "razorpay_order_id": order_id, "razorpay_payment_id": pay, "razorpay_signature": sig,
        })
        assert ok.status_code == 200, ok.text
        sub = s.get(f"{API}/razorpay/subscription").json()
        assert sub["is_premium"] is True
        assert sub["subscription"]["plan_id"] == "monthly"

    def test_verify_yearly_supersedes_monthly(self):
        s = _login()
        # Ensure a monthly is active first (previous test may or may not have set it)
        r1 = s.post(f"{API}/razorpay/order", json={"plan_id": "monthly"})
        o1 = r1.json()["order_id"]; p1 = f"pay_TEST{uuid.uuid4().hex[:16]}"
        s.post(f"{API}/razorpay/verify", json={
            "razorpay_order_id": o1, "razorpay_payment_id": p1, "razorpay_signature": _hmac_sig(o1, p1),
        })
        # Now yearly
        r2 = s.post(f"{API}/razorpay/order", json={"plan_id": "yearly"})
        o2 = r2.json()["order_id"]; p2 = f"pay_TEST{uuid.uuid4().hex[:16]}"
        r = s.post(f"{API}/razorpay/verify", json={
            "razorpay_order_id": o2, "razorpay_payment_id": p2, "razorpay_signature": _hmac_sig(o2, p2),
        })
        assert r.status_code == 200
        sub = s.get(f"{API}/razorpay/subscription").json()
        assert sub["is_premium"] is True
        assert sub["subscription"]["plan_id"] == "yearly"


class TestCancelSubscription:
    def test_cancel_deactivates(self):
        s = _login()
        # ensure premium
        r = s.post(f"{API}/razorpay/order", json={"plan_id": "monthly"})
        o = r.json()["order_id"]; p = f"pay_TEST{uuid.uuid4().hex[:16]}"
        s.post(f"{API}/razorpay/verify", json={
            "razorpay_order_id": o, "razorpay_payment_id": p, "razorpay_signature": _hmac_sig(o, p),
        })
        assert s.get(f"{API}/razorpay/subscription").json()["is_premium"] is True
        c = s.post(f"{API}/razorpay/subscription/cancel")
        assert c.status_code == 200
        assert s.get(f"{API}/razorpay/subscription").json()["is_premium"] is False


class TestHistory:
    def test_history_sorted_and_shape(self):
        s = _login()
        r = s.get(f"{API}/razorpay/history")
        assert r.status_code == 200
        d = r.json()
        items = d["items"]
        assert isinstance(items, list)
        assert d["count"] == len(items)
        if len(items) >= 2:
            # sorted newest-first
            assert items[0]["created_at"] >= items[-1]["created_at"]
        # shape
        for it in items[:3]:
            for k in ("order_id", "plan_id", "amount_paise", "status", "created_at"):
                assert k in it


class TestWebhook:
    def test_webhook_no_secret_processes_event(self):
        """RAZORPAY_WEBHOOK_SECRET is empty by default → signature check skipped."""
        s = _login()
        # Create an order to reconcile
        r = s.post(f"{API}/razorpay/order", json={"plan_id": "single"})
        order_id = r.json()["order_id"]

        payload = {
            "event": "payment.captured",
            "payload": {"payment": {"entity": {"id": f"pay_WEB{uuid.uuid4().hex[:12]}", "order_id": order_id}}},
        }
        wr = requests.post(f"{API}/razorpay/webhook", json=payload)
        assert wr.status_code == 200
        # Verify tx marked paid via webhook
        h = s.get(f"{API}/razorpay/history").json()["items"]
        me = [x for x in h if x["order_id"] == order_id][0]
        assert me["status"] == "paid"


# ============ Assessment quota gate on /sessions/start ============
class TestQuotaGate:
    """Uses parent@test.com (premium now due to yearly sub above)."""

    def _get_child_id(self, s):
        r = s.get(f"{API}/children")
        r.raise_for_status()
        kids = r.json()
        if not kids:
            c = s.post(f"{API}/children", json={"name": "TEST_Kid", "age": 6})
            c.raise_for_status()
            return c.json()["id"]
        return kids[0]["id"]

    def test_premium_user_can_start_session_no_credit_consumption(self):
        s = _login()
        # ensure premium
        sub = s.get(f"{API}/razorpay/subscription").json()
        if not sub["is_premium"]:
            r = s.post(f"{API}/razorpay/order", json={"plan_id": "monthly"})
            o = r.json()["order_id"]; p = f"pay_TEST{uuid.uuid4().hex[:16]}"
            s.post(f"{API}/razorpay/verify", json={
                "razorpay_order_id": o, "razorpay_payment_id": p, "razorpay_signature": _hmac_sig(o, p),
            })
        before = s.get(f"{API}/razorpay/subscription").json()["assessment_credits"]
        child_id = self._get_child_id(s)
        r = s.post(f"{API}/sessions/start", json={"child_id": child_id})
        assert r.status_code == 200, r.text
        after = s.get(f"{API}/razorpay/subscription").json()["assessment_credits"]
        assert after == before, "Premium user should not consume credits"

    def test_paywall_returns_402_when_no_quota(self):
        """Create a fresh verified user with zero credits, use free once, second call → 402."""
        # register fresh user
        email = f"TEST_paywall_{uuid.uuid4().hex[:8]}@example.com"
        pw = "Passw0rd!123"
        reg = requests.post(f"{API}/auth/register", json={"email": email, "password": pw, "name": "Pay Wall"})
        assert reg.status_code in (200, 201), reg.text

        # verify email directly in DB
        from pymongo import MongoClient
        mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        mdb = mc[os.environ.get("DB_NAME", "test_database")]
        res = mdb.users.update_one({"email": email.lower()}, {"$set": {"email_verified": True, "assessment_credits": 0, "free_assessments_used": 0}})
        assert res.matched_count == 1, f"user {email} not found for verify update"
        mc.close()

        s = _login(email, pw)
        # add a child
        c = s.post(f"{API}/children", json={"name": "TEST_Kid", "age": 6})
        assert c.status_code in (200, 201), c.text
        child_id = c.json()["id"]

        # First call uses the free assessment
        r1 = s.post(f"{API}/sessions/start", json={"child_id": child_id})
        assert r1.status_code == 200, r1.text

        sub = s.get(f"{API}/razorpay/subscription").json()
        assert sub["free_assessments_used"] >= 1
        assert sub["free_assessments_remaining"] == 0

        # Second call → 402 paywall
        r2 = s.post(f"{API}/sessions/start", json={"child_id": child_id})
        assert r2.status_code == 402, f"expected 402, got {r2.status_code}: {r2.text}"
        detail = r2.json().get("detail", {})
        assert detail.get("code") == "assessment_paywall"

    def test_credit_is_consumed_when_not_premium(self):
        """Fresh user, grant 2 credits via HMAC verify, then a session should decrement to 1."""
        email = f"TEST_credit_{uuid.uuid4().hex[:8]}@example.com"
        pw = "Passw0rd!123"
        reg = requests.post(f"{API}/auth/register", json={"email": email, "password": pw, "name": "Credit User"})
        assert reg.status_code in (200, 201)
        from pymongo import MongoClient
        mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        mdb = mc[os.environ.get("DB_NAME", "test_database")]
        res = mdb.users.update_one({"email": email.lower()}, {"$set": {"email_verified": True, "free_assessments_used": 5}})
        assert res.matched_count == 1
        mc.close()

        s = _login(email, pw)
        # buy single
        r = s.post(f"{API}/razorpay/order", json={"plan_id": "single"})
        o = r.json()["order_id"]; p = f"pay_TEST{uuid.uuid4().hex[:16]}"
        s.post(f"{API}/razorpay/verify", json={
            "razorpay_order_id": o, "razorpay_payment_id": p, "razorpay_signature": _hmac_sig(o, p),
        })
        credits = s.get(f"{API}/razorpay/subscription").json()["assessment_credits"]
        assert credits >= 1

        c = s.post(f"{API}/children", json={"name": "TEST_Kid", "age": 7})
        child_id = c.json()["id"]
        r1 = s.post(f"{API}/sessions/start", json={"child_id": child_id})
        assert r1.status_code == 200
        after = s.get(f"{API}/razorpay/subscription").json()["assessment_credits"]
        assert after == credits - 1, f"credit not consumed: {credits} → {after}"


# ============ Regression: children endpoint reachable ============
class TestRegression:
    def test_children_endpoint(self):
        s = _login()
        r = s.get(f"{API}/children")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_me_returns_verified(self):
        s = _login()
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email_verified"] is True
