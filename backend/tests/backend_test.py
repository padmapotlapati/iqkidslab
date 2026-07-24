"""Backend tests for Kids IQ Test v2 - adaptive sessions, PDF, certificates,
games, notifications, progress, admin, and legacy compatibility.
"""
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://brain-skills-kids.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

TEST_PARENT_EMAIL = "parent@test.com"
TEST_PARENT_PASSWORD = "Parent@12345"
ADMIN_EMAIL = "admin@kidsiqtest.com"
ADMIN_PASSWORD = "Admin@12345"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def parent_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": TEST_PARENT_EMAIL, "password": TEST_PARENT_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"seeded parent login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def new_user_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"test_{uuid.uuid4().hex[:10]}@example.com"
    r = s.post(f"{API}/auth/register", json={"name": "Test User", "email": email, "password": "TestPass@123"}, timeout=15)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    s.email = email  # type: ignore[attr-defined]
    return s


@pytest.fixture(scope="session")
def child_ids(new_user_session):
    """Create one child per age group; return dict of age_group -> child_id."""
    ids = {}
    for name, age, group in [("TEST_A5", 4, "3-5"), ("TEST_A8", 7, "6-8"),
                              ("TEST_A12", 10, "9-12"), ("TEST_A16", 14, "13-16")]:
        r = new_user_session.post(f"{API}/children", json={"name": name, "age": age}, timeout=15)
        assert r.status_code == 200
        assert r.json()["age_group"] == group
        ids[group] = r.json()["id"]
    return ids


@pytest.fixture(scope="session")
def completed_assessment(new_user_session, child_ids):
    """Run a full session flow once with mostly-correct answers to trigger a certificate.
    Session-scoped and shared per xdist worker.
    """
    # Import backend question bank to compute correct answers
    import sys
    sys.path.insert(0, "/app/backend")
    from questions_data import QUESTIONS
    qmap = {q["id"]: q for q in QUESTIONS}

    cid = child_ids["9-12"]
    s = new_user_session.post(f"{API}/sessions/start", json={"child_id": cid}, timeout=30)
    assert s.status_code == 200, s.text
    sess = s.json()
    sid = sess["session_id"]
    # Use correct answers from bank
    answers = [qmap[q["id"]]["answer"] for q in sess["questions"]]
    durations = [8 for _ in sess["questions"]]
    r = new_user_session.post(f"{API}/sessions/submit",
                              json={"session_id": sid, "answers": answers, "durations": durations},
                              timeout=90)
    assert r.status_code == 200, r.text
    a = r.json()
    return {"session_id": sid, "child_id": cid, **a}


# ---------- Health ----------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        j = r.json()
        assert j.get("status") == "ok"
        assert j.get("version") == "2.0"


# ---------- Auth ----------
class TestAuth:
    def test_login_seeded_parent(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": TEST_PARENT_EMAIL, "password": TEST_PARENT_PASSWORD}, timeout=15)
        assert r.status_code == 200
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies

    def test_register_triggers_welcome_notification(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        email = f"test_welcome_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"name": "Welcome Test", "email": email, "password": "Pass@1234"}, timeout=15)
        assert r.status_code == 200
        # Check that welcome notification was created
        n = s.get(f"{API}/notifications", timeout=10)
        assert n.status_code == 200
        notifs = n.json()
        assert len(notifs) >= 1
        assert any(x.get("kind") == "welcome" for x in notifs), f"No welcome notif in {notifs}"


# ---------- Meta ----------
class TestMeta:
    def test_categories_returns_10(self, parent_session):
        r = parent_session.get(f"{API}/meta/categories", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "categories" in data and "labels" in data
        assert len(data["categories"]) == 10
        expected = {"logical_reasoning", "visual_intelligence", "pattern_recognition", "memory",
                    "attention", "processing_speed", "mathematical_thinking", "language_skills",
                    "creativity", "problem_solving"}
        assert set(data["categories"]) == expected
        for cat in data["categories"]:
            assert cat in data["labels"]

    def test_categories_requires_auth(self):
        r = requests.get(f"{API}/meta/categories", timeout=10)
        assert r.status_code == 401


# ---------- Legacy endpoint ----------
class TestLegacyEndpoint:
    @pytest.mark.parametrize("group", ["3-5", "6-8", "9-12", "13-16"])
    def test_legacy_questions_by_group(self, parent_session, group):
        r = parent_session.get(f"{API}/assessment/questions/{group}", timeout=10)
        assert r.status_code == 200
        qs = r.json()
        assert isinstance(qs, list)
        assert len(qs) > 0
        for q in qs:
            assert "answer" not in q
            assert {"id", "skill", "prompt", "options"}.issubset(q.keys())


# ---------- Sessions ----------
class TestSessions:
    # Expected session length per requirements: capped by bank availability
    # 3-5 has 18 in bank, target 10 -> 10
    # 6-8 has 19 in bank, target 12 -> 12
    # 9-12 has 21 in bank, target 15 -> 15
    # 13-16 has 21 in bank, target 15 -> 15
    @pytest.mark.parametrize("group,expected", [("3-5", 10), ("6-8", 12), ("9-12", 15), ("13-16", 15)])
    def test_start_session_produces_correct_count(self, new_user_session, child_ids, group, expected):
        r = new_user_session.post(f"{API}/sessions/start", json={"child_id": child_ids[group]}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_id" in data
        assert data["age_group"] == group
        assert isinstance(data["time_per_question"], int) and data["time_per_question"] > 0
        assert len(data["questions"]) == expected
        # Public view: no answer field
        for q in data["questions"]:
            assert "answer" not in q
            assert "explanation" not in q
            assert {"id", "category", "prompt", "options", "difficulty"}.issubset(q.keys())

    def test_start_session_invalid_child(self, new_user_session):
        r = new_user_session.post(f"{API}/sessions/start", json={"child_id": "not_a_real_id"}, timeout=10)
        assert r.status_code == 400

    def test_submit_session_full_flow(self, new_user_session, child_ids):
        cid = child_ids["9-12"]
        # Start
        s = new_user_session.post(f"{API}/sessions/start", json={"child_id": cid}, timeout=20)
        assert s.status_code == 200
        sess = s.json()
        sid = sess["session_id"]
        qcount = len(sess["questions"])
        # Submit random-ish answers (some correct)
        answers = [i % 4 for i in range(qcount)]
        durations = [10 for _ in range(qcount)]
        r = new_user_session.post(f"{API}/sessions/submit", json={"session_id": sid, "answers": answers, "durations": durations}, timeout=90)
        assert r.status_code == 200, r.text
        a = r.json()
        # Validate structure
        assert "id" in a
        assert "overall_score" in a and 0 <= a["overall_score"] <= 100
        assert 80 <= a["estimated_index"] <= 130
        assert 0 <= a["accuracy"] <= 100
        assert 0 <= a["speed_score"] <= 100
        assert 0 <= a["consistency"] <= 100
        assert 0 <= a["attention"] <= 100
        assert 1 <= a["percentile"] <= 99
        assert isinstance(a["category_scores"], dict) and len(a["category_scores"]) > 0
        for cat, s2 in a["category_scores"].items():
            assert {"correct", "total", "score", "percentile"}.issubset(s2.keys())
        assert isinstance(a["strengths"], list)
        assert isinstance(a["growth_areas"], list)
        assert a["xp_earned"] > 0 or a["xp_earned"] == 0  # earned points
        assert a["stars_earned"] in (1, 2, 3)
        assert isinstance(a["ai_report"], str) and len(a["ai_report"]) > 20
        assert "## Summary" in a["ai_report"]
        new_user_session.last_session_id = sid  # type: ignore
        new_user_session.last_assessment_id = a["id"]  # type: ignore
        new_user_session.last_overall = a["overall_score"]  # type: ignore

    def test_submit_session_twice_returns_400(self, new_user_session):
        sid = new_user_session.last_session_id  # type: ignore
        # Any answers - should be rejected as already completed
        r = new_user_session.post(f"{API}/sessions/submit", json={"session_id": sid, "answers": [0], "durations": [10]}, timeout=15)
        assert r.status_code == 400

    def test_submit_session_duration_mismatch_uses_estimated(self, new_user_session, child_ids):
        """When durations count != answers count, fallback to estimated_time (no 400)."""
        cid = child_ids["3-5"]
        s = new_user_session.post(f"{API}/sessions/start", json={"child_id": cid}, timeout=15)
        sess = s.json()
        sid = sess["session_id"]
        qcount = len(sess["questions"])
        answers = [0] * qcount
        # Wrong-sized durations - should not fail
        r = new_user_session.post(f"{API}/sessions/submit", json={"session_id": sid, "answers": answers, "durations": [5, 5]}, timeout=90)
        assert r.status_code == 200, r.text

    def test_submit_answer_count_mismatch(self, new_user_session, child_ids):
        cid = child_ids["6-8"]
        s = new_user_session.post(f"{API}/sessions/start", json={"child_id": cid}, timeout=15)
        sid = s.json()["session_id"]
        r = new_user_session.post(f"{API}/sessions/submit", json={"session_id": sid, "answers": [0, 1], "durations": [5, 5]}, timeout=15)
        assert r.status_code == 400


# ---------- Assessments + PDF ----------
class TestAssessments:
    def test_get_assessment(self, new_user_session, completed_assessment):
        aid = completed_assessment["id"]
        r = new_user_session.get(f"{API}/assessments/{aid}", timeout=10)
        assert r.status_code == 200
        assert r.json()["id"] == aid

    def test_assessment_pdf(self, new_user_session, completed_assessment):
        aid = completed_assessment["id"]
        r = new_user_session.get(f"{API}/assessments/{aid}/pdf", timeout=30)
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("content-type", "")
        assert r.content.startswith(b"%PDF-")


# ---------- Certificates ----------
class TestCertificates:
    def test_list_certificates(self, new_user_session, completed_assessment):
        r = new_user_session.get(f"{API}/certificates", timeout=10)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        overall = completed_assessment.get("overall_score", 0)
        if overall >= 50:
            assert len(arr) >= 1
            assert arr[0]["certificate_id"].startswith("KIQ-")

    def test_certificate_pdf(self, new_user_session, completed_assessment):
        if completed_assessment.get("overall_score", 0) < 50:
            pytest.skip("No certificate")
        arr = new_user_session.get(f"{API}/certificates", timeout=10).json()
        cid = arr[0]["certificate_id"]
        r = new_user_session.get(f"{API}/certificates/{cid}/pdf", timeout=30)
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("content-type", "")
        assert r.content.startswith(b"%PDF-")

    def test_certificate_verify_valid(self, new_user_session, completed_assessment):
        if completed_assessment.get("overall_score", 0) < 50:
            pytest.skip("No certificate")
        arr = new_user_session.get(f"{API}/certificates", timeout=10).json()
        cid = arr[0]["certificate_id"]
        r = requests.get(f"{API}/certificates/verify/{cid}", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert data["certificate"]["certificate_id"] == cid

    def test_certificate_verify_invalid(self):
        r = requests.get(f"{API}/certificates/verify/KIQ-DEADBEEF", timeout=10)
        assert r.status_code == 200
        assert r.json()["valid"] is False


# ---------- Games ----------
class TestGames:
    def test_list_games_returns_7(self, parent_session):
        r = parent_session.get(f"{API}/games", timeout=10)
        assert r.status_code == 200
        games = r.json()
        assert isinstance(games, list)
        assert len(games) == 7
        keys = {g["key"] for g in games}
        assert keys == {"memory_match", "reaction_tap", "pattern_hunt", "focus_find",
                        "math_dash", "word_link", "logic_flow"}
        for g in games:
            assert {"key", "name", "category", "color", "icon", "description"}.issubset(g.keys())

    def test_save_game_score_and_list(self, new_user_session, child_ids):
        cid = child_ids["6-8"]
        r = new_user_session.post(f"{API}/games/score",
                                  json={"child_id": cid, "game_key": "memory_match", "score": 85, "duration_seconds": 60},
                                  timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert data["xp_earned"] >= 5  # max(5, 85//5) = 17

        # Verify via list
        l = new_user_session.get(f"{API}/games/scores/{cid}", timeout=10)
        assert l.status_code == 200
        scores = l.json()
        assert isinstance(scores, list)
        assert any(s["game_key"] == "memory_match" and s["score"] == 85 for s in scores)


# ---------- Progress ----------
class TestProgress:
    def test_progress_endpoint(self, new_user_session, completed_assessment):
        cid = completed_assessment["child_id"]
        r = new_user_session.get(f"{API}/progress/{cid}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "child" in data and data["child"]["id"] == cid
        assert "timeline" in data and isinstance(data["timeline"], list)
        assert len(data["timeline"]) >= 1
        assert "category_progress" in data
        assert isinstance(data["category_progress"], list)
        if data["category_progress"]:
            cp = data["category_progress"][0]
            assert {"category", "label", "correct", "total", "percentage"}.issubset(cp.keys())


# ---------- Notifications ----------
class TestNotifications:
    def test_list_notifications(self, new_user_session, completed_assessment):
        r = new_user_session.get(f"{API}/notifications", timeout=10)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        assert len(arr) >= 1

    def test_mark_single_read(self, new_user_session, completed_assessment):
        arr = new_user_session.get(f"{API}/notifications", timeout=10).json()
        nid = arr[0]["id"]
        r = new_user_session.post(f"{API}/notifications/{nid}/read", timeout=10)
        assert r.status_code == 200
        arr2 = new_user_session.get(f"{API}/notifications", timeout=10).json()
        found = next((n for n in arr2 if n["id"] == nid), None)
        assert found is not None and found["read"] is True

    def test_mark_all_read(self, new_user_session, completed_assessment):
        r = new_user_session.post(f"{API}/notifications/read-all", timeout=10)
        assert r.status_code == 200
        arr = new_user_session.get(f"{API}/notifications", timeout=10).json()
        assert all(n["read"] is True for n in arr)


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_stats_includes_new_fields(self, new_user_session, completed_assessment, child_ids):
        r = new_user_session.get(f"{API}/dashboard/stats", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_children", "total_assessments", "total_certificates",
                  "unread_notifications", "recent_assessments", "xp", "coins"):
            assert k in d, f"missing key {k}"
        assert d["total_children"] >= 4
        assert d["total_assessments"] >= 1


# ---------- Admin ----------
class TestAdmin:
    def test_admin_list_questions(self, admin_session):
        r = admin_session.get(f"{API}/admin/questions", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "builtin_count" in data and data["builtin_count"] > 0
        assert isinstance(data["custom"], list)

    def test_parent_forbidden_admin(self, parent_session):
        r = parent_session.get(f"{API}/admin/questions", timeout=10)
        assert r.status_code == 403

    def test_admin_add_question(self, admin_session):
        payload = {
            "age_group": "6-8",
            "category": "logical_reasoning",
            "question_type": "multiple_choice",
            "difficulty": 2,
            "prompt": "TEST_ADMIN_Q: What is 1+1?",
            "options": ["1", "2", "3", "4"],
            "answer": 1,
            "explanation": "Basic addition",
            "estimated_time": 15,
            "points": 10,
        }
        r = admin_session.post(f"{API}/admin/questions", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["id"].startswith("custom-")
        # Verify listed
        l = admin_session.get(f"{API}/admin/questions", timeout=10)
        assert any(q.get("q_id") == j["id"] or q.get("id") == j["id"] for q in l.json()["custom"])
