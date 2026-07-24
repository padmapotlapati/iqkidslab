"""Part 3 SaaS backend tests updated for INR pricing + credits + referrals + geo + admin revenue.
Covers: plans (5 INR), geo detect, referrals, admin revenue, checkout modes (subscription/one_time),
credits mark-paid flow, referral reward flow, coupons, blog, admin users, audit, contact.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@kidsiqtest.com"
ADMIN_PASSWORD = "Admin@12345"
PARENT_EMAIL = "parent@test.com"
PARENT_PASSWORD = "Parent@12345"


def _login(email, password):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return s


def _register(name="Test User"):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"test_saas_{uuid.uuid4().hex[:10]}@example.com"
    password = "TestPass@123"
    r = s.post(f"{API}/auth/register", json={"name": name, "email": email, "password": password}, timeout=15)
    assert r.status_code == 200, r.text
    s.email = email
    s.password = password
    s.user_id = r.json()["id"]
    return s


@pytest.fixture(scope="session")
def admin():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="session")
def parent():
    return _login(PARENT_EMAIL, PARENT_PASSWORD)


@pytest.fixture(scope="session")
def fresh_parent():
    return _register()


# ============ PLANS (INR 5 plans) ============
class TestPlans:
    def test_plans_returns_five_inr(self):
        r = requests.get(f"{API}/plans", timeout=10)
        assert r.status_code == 200
        plans = r.json()
        assert len(plans) == 5
        by_id = {p["id"]: p for p in plans}
        expected = {
            "pay_per_test": 9.0, "starter_pack": 39.0, "family_pack": 69.0,
            "premium_monthly": 99.0, "premium_yearly": 799.0,
        }
        for pid, amount in expected.items():
            assert pid in by_id, f"missing plan {pid}"
            assert by_id[pid]["amount"] == amount, f"{pid} amount != {amount}"
            assert by_id[pid]["currency"].lower() == "inr", f"{pid} currency should be INR"

    def test_one_time_plans_have_credits(self):
        plans = requests.get(f"{API}/plans", timeout=10).json()
        by_id = {p["id"]: p for p in plans}
        assert by_id["pay_per_test"]["mode"] == "one_time"
        assert by_id["pay_per_test"]["credits"] == 1
        assert by_id["starter_pack"]["credits"] == 5
        assert by_id["family_pack"]["credits"] == 10

    def test_subscription_plans_have_interval(self):
        plans = requests.get(f"{API}/plans", timeout=10).json()
        by_id = {p["id"]: p for p in plans}
        assert by_id["premium_monthly"]["mode"] == "subscription"
        assert by_id["premium_monthly"]["interval"] == "month"
        assert by_id["premium_monthly"]["billing_period_days"] == 30
        assert by_id["premium_yearly"]["interval"] == "year"
        assert by_id["premium_yearly"]["billing_period_days"] == 365


# ============ GEO DETECT ============
class TestGeoDetect:
    def test_geo_default_usd(self):
        r = requests.get(f"{API}/geo/detect", headers={"Accept-Language": "en-US"}, timeout=10)
        assert r.status_code == 200
        j = r.json()
        assert set(j.keys()) >= {"country", "is_india", "currency"}
        assert j["is_india"] is False
        assert j["currency"] == "USD"

    def test_geo_india_hindi(self):
        r = requests.get(f"{API}/geo/detect", headers={"Accept-Language": "hi-IN,hi;q=0.9"}, timeout=10)
        assert r.status_code == 200
        j = r.json()
        assert j["is_india"] is True
        assert j["currency"] == "INR"

    def test_geo_india_in_suffix(self):
        r = requests.get(f"{API}/geo/detect", headers={"Accept-Language": "en-in"}, timeout=10)
        j = r.json()
        assert j["is_india"] is True


# ============ AUTH /me returns credits + is_premium ============
class TestAuthMe:
    def test_me_includes_credits_and_premium(self, parent):
        r = parent.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        j = r.json()
        assert "assessment_credits" in j
        assert isinstance(j["assessment_credits"], int)
        assert "is_premium" in j
        assert isinstance(j["is_premium"], bool)


# ============ REFERRALS ============
class TestReferrals:
    def test_referrals_me_returns_stable_code(self, fresh_parent):
        r1 = fresh_parent.get(f"{API}/referrals/me", timeout=10)
        assert r1.status_code == 200
        j1 = r1.json()
        assert set(j1.keys()) >= {"code", "referred_signups", "rewarded_purchases", "credits_per_referral"}
        assert j1["code"].startswith("KIQ-")
        assert len(j1["code"]) == 4 + 6  # KIQ- + 6 hex
        assert j1["credits_per_referral"] == 3

        # Second call should return same code
        r2 = fresh_parent.get(f"{API}/referrals/me", timeout=10)
        assert r2.json()["code"] == j1["code"]

    def test_referral_cannot_use_own_code(self, fresh_parent):
        code = fresh_parent.get(f"{API}/referrals/me", timeout=10).json()["code"]
        r = fresh_parent.post(f"{API}/referrals/apply", json={"code": code}, timeout=10)
        assert r.status_code == 400

    def test_referral_apply_new_user(self, fresh_parent):
        # Get referrer code
        code = fresh_parent.get(f"{API}/referrals/me", timeout=10).json()["code"]
        # Register a new user (referee)
        referee = _register("Referee")
        r = referee.post(f"{API}/referrals/apply", json={"code": code}, timeout=10)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

        # Duplicate apply should 400
        r2 = referee.post(f"{API}/referrals/apply", json={"code": code}, timeout=10)
        assert r2.status_code == 400

    def test_referral_apply_invalid_code(self, fresh_parent):
        r = fresh_parent.post(f"{API}/referrals/apply", json={"code": "KIQ-DEADBE"}, timeout=10)
        assert r.status_code == 404


# ============ CHECKOUT + payment_transaction persistence ============
class TestCheckoutAllPlans:
    @pytest.mark.parametrize("plan_id,expected_amount,expected_mode",
                             [("pay_per_test", 9.0, "one_time"),
                              ("starter_pack", 39.0, "one_time"),
                              ("family_pack", 69.0, "one_time"),
                              ("premium_monthly", 99.0, "subscription"),
                              ("premium_yearly", 799.0, "subscription")])
    def test_checkout_each_plan(self, fresh_parent, plan_id, expected_amount, expected_mode):
        r = fresh_parent.post(f"{API}/payments/checkout",
                              json={"plan_id": plan_id, "origin_url": "https://example.com"},
                              timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["checkout_url"].startswith("http")
        assert "session_id" in j
        setattr(fresh_parent, f"sid_{plan_id}", j["session_id"])

        # verify via history
        hist = fresh_parent.get(f"{API}/payments/history", timeout=15).json()
        latest = next((t for t in hist if t.get("session_id") == j["session_id"]), None)
        assert latest is not None
        assert latest["plan_id"] == plan_id
        assert abs(latest["amount"] - expected_amount) < 0.02
        assert latest["mode"] == expected_mode
        assert latest["currency"].lower() == "inr"

    def test_checkout_invalid_plan(self, fresh_parent):
        r = fresh_parent.post(f"{API}/payments/checkout",
                              json={"plan_id": "not_a_plan", "origin_url": "https://example.com"},
                              timeout=15)
        assert r.status_code == 400

    def test_checkout_requires_auth(self):
        r = requests.post(f"{API}/payments/checkout",
                          json={"plan_id": "premium_monthly", "origin_url": "https://example.com"},
                          timeout=15)
        assert r.status_code == 401


# ============ COUPONS + Discount ============
class TestCoupons:
    def test_ensure_launch20_and_discount(self, admin, fresh_parent):
        # Create LAUNCH20 (idempotent - may already exist)
        r = admin.post(f"{API}/admin/coupons", json={"code": "LAUNCH20", "discount_percent": 20}, timeout=10)
        assert r.status_code in (200, 400)

        # Coupon check public
        c = requests.get(f"{API}/coupons/LAUNCH20", timeout=10)
        assert c.status_code == 200
        assert c.json()["discount_percent"] == 20

        # Checkout premium_monthly with coupon -> amount 99 * 0.8 = 79.2
        r = fresh_parent.post(f"{API}/payments/checkout",
                              json={"plan_id": "premium_monthly", "origin_url": "https://example.com",
                                    "coupon_code": "LAUNCH20"}, timeout=30)
        assert r.status_code == 200, r.text
        sid = r.json()["session_id"]
        hist = fresh_parent.get(f"{API}/payments/history", timeout=15).json()
        latest = next((t for t in hist if t.get("session_id") == sid), None)
        assert latest is not None
        assert latest["coupon"] == "LAUNCH20"
        assert abs(latest["amount"] - 79.2) < 0.05, f"expected ~79.2 got {latest['amount']}"

    def test_duplicate_coupon_returns_400(self, admin):
        r = admin.post(f"{API}/admin/coupons", json={"code": "LAUNCH20", "discount_percent": 20}, timeout=10)
        assert r.status_code == 400


# ============ MARK-PAID FLOW (credits + subscriptions + referral reward) ============
class TestMarkPaidFlow:
    """Directly manipulate payment_transactions + invoke _mark_paid via MongoDB
    to simulate a completed payment (Stripe hosted page not driven)."""

    def _get_credits(self, session):
        return session.get(f"{API}/auth/me", timeout=10).json().get("assessment_credits", 0)

    def _get_is_premium(self, session):
        return session.get(f"{API}/auth/me", timeout=10).json().get("is_premium", False)

    def test_one_time_purchase_adds_credits(self, admin):
        """Simulate a paid pay_per_test transaction by inserting doc + calling _mark_paid via mongodb."""
        import sys, asyncio
        sys.path.insert(0, "/app/backend")
        from motor.motor_asyncio import AsyncIOMotorClient
        from saas_router import _mark_paid, PLANS
        from datetime import datetime, timezone

        # Create fresh user via API
        buyer = _register("Buyer")
        credits_before = self._get_credits(buyer)

        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def run():
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]
            sid = f"cs_test_credit_{uuid.uuid4().hex}"
            record = {
                "session_id": sid,
                "user_id": buyer.user_id,
                "plan_id": "starter_pack",
                "plan_name": PLANS["starter_pack"]["name"],
                "mode": "one_time",
                "amount": 39.0,
                "currency": "inr",
                "coupon": None,
                "status": "initiated",
                "payment_status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.payment_transactions.insert_one(record)
            await _mark_paid(db, sid, record)
            client.close()
            return sid

        sid = asyncio.get_event_loop().run_until_complete(run()) if False else asyncio.new_event_loop().run_until_complete(run())

        credits_after = self._get_credits(buyer)
        assert credits_after == credits_before + 5, f"expected +5 credits, got {credits_after - credits_before}"

        # Notification created
        notifs = buyer.get(f"{API}/notifications", timeout=10).json()
        assert any(n.get("kind") == "payment_success" for n in notifs)

    def test_subscription_purchase_activates_premium(self):
        import asyncio, sys
        sys.path.insert(0, "/app/backend")
        from motor.motor_asyncio import AsyncIOMotorClient
        from saas_router import _mark_paid, PLANS
        from datetime import datetime, timezone

        buyer = _register("PremiumBuyer")
        assert self._get_is_premium(buyer) is False

        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def run():
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]
            sid = f"cs_test_prem_{uuid.uuid4().hex}"
            record = {
                "session_id": sid, "user_id": buyer.user_id,
                "plan_id": "premium_monthly", "plan_name": "Premium Monthly",
                "mode": "subscription", "amount": 99.0, "currency": "inr",
                "coupon": None, "status": "initiated", "payment_status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.payment_transactions.insert_one(record)
            await _mark_paid(db, sid, record)
            # Simulate a second subscription; previous should go inactive
            sid2 = f"cs_test_prem2_{uuid.uuid4().hex}"
            record2 = {k: v for k, v in record.items() if k != "_id"}
            record2["session_id"] = sid2
            record2["plan_id"] = "premium_yearly"; record2["amount"] = 799.0
            await db.payment_transactions.insert_one(record2)
            await _mark_paid(db, sid2, record2)
            client.close()

        asyncio.new_event_loop().run_until_complete(run())
        me = buyer.get(f"{API}/auth/me", timeout=10).json()
        assert me["is_premium"] is True
        # Latest sub is yearly
        sub = buyer.get(f"{API}/subscription/me", timeout=10).json()
        assert sub["active"] is True
        assert sub["plan_id"] == "premium_yearly"

    def test_referral_reward_gives_credits_both_sides(self):
        import asyncio, sys
        sys.path.insert(0, "/app/backend")
        from motor.motor_asyncio import AsyncIOMotorClient
        from saas_router import _mark_paid
        from datetime import datetime, timezone

        referrer = _register("Referrer")
        referee = _register("Referee2")

        code = referrer.get(f"{API}/referrals/me", timeout=10).json()["code"]
        r = referee.post(f"{API}/referrals/apply", json={"code": code}, timeout=10)
        assert r.status_code == 200

        ref_before = referrer.get(f"{API}/auth/me", timeout=10).json().get("assessment_credits", 0)
        e_before = referee.get(f"{API}/auth/me", timeout=10).json().get("assessment_credits", 0)

        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def run():
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]
            sid = f"cs_test_ref_{uuid.uuid4().hex}"
            record = {
                "session_id": sid, "user_id": referee.user_id,
                "plan_id": "pay_per_test", "plan_name": "Pay Per Test",
                "mode": "one_time", "amount": 9.0, "currency": "inr",
                "coupon": None, "status": "initiated", "payment_status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.payment_transactions.insert_one(record)
            await _mark_paid(db, sid, record)
            client.close()

        asyncio.new_event_loop().run_until_complete(run())

        ref_after = referrer.get(f"{API}/auth/me", timeout=10).json().get("assessment_credits", 0)
        e_after = referee.get(f"{API}/auth/me", timeout=10).json().get("assessment_credits", 0)

        # Referrer +3, Referee gets 1 (pay_per_test) + 3 (referral bonus) = +4
        assert ref_after - ref_before == 3, f"referrer credits diff = {ref_after - ref_before}"
        assert e_after - e_before == 4, f"referee credits diff = {e_after - e_before} (expected 1 credit + 3 referral)"

        # Referral now marked rewarded
        r2 = referrer.get(f"{API}/referrals/me", timeout=10).json()
        assert r2["rewarded_purchases"] >= 1


# ============ ADMIN REVENUE ============
class TestAdminRevenue:
    def test_admin_revenue_shape(self, admin):
        r = admin.get(f"{API}/admin/revenue", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("revenue_today", "revenue_month", "revenue_year", "payment_success_rate",
                  "plan_counts", "most_purchased_plan", "conversion_rate",
                  "recent_transactions", "currency"):
            assert k in d, f"missing key {k}"
        assert d["currency"] == "INR"
        assert isinstance(d["plan_counts"], dict)
        assert isinstance(d["recent_transactions"], list)

    def test_admin_revenue_forbidden_for_parent(self, parent):
        r = parent.get(f"{API}/admin/revenue", timeout=10)
        assert r.status_code == 403


# ============ CONTACT + BLOG (still work) ============
class TestLegacy:
    def test_contact_still_works(self):
        r = requests.post(f"{API}/contact", json={
            "name": "TEST_ping", "email": "test_p@example.com",
            "subject": "hi", "message": "TEST msg"}, timeout=10)
        assert r.status_code == 200

    def test_blog_list_public(self):
        r = requests.get(f"{API}/blog", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_pageview_track(self):
        r = requests.post(f"{API}/track/pageview",
                          json={"path": "/pricing", "visitor_id": "vT2"}, timeout=10)
        assert r.status_code == 200


class TestLegacyAdmin:
    def test_admin_stats_still_works(self, admin):
        r = admin.get(f"{API}/admin/stats", timeout=20)
        assert r.status_code == 200

    def test_admin_users_still_works(self, admin):
        r = admin.get(f"{API}/admin/users", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_audit_logs(self, admin):
        r = admin.get(f"{API}/admin/audit-logs", params={"limit": 20}, timeout=10)
        assert r.status_code == 200
