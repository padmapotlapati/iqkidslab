"""Auth v2 backend tests — email verification, hard-lock, forgot/reset, logout, /auth/me shape."""
import os
import time
import uuid
import asyncio
import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://brain-skills-kids.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

EPOCH = int(time.time())


def _mongo_db():
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro) if not asyncio.get_event_loop().is_running() else asyncio.new_event_loop().run_until_complete(coro)


@pytest.fixture(scope="module")
def new_user_session():
    """Register a fresh unverified user, return (session, email, password, user_id)."""
    s = requests.Session()
    email = f"TEST_v2_{EPOCH}_{uuid.uuid4().hex[:6]}@example.com"
    password = "Passw0rd!123"
    r = s.post(f"{API}/auth/register", json={"email": email, "name": "V2 Tester", "password": password})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["email_verified"] is False
    return s, email.lower(), password, body["id"]


@pytest.fixture(scope="module")
def parent_session():
    """Login as parent@test.com (verified)."""
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": "parent@test.com", "password": "Parent@12345"})
    assert r.status_code == 200, r.text
    return s


# ============ REGISTRATION + EMAIL SENT ============
class TestRegisterVerification:
    def test_register_sets_unverified_and_sends_email(self, new_user_session):
        _, email, _, uid = new_user_session
        # Wait briefly for the fire-and-forget email persist
        time.sleep(2)
        async def check():
            db = _mongo_db()
            log = await db.emails_sent.find_one({"to": email, "kind": "verify_email"})
            token = await db.verification_tokens.find_one({"email": email})
            return log, token
        log, token = asyncio.new_event_loop().run_until_complete(check())
        assert log is not None, "emails_sent row not persisted"
        assert "provider_id" in log
        assert token is not None
        assert token["used"] is False


# ============ HARD-LOCK ENFORCEMENT ============
class TestHardLock:
    def test_children_blocked_when_unverified(self, new_user_session):
        s, _, _, _ = new_user_session
        r = s.post(f"{API}/children", json={"name": "Kiddo", "age": 8})
        assert r.status_code == 403
        assert "email_verification_required" in r.text

    def test_sessions_start_blocked_when_unverified(self, new_user_session):
        s, _, _, _ = new_user_session
        r = s.post(f"{API}/sessions/start", json={"child_id": "x", "age_group": "6-8", "category": "verbal"})
        assert r.status_code == 403
        assert "email_verification_required" in r.text


# ============ VERIFY EMAIL ============
class TestVerifyEmail:
    def test_verify_with_valid_token_unlocks(self, new_user_session):
        s, email, _, _ = new_user_session
        # Fetch token directly from DB
        async def get_token():
            db = _mongo_db()
            return await db.verification_tokens.find_one({"email": email, "used": False})
        tok = asyncio.new_event_loop().run_until_complete(get_token())
        assert tok, "no verification token in DB"
        token = tok["token"]

        r = requests.get(f"{API}/auth/verify-email/{token}")
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True

        # Re-use same token -> 400
        r2 = requests.get(f"{API}/auth/verify-email/{token}")
        assert r2.status_code == 400

        # /auth/me now shows verified
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        me_body = me.json()
        assert me_body["email_verified"] is True
        # Shape checks
        for k in ("email_verified", "google_linked", "picture", "is_premium", "assessment_credits"):
            assert k in me_body, f"missing {k} in /auth/me"

        # Now can create child
        r3 = s.post(f"{API}/children", json={"name": "Kiddo", "age": 8})
        assert r3.status_code == 200, r3.text

    def test_verify_nonexistent_token(self):
        r = requests.get(f"{API}/auth/verify-email/nonexistent-fake-token-xxx")
        assert r.status_code == 400


# ============ RESEND RATE LIMIT ============
class TestResendVerification:
    def test_resend_rate_limit(self):
        # Register a new user (unverified)
        s = requests.Session()
        email = f"TEST_resend_{EPOCH}_{uuid.uuid4().hex[:6]}@example.com".lower()
        r = s.post(f"{API}/auth/register", json={"email": email, "name": "R", "password": "Passw0rd!123"})
        assert r.status_code == 200
        # First resend — likely 429 because register already inserted a token < 60s ago
        r1 = s.post(f"{API}/auth/send-verification", json={"email": email})
        # accept 200 or 429 depending on cooldown check
        assert r1.status_code in (200, 429)
        # Second immediate call should be 429
        r2 = s.post(f"{API}/auth/send-verification", json={"email": email})
        assert r2.status_code == 429, f"expected 429, got {r2.status_code} {r2.text}"


# ============ FORGOT / RESET ============
class TestForgotReset:
    def test_forgot_with_real_email_returns_ok(self, parent_session):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "parent@test.com"})
        assert r.status_code == 200
        assert r.json()["ok"] is True
        time.sleep(1)
        async def check():
            db = _mongo_db()
            return await db.password_reset_tokens.find_one({"email": "parent@test.com"}, sort=[("created_at", -1)])
        tok = asyncio.new_event_loop().run_until_complete(check())
        assert tok is not None
        # Expiry should be ~1hr
        from datetime import timezone
        delta = (tok["expires_at"].replace(tzinfo=timezone.utc) - tok["created_at"].replace(tzinfo=timezone.utc)).total_seconds()
        assert 3500 < delta < 3700, f"expiry not ~1hr: {delta}s"

    def test_forgot_with_nonexistent_email_still_ok(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": f"nobody_{EPOCH}@example.com"})
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_reset_short_password_fails(self):
        r = requests.post(f"{API}/auth/reset-password", json={"token": "whatever", "password": "abc"})
        assert r.status_code == 400

    def test_reset_invalid_token_fails(self):
        r = requests.post(f"{API}/auth/reset-password", json={"token": "invalid-fake-token", "password": "Passw0rd!!"})
        assert r.status_code == 400

    def test_reset_with_valid_token_invalidates_others(self):
        # Create a fresh user so we don't clobber parent@test.com
        s = requests.Session()
        email = f"TEST_reset_{EPOCH}_{uuid.uuid4().hex[:6]}@example.com".lower()
        pw = "Passw0rd!123"
        r = s.post(f"{API}/auth/register", json={"email": email, "name": "R", "password": pw})
        assert r.status_code == 200

        # Issue two reset tokens by directly calling forgot-password w/ cooldown bypass via DB insert
        async def issue_two():
            db = _mongo_db()
            # first, real forgot-password
            pass
        # First real forgot-password
        r1 = requests.post(f"{API}/auth/forgot-password", json={"email": email})
        assert r1.status_code == 200
        time.sleep(1)
        # Fetch token1
        async def fetch_tokens():
            db = _mongo_db()
            cur = db.password_reset_tokens.find({"email": email}).sort("created_at", -1)
            return [t async for t in cur]
        toks = asyncio.new_event_loop().run_until_complete(fetch_tokens())
        assert len(toks) >= 1
        token1 = toks[0]["token"]

        # Insert a second, older-but-unused reset token directly in DB (simulating 2nd request past cooldown)
        from datetime import datetime, timezone, timedelta
        second_token = "TESTsecond_" + uuid.uuid4().hex
        async def insert_second():
            db = _mongo_db()
            await db.password_reset_tokens.insert_one({
                "user_id": "fake", "email": email, "token": second_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
                "used": False, "created_at": datetime.now(timezone.utc),
            })
        asyncio.new_event_loop().run_until_complete(insert_second())

        # Use token1 to reset password
        new_pw = "NewPassw0rd!!"
        r2 = requests.post(f"{API}/auth/reset-password", json={"token": token1, "password": new_pw})
        assert r2.status_code == 200, r2.text

        # second_token should now be invalidated
        async def check_second():
            db = _mongo_db()
            return await db.password_reset_tokens.find_one({"token": second_token})
        second = asyncio.new_event_loop().run_until_complete(check_second())
        assert second is not None
        assert second.get("used") is True, "outstanding token was not invalidated"

        # Login with new password
        s2 = requests.Session()
        r3 = s2.post(f"{API}/auth/login", json={"email": email, "password": new_pw})
        assert r3.status_code == 200, r3.text


# ============ LOGOUT ============
class TestLogout:
    def test_logout_clears_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": "parent@test.com", "password": "Parent@12345"})
        assert r.status_code == 200
        assert "access_token" in s.cookies
        r2 = s.post(f"{API}/auth/logout")
        assert r2.status_code == 200
        # After logout, /auth/me should 401
        r3 = s.get(f"{API}/auth/me")
        assert r3.status_code == 401


# ============ REGRESSION — existing parent ============
class TestRegression:
    def test_parent_login_and_me(self, parent_session):
        r = parent_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        b = r.json()
        assert b["email"] == "parent@test.com"
        assert b["email_verified"] is True
        assert "assessment_credits" in b

    def test_parent_can_list_children(self, parent_session):
        r = parent_session.get(f"{API}/children")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
