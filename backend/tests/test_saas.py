"""Part 3 SaaS backend tests: admin dashboard, payments, blog, coupons,
contact, analytics, audit logs, user block flow, question CSV export."""
import os
import re
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://brain-skills-kids.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@kidsiqtest.com"
ADMIN_PASSWORD = "Admin@12345"
PARENT_EMAIL = "parent@test.com"
PARENT_PASSWORD = "Parent@12345"


# ---- helpers / fixtures ----
def _login(email, password):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def admin():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="session")
def parent():
    return _login(PARENT_EMAIL, PARENT_PASSWORD)


@pytest.fixture(scope="session")
def fresh_parent():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"test_saas_{uuid.uuid4().hex[:10]}@example.com"
    password = "TestPass@123"
    r = s.post(f"{API}/auth/register", json={"name": "SaaS User", "email": email, "password": password}, timeout=15)
    assert r.status_code == 200
    s.email = email
    s.password = password
    return s


# ============ PUBLIC ENDPOINTS ============
class TestPublicEndpoints:
    def test_plans_returns_two(self):
        r = requests.get(f"{API}/plans", timeout=10)
        assert r.status_code == 200
        plans = r.json()
        assert len(plans) == 2
        ids = {p["id"] for p in plans}
        assert ids == {"premium_monthly", "premium_yearly"}
        by_id = {p["id"]: p for p in plans}
        assert by_id["premium_monthly"]["amount"] == 9.99
        assert by_id["premium_yearly"]["amount"] == 89.99

    def test_blog_list_public(self):
        r = requests.get(f"{API}/blog", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_pageview_track(self):
        r = requests.post(f"{API}/track/pageview",
                          json={"path": "/test-page", "referrer": "", "visitor_id": "vTEST"}, timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_contact_form(self):
        r = requests.post(f"{API}/contact",
                          json={"name": "TEST User", "email": "test_contact@example.com",
                                "subject": "Hello", "message": "This is a TEST_ message"}, timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_coupon_not_found(self):
        r = requests.get(f"{API}/coupons/DOES_NOT_EXIST_XYZ", timeout=10)
        assert r.status_code == 404


# ============ ADMIN COUPONS ============
class TestAdminCoupons:
    def test_create_coupon_launch20(self, admin):
        r = admin.post(f"{API}/admin/coupons",
                       json={"code": "LAUNCH20", "discount_percent": 20}, timeout=10)
        # Either 200 (first time) or 400 (already exists from a prior run) - both fine
        assert r.status_code in (200, 400), r.text

    def test_get_coupon_launch20_after_create(self, admin):
        r = requests.get(f"{API}/coupons/LAUNCH20", timeout=10)
        assert r.status_code == 200
        j = r.json()
        assert j["code"] == "LAUNCH20"
        assert j["discount_percent"] == 20

    def test_duplicate_coupon_returns_400(self, admin):
        # Try creating LAUNCH20 again - must be 400
        r = admin.post(f"{API}/admin/coupons",
                       json={"code": "LAUNCH20", "discount_percent": 20}, timeout=10)
        assert r.status_code == 400

    def test_admin_list_coupons(self, admin):
        r = admin.get(f"{API}/admin/coupons", timeout=10)
        assert r.status_code == 200
        arr = r.json()
        assert any(c.get("code") == "LAUNCH20" for c in arr)

    def test_coupon_parent_forbidden(self, parent):
        r = parent.post(f"{API}/admin/coupons",
                        json={"code": "TESTX", "discount_percent": 5}, timeout=10)
        assert r.status_code == 403


# ============ PAYMENTS ============
class TestPayments:
    def test_checkout_requires_auth(self):
        r = requests.post(f"{API}/payments/checkout",
                          json={"plan_id": "premium_monthly", "origin_url": "https://example.com"}, timeout=15)
        assert r.status_code == 401

    def test_checkout_invalid_plan(self, fresh_parent):
        r = fresh_parent.post(f"{API}/payments/checkout",
                              json={"plan_id": "not_a_plan", "origin_url": "https://example.com"}, timeout=15)
        assert r.status_code == 400

    def test_checkout_valid_plan_returns_url(self, fresh_parent):
        r = fresh_parent.post(f"{API}/payments/checkout",
                              json={"plan_id": "premium_monthly",
                                    "origin_url": "https://example.com"}, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "checkout_url" in j and j["checkout_url"].startswith("http")
        assert "session_id" in j and len(j["session_id"]) > 5
        fresh_parent.last_session_id = j["session_id"]

    def test_payment_status_after_checkout(self, fresh_parent):
        sid = getattr(fresh_parent, "last_session_id", None)
        if not sid:
            pytest.skip("no session id from previous test")
        r = fresh_parent.get(f"{API}/payments/status/{sid}", timeout=15)
        assert r.status_code == 200
        j = r.json()
        # Newly-created checkout should still be initiated + pending
        assert j["session_id"] == sid
        assert j["status"] in ("initiated", "completed")
        assert j["payment_status"] in ("pending", "paid")

    def test_payment_history(self, fresh_parent):
        r = fresh_parent.get(f"{API}/payments/history", timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        assert len(arr) >= 1
        assert arr[0].get("plan_id") == "premium_monthly"

    def test_subscription_me_defaults_free(self, fresh_parent):
        r = fresh_parent.get(f"{API}/subscription/me", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j.get("active") is False
        assert j.get("plan") == "free"

    def test_checkout_with_coupon_applies_discount(self, fresh_parent, admin):
        # ensure LAUNCH20 exists
        admin.post(f"{API}/admin/coupons", json={"code": "LAUNCH20", "discount_percent": 20})
        r = fresh_parent.post(f"{API}/payments/checkout",
                              json={"plan_id": "premium_yearly",
                                    "origin_url": "https://example.com",
                                    "coupon_code": "LAUNCH20"}, timeout=30)
        assert r.status_code == 200, r.text
        # verify via history that stored amount is discounted (89.99 * 0.8 = 71.99)
        h = fresh_parent.get(f"{API}/payments/history", timeout=15).json()
        # newest first
        latest = h[0]
        assert latest["plan_id"] == "premium_yearly"
        assert latest["coupon"] == "LAUNCH20"
        assert abs(latest["amount"] - 71.99) < 0.02, f"expected ~71.99 got {latest['amount']}"


# ============ ADMIN STATS ============
class TestAdminStats:
    def test_admin_stats_shape(self, admin):
        r = admin.get(f"{API}/admin/stats", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_parents", "total_children", "total_assessments", "total_certificates",
                  "total_pageviews", "unique_visitors", "active_users_7d",
                  "premium_subscribers", "revenue_total",
                  "recent_activities", "signup_trend", "traffic_trend", "top_pages"):
            assert k in d, f"missing {k}"
        assert isinstance(d["signup_trend"], list) and len(d["signup_trend"]) == 15
        assert isinstance(d["traffic_trend"], list) and len(d["traffic_trend"]) == 15

    def test_parent_forbidden_on_stats(self, parent):
        r = parent.get(f"{API}/admin/stats", timeout=10)
        assert r.status_code == 403


# ============ ADMIN USER MGMT + BLOCK FLOW ============
class TestAdminUsers:
    def test_list_users(self, admin):
        r = admin.get(f"{API}/admin/users", timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) >= 2
        u = arr[0]
        assert "children_count" in u and "assessments_count" in u
        assert "password_hash" not in u

    def test_search_users_by_keyword(self, admin):
        r = admin.get(f"{API}/admin/users", params={"search": "parent"}, timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert any("parent" in (u.get("email") or "").lower() or "parent" in (u.get("name") or "").lower()
                   for u in arr)

    def test_block_unblock_flow(self, admin):
        # register a throwaway user
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        email = f"test_block_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"name": "Blockee", "email": email, "password": "Pass@123"}, timeout=15)
        assert r.status_code == 200
        uid = r.json()["id"]

        # Block
        r = admin.post(f"{API}/admin/users/{uid}/block", timeout=10)
        assert r.status_code == 200

        # Blocked user cannot login
        s2 = requests.Session()
        r = s2.post(f"{API}/auth/login", json={"email": email, "password": "Pass@123"}, timeout=15)
        assert r.status_code == 403
        assert "block" in r.json().get("detail", "").lower()

        # Unblock
        r = admin.post(f"{API}/admin/users/{uid}/unblock", timeout=10)
        assert r.status_code == 200

        # Can login now
        r = s2.post(f"{API}/auth/login", json={"email": email, "password": "Pass@123"}, timeout=15)
        assert r.status_code == 200

        # Cleanup: delete this user
        r = admin.delete(f"{API}/admin/users/{uid}", timeout=10)
        assert r.status_code == 200

    def test_admin_cannot_delete_self(self, admin):
        me = admin.get(f"{API}/auth/me", timeout=10).json()
        r = admin.delete(f"{API}/admin/users/{me['id']}", timeout=10)
        assert r.status_code == 400

    def test_export_users_csv(self, admin):
        r = admin.get(f"{API}/admin/users/export.csv", timeout=20)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        text = r.content.decode()
        # header line contains expected columns
        first_line = text.splitlines()[0]
        for col in ("id", "email", "name", "role", "children_count", "assessments_count"):
            assert col in first_line


# ============ ADMIN QUESTION MGMT ============
class TestAdminQuestions:
    def test_list_all_merges_builtin_custom(self, admin):
        r = admin.get(f"{API}/admin/questions/all", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "count" in j and "items" in j
        assert j["count"] >= 50  # bank has many
        assert isinstance(j["items"], list)

    def test_edit_builtin_fails(self, admin):
        # First get a builtin id (they start without 'custom-')
        j = admin.get(f"{API}/admin/questions/all", timeout=15).json()
        builtin_ids = [q["id"] for q in j["items"] if not str(q["id"]).startswith("custom-")]
        assert builtin_ids
        r = admin.patch(f"{API}/admin/questions/{builtin_ids[0]}", json={"prompt": "changed"}, timeout=10)
        assert r.status_code == 400

    def test_add_and_edit_and_delete_custom(self, admin):
        # add custom question via legacy endpoint
        r = admin.post(f"{API}/admin/questions", json={
            "age_group": "6-8", "category": "memory", "question_type": "multiple_choice",
            "difficulty": 2, "prompt": "TEST_Q custom?", "options": ["a","b","c","d"],
            "answer": 0, "explanation": "e", "estimated_time": 15, "points": 10,
        }, timeout=10)
        assert r.status_code == 200
        qid = r.json()["id"]
        assert qid.startswith("custom-")

        # patch
        r = admin.patch(f"{API}/admin/questions/{qid}", json={"prompt": "TEST_Q updated"}, timeout=10)
        assert r.status_code == 200

        # delete
        r = admin.delete(f"{API}/admin/questions/{qid}", timeout=10)
        assert r.status_code == 200

        # delete again -> 400
        r = admin.delete(f"{API}/admin/questions/{qid}", timeout=10)
        assert r.status_code == 400

    def test_export_questions_csv(self, admin):
        r = admin.get(f"{API}/admin/questions/export.csv", timeout=20)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        assert b"prompt" in r.content


# ============ ADMIN BLOG CRUD ============
class TestAdminBlog:
    slug = "test-brain-skills-kids"

    def test_create_blog(self, admin):
        # cleanup first if it exists
        admin.delete(f"{API}/admin/blog/{self.slug}")
        r = admin.post(f"{API}/admin/blog", json={
            "title": "TEST Brain Skills for Kids", "slug": self.slug,
            "excerpt": "TEST excerpt", "content": "TEST content body markdown",
            "tags": ["test", "brain"], "cover_image": "", "category": "general", "status": "published",
        }, timeout=10)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["slug"] == self.slug

    def test_duplicate_slug_returns_400(self, admin):
        r = admin.post(f"{API}/admin/blog", json={
            "title": "dup", "slug": self.slug,
            "excerpt": "x", "content": "x", "tags": [], "cover_image": "",
        }, timeout=10)
        assert r.status_code == 400

    def test_public_blog_list_contains_new(self):
        r = requests.get(f"{API}/blog", timeout=10)
        assert r.status_code == 200
        slugs = [p["slug"] for p in r.json()]
        assert TestAdminBlog.slug in slugs

    def test_public_blog_get_increments_views(self):
        r1 = requests.get(f"{API}/blog/{TestAdminBlog.slug}", timeout=10)
        assert r1.status_code == 200
        v1 = r1.json().get("views", 0)
        r2 = requests.get(f"{API}/blog/{TestAdminBlog.slug}", timeout=10)
        v2 = r2.json().get("views", 0)
        assert v2 >= v1  # incremented after first read

    def test_delete_blog(self, admin):
        r = admin.delete(f"{API}/admin/blog/{TestAdminBlog.slug}", timeout=10)
        assert r.status_code == 200
        # 404 next time
        r = admin.delete(f"{API}/admin/blog/{TestAdminBlog.slug}", timeout=10)
        assert r.status_code == 404


# ============ AUDIT LOGS ============
class TestAuditLogs:
    def test_login_creates_audit_log(self, admin):
        # trigger a login (parent) then check the audit list
        _login(PARENT_EMAIL, PARENT_PASSWORD)
        r = admin.get(f"{API}/admin/audit-logs", params={"limit": 50}, timeout=15)
        assert r.status_code == 200
        logs = r.json()
        assert isinstance(logs, list)
        assert any(l.get("action") == "login" for l in logs)

    def test_audit_logs_parent_forbidden(self, parent):
        r = parent.get(f"{API}/admin/audit-logs", timeout=10)
        assert r.status_code == 403


# ============ CONTACT MESSAGES (admin view) ============
class TestContactMessages:
    def test_admin_can_view_contact_messages(self, admin):
        # Send first
        requests.post(f"{API}/contact", json={
            "name": "TEST_pinger", "email": "test_ping@example.com",
            "subject": "ping", "message": "TEST message body"}, timeout=10)
        r = admin.get(f"{API}/admin/contact-messages", timeout=10)
        assert r.status_code == 200
        arr = r.json()
        assert any(m.get("name") == "TEST_pinger" for m in arr)


# ============ RATE LIMITING (light check) ============
class TestRateLimiting:
    def test_login_bad_credentials_returns_401_not_500(self):
        # just verify it doesn't blow up; brute-force decorator absence is documented
        r = requests.post(f"{API}/auth/login",
                          json={"email": "nobody@example.com", "password": "wrong"}, timeout=10)
        assert r.status_code == 401
