"""Backend tests for Iteration 7: Child Dashboard + Report improvements.

Covers:
  - GET /api/sessions/in-progress/{child_id} (idle + active)
  - GET /api/assessments/{id}/pdf gating (403 free vs 200 premium/credits)
  - PDF body includes new sections (Strengths & Areas, Personalized Tips,
    Daily Practice Suggestions, Weekly Goals, Parent Guidance)
"""
import os
import time
import uuid
import pytest
import requests


def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if not v:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    v = line.split("=", 1)[1].strip()
                    break
    return v.rstrip("/")

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

PREM_EMAIL = "parent@test.com"
PREM_PASSWORD = "Parent@12345"


# ---------------- Premium session (has 3 assessment_credits) ----------------
@pytest.fixture(scope="module")
def premium_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": PREM_EMAIL, "password": PREM_PASSWORD})
    assert r.status_code == 200, f"Premium login failed: {r.text}"
    me = s.get(f"{API}/auth/me").json()
    # Sanity: this user should have >0 credits OR active subscription
    assert (me.get("assessment_credits", 0) > 0) or me.get("is_premium"), \
        f"Expected premium path for parent@test.com but got {me}"
    return s


@pytest.fixture(scope="module")
def premium_child(premium_session):
    r = premium_session.post(f"{API}/children", json={
        "name": "TEST_DashKid", "age": 10, "gender": "other", "language": "English"
    })
    assert r.status_code in (200, 201), r.text
    cid = r.json()["id"]
    yield cid
    premium_session.delete(f"{API}/children/{cid}")


# ---------------- Free-tier session (fresh user, 0 credits, no sub) ----------------
@pytest.fixture(scope="module")
def free_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"TEST_free_{uuid.uuid4().hex[:8]}@test.com"
    pwd = "Free@12345"
    r = s.post(f"{API}/auth/register", json={"name": "Free Tester", "email": email, "password": pwd})
    assert r.status_code in (200, 201), f"Register failed: {r.text}"
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pwd})
    assert r.status_code == 200, f"Free login failed: {r.text}"
    me = s.get(f"{API}/auth/me").json()
    assert me.get("assessment_credits", 0) == 0 and not me.get("is_premium"), \
        f"Fresh user should be free-tier: {me}"
    return s


@pytest.fixture(scope="module")
def free_child(free_session):
    r = free_session.post(f"{API}/children", json={
        "name": "TEST_FreeKid", "age": 10, "gender": "other", "language": "English"
    })
    assert r.status_code in (200, 201), r.text
    cid = r.json()["id"]
    yield cid
    free_session.delete(f"{API}/children/{cid}")


def _complete_assessment(sess, child_id):
    """Start + submit a session with all wrong answers to get a completed assessment id."""
    start = sess.post(f"{API}/sessions/start", json={"child_id": child_id}).json()
    sid = start["session_id"]
    n = start["total_questions"]
    r = sess.post(f"{API}/sessions/submit", json={
        "session_id": sid,
        "answers": [99] * n,
        "durations": [15] * n,
    })
    assert r.status_code == 200, r.text
    body = r.json()
    # server usually returns assessment_id or id; fall back to querying list
    aid = body.get("assessment_id") or body.get("id")
    if not aid:
        lst = sess.get(f"{API}/assessments/child/{child_id}").json()
        aid = lst[0].get("id")
    assert aid, f"No assessment id: {body}"
    return aid


# =============== In-Progress Session Endpoint ===============
class TestInProgressSession:
    def test_no_active_session(self, premium_session, premium_child):
        r = premium_session.get(f"{API}/sessions/in-progress/{premium_child}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data == {"in_progress": False} or data.get("in_progress") is False

    def test_active_session_reported(self, premium_session, premium_child):
        start = premium_session.post(f"{API}/sessions/start", json={"child_id": premium_child}).json()
        sid = start["session_id"]
        try:
            r = premium_session.get(f"{API}/sessions/in-progress/{premium_child}")
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["in_progress"] is True
            assert data["session_id"] == sid
            assert "age_group" in data and data["age_group"]
            assert "started_at" in data and data["started_at"]
            assert data["total_questions"] == 20
        finally:
            # Complete the session to keep state clean
            premium_session.post(f"{API}/sessions/submit", json={
                "session_id": sid, "answers": [99]*20, "durations": [10]*20
            })

    def test_after_submit_no_longer_in_progress(self, premium_session, premium_child):
        r = premium_session.get(f"{API}/sessions/in-progress/{premium_child}")
        assert r.status_code == 200
        assert r.json().get("in_progress") is False


# =============== PDF Gating + Content ===============
class TestPdfGating:
    def test_free_user_gets_403(self, free_session, free_child):
        aid = _complete_assessment(free_session, free_child)
        r = free_session.get(f"{API}/assessments/{aid}/pdf")
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text[:200]}"

    def test_premium_user_gets_pdf(self, premium_session, premium_child):
        aid = _complete_assessment(premium_session, premium_child)
        r = premium_session.get(f"{API}/assessments/{aid}/pdf")
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content.startswith(b"%PDF"), "PDF body must start with %PDF"
        assert len(r.content) > 1000

    def test_pdf_contains_new_sections(self, premium_session, premium_child):
        import io
        from pypdf import PdfReader
        aid = _complete_assessment(premium_session, premium_child)
        r = premium_session.get(f"{API}/assessments/{aid}/pdf")
        assert r.status_code == 200
        reader = PdfReader(io.BytesIO(r.content))
        text = "\n".join((p.extract_text() or "") for p in reader.pages)
        expected = [
            "Personalized Tips",
            "Daily Practice Suggestions",
            "Weekly Goals",
            "Parent Guidance",
        ]
        missing = [k for k in expected if k not in text]
        assert not missing, f"PDF is missing sections: {missing}\n--- text[:800]={text[:800]}"
        has_strengths_or_growth = ("Strengths" in text) or ("Areas for Improvement" in text)
        assert has_strengths_or_growth, f"PDF missing Strengths/Areas section. text[:800]={text[:800]}"
