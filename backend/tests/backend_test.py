"""Backend tests for Kids IQ Test app.

Covers: auth (register/login/me/logout), children CRUD, assessment questions,
assessment submission (skill scoring + AI report), dashboard stats, protected
routes, age_group derivation.
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://brain-skills-kids.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

TEST_PARENT_EMAIL = "parent@test.com"
TEST_PARENT_PASSWORD = "Parent@12345"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def parent_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": TEST_PARENT_EMAIL, "password": TEST_PARENT_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"seeded parent login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def new_user_session():
    """Register a brand new user for isolated tests."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"test_{uuid.uuid4().hex[:10]}@example.com"
    r = s.post(f"{API}/auth/register", json={"name": "Test User", "email": email, "password": "TestPass@123"}, timeout=15)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    s.email = email  # type: ignore[attr-defined]
    return s


# ---------- Health ----------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_login_seeded_parent(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": TEST_PARENT_EMAIL, "password": TEST_PARENT_PASSWORD}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == TEST_PARENT_EMAIL
        assert data["role"] == "parent"
        assert "id" in data
        # cookies should be set
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": TEST_PARENT_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_register_and_duplicate(self):
        s = requests.Session()
        email = f"test_dup_{uuid.uuid4().hex[:8]}@example.com"
        r1 = s.post(f"{API}/auth/register", json={"name": "Dup", "email": email, "password": "Pass@1234"}, timeout=15)
        assert r1.status_code == 200
        data = r1.json()
        assert data["email"] == email
        assert data["xp"] == 0
        assert data["coins"] == 50
        # Duplicate
        r2 = requests.post(f"{API}/auth/register", json={"name": "Dup", "email": email, "password": "Pass@1234"}, timeout=10)
        assert r2.status_code == 400

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_me_returns_user(self, parent_session):
        r = parent_session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == TEST_PARENT_EMAIL
        assert "password_hash" not in u

    def test_logout_clears_cookies(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": TEST_PARENT_EMAIL, "password": TEST_PARENT_PASSWORD}, timeout=15)
        assert "access_token" in s.cookies
        r = s.post(f"{API}/auth/logout", timeout=10)
        assert r.status_code == 200
        # After logout, /auth/me should be unauthenticated
        r2 = s.get(f"{API}/auth/me", timeout=10)
        assert r2.status_code == 401


# ---------- Children ----------
class TestChildren:
    def test_create_child_and_age_group_5(self, new_user_session):
        r = new_user_session.post(f"{API}/children", json={"name": "TEST_Kid5", "age": 5}, timeout=15)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["age_group"] == "3-5"
        assert c["name"] == "TEST_Kid5"
        assert c["xp"] == 0
        new_user_session.child_id_5 = c["id"]  # type: ignore

    def test_create_child_age_groups(self, new_user_session):
        for age, group in [(7, "6-8"), (11, "9-12"), (15, "13-16")]:
            r = new_user_session.post(f"{API}/children", json={"name": f"TEST_Kid{age}", "age": age}, timeout=15)
            assert r.status_code == 200
            assert r.json()["age_group"] == group, f"age {age} => expected {group}"

    def test_list_children(self, new_user_session):
        r = new_user_session.get(f"{API}/children", timeout=10)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        assert len(arr) >= 4

    def test_get_child_persisted(self, new_user_session):
        cid = new_user_session.child_id_5  # type: ignore
        r = new_user_session.get(f"{API}/children/{cid}", timeout=10)
        assert r.status_code == 200
        assert r.json()["id"] == cid
        assert r.json()["age_group"] == "3-5"

    def test_children_require_auth(self):
        r = requests.get(f"{API}/children", timeout=10)
        assert r.status_code == 401


# ---------- Questions ----------
class TestQuestions:
    @pytest.mark.parametrize("group,count", [("3-5", 8), ("6-8", 9), ("9-12", 10), ("13-16", 10)])
    def test_questions_by_group(self, parent_session, group, count):
        r = parent_session.get(f"{API}/assessment/questions/{group}", timeout=10)
        assert r.status_code == 200
        qs = r.json()
        assert isinstance(qs, list)
        assert len(qs) == count
        # No answer field leaked
        for q in qs:
            assert "answer" not in q
            assert set(["id", "skill", "prompt", "options"]).issubset(q.keys())

    def test_questions_bad_group(self, parent_session):
        r = parent_session.get(f"{API}/assessment/questions/99-100", timeout=10)
        assert r.status_code == 404


# ---------- Assessment ----------
class TestAssessment:
    def test_submit_full_flow(self, new_user_session):
        # Create a child
        cr = new_user_session.post(f"{API}/children", json={"name": "TEST_Assess", "age": 10}, timeout=15)
        assert cr.status_code == 200
        child = cr.json()
        cid = child["id"]
        assert child["age_group"] == "9-12"

        # Fetch questions
        qr = new_user_session.get(f"{API}/assessment/questions/9-12", timeout=10)
        assert qr.status_code == 200
        qs = qr.json()
        assert len(qs) == 10

        # Submit all correct answers using known key (from questions_data)
        # answers list mirrors question order; we'll answer all 0 (won't be all correct) and just validate structure
        # Use varied answers - alternate 0/1 to get partial correct
        answers = [i % 4 for i in range(len(qs))]
        sub = new_user_session.post(
            f"{API}/assessment/submit",
            json={"child_id": cid, "age_group": "9-12", "answers": answers, "duration_seconds": 120},
            timeout=90,  # AI report may take time
        )
        assert sub.status_code == 200, sub.text
        a = sub.json()
        # Structural assertions
        assert "id" in a
        assert a["total_questions"] == 10
        assert 0 <= a["total_correct"] <= 10
        assert 0 <= a["percentage"] <= 100
        assert 80 <= a["estimated_score"] <= 120
        assert a["xp_earned"] == a["total_correct"] * 10
        assert a["stars_earned"] in (1, 2, 3)
        assert isinstance(a["skill_scores"], dict)
        # skill_scores structure
        for skill, sc in a["skill_scores"].items():
            assert "correct" in sc and "total" in sc
        # AI report content check (fallback also has these headings)
        assert isinstance(a["ai_report"], str)
        assert len(a["ai_report"]) > 20
        assert "## Summary" in a["ai_report"]

        # Persist assessment_id for follow-up test
        new_user_session.assessment_id = a["id"]  # type: ignore
        new_user_session.assess_child_id = cid  # type: ignore

    def test_get_assessment(self, new_user_session):
        aid = new_user_session.assessment_id  # type: ignore
        r = new_user_session.get(f"{API}/assessments/{aid}", timeout=10)
        assert r.status_code == 200
        assert r.json()["id"] == aid

    def test_list_child_assessments(self, new_user_session):
        cid = new_user_session.assess_child_id  # type: ignore
        r = new_user_session.get(f"{API}/assessments/child/{cid}", timeout=10)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        assert len(arr) >= 1

    def test_submit_answer_count_mismatch(self, new_user_session):
        cid = new_user_session.assess_child_id  # type: ignore
        r = new_user_session.post(
            f"{API}/assessment/submit",
            json={"child_id": cid, "age_group": "9-12", "answers": [0, 1]},
            timeout=15,
        )
        assert r.status_code == 400

    def test_submit_perfect_score(self, new_user_session):
        """Verify scoring uses correct answer keys - submit all correct answers."""
        # Correct answers for 3-5 age group per questions_data.py
        correct_3_5 = [0, 1, 2, 2, 3, 1, 2, 2]
        # Create child
        cr = new_user_session.post(f"{API}/children", json={"name": "TEST_Perfect", "age": 4}, timeout=15)
        cid = cr.json()["id"]
        r = new_user_session.post(
            f"{API}/assessment/submit",
            json={"child_id": cid, "age_group": "3-5", "answers": correct_3_5},
            timeout=90,
        )
        assert r.status_code == 200
        a = r.json()
        assert a["total_correct"] == 8
        assert a["percentage"] == 100
        assert a["estimated_score"] == 120
        assert a["stars_earned"] == 3


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_stats(self, new_user_session):
        # Ensure at least one child + one assessment exists for this worker's session
        cr = new_user_session.post(f"{API}/children", json={"name": "TEST_Dash", "age": 5}, timeout=15)
        assert cr.status_code == 200
        cid = cr.json()["id"]
        correct_3_5 = [0, 1, 2, 2, 3, 1, 2, 2]
        sr = new_user_session.post(
            f"{API}/assessment/submit",
            json={"child_id": cid, "age_group": "3-5", "answers": correct_3_5},
            timeout=90,
        )
        assert sr.status_code == 200

        r = new_user_session.get(f"{API}/dashboard/stats", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "total_children" in d
        assert "total_assessments" in d
        assert "recent_assessments" in d
        assert "xp" in d and "coins" in d
        assert d["total_children"] >= 1
        assert d["total_assessments"] >= 1
        assert isinstance(d["recent_assessments"], list)

    def test_dashboard_requires_auth(self):
        r = requests.get(f"{API}/dashboard/stats", timeout=10)
        assert r.status_code == 401


# ---------- Delete child cascades ----------
class TestDeleteChild:
    def test_delete_child_removes_assessments(self, new_user_session):
        # Create a child, submit assessment, then delete
        cr = new_user_session.post(f"{API}/children", json={"name": "TEST_ToDelete", "age": 6}, timeout=15)
        cid = cr.json()["id"]
        # Submit a quick assessment
        qr = new_user_session.get(f"{API}/assessment/questions/6-8", timeout=10)
        answers = [0] * len(qr.json())
        new_user_session.post(
            f"{API}/assessment/submit",
            json={"child_id": cid, "age_group": "6-8", "answers": answers},
            timeout=90,
        )
        # Delete
        dr = new_user_session.delete(f"{API}/children/{cid}", timeout=10)
        assert dr.status_code == 200
        # child gone
        gr = new_user_session.get(f"{API}/children/{cid}", timeout=10)
        assert gr.status_code == 404
        # associated assessments gone
        lr = new_user_session.get(f"{API}/assessments/child/{cid}", timeout=10)
        assert lr.status_code == 200
        assert lr.json() == []
