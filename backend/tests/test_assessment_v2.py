"""Backend tests for the Assessment & Question Bank v2 feature.

Covers:
  - GET /api/assessment/bank-stats
  - POST /api/sessions/start (adaptive_meta, 20 questions, repetition minimization)
  - POST /api/sessions/submit (score profile, XP, badges, certificate)
  - Adaptive difficulty skewing after low-score attempts
  - GET /api/progress/{child_id} (new aggregate fields)
  - GET /api/assessments/child/{child_id}
  - GET /api/assessments/{id}/pdf (regression)
"""
import os
import random
import pytest
import requests

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if not v:
        # Fallback: read frontend/.env
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        v = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    if not v:
        raise RuntimeError("REACT_APP_BACKEND_URL not configured")
    return v.rstrip("/")

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

PARENT_EMAIL = "parent@test.com"
PARENT_PASSWORD = "Parent@12345"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    # Try login; if fails, register.
    r = s.post(f"{API}/auth/login", json={"email": PARENT_EMAIL, "password": PARENT_PASSWORD})
    if r.status_code != 200:
        s.post(f"{API}/auth/register", json={"name": "Parent Test", "email": PARENT_EMAIL, "password": PARENT_PASSWORD})
        r = s.post(f"{API}/auth/login", json={"email": PARENT_EMAIL, "password": PARENT_PASSWORD})
        assert r.status_code == 200, f"Login failed: {r.text}"
    return s


@pytest.fixture(scope="module")
def child_id(session):
    # Create a fresh test child (age 10 -> 9-12 age group)
    r = session.post(f"{API}/children", json={
        "name": "TEST_AssessKid",
        "age": 10,
        "gender": "other",
        "language": "English",
    })
    assert r.status_code in (200, 201), r.text
    cid = r.json()["id"]
    yield cid
    # Cleanup
    session.delete(f"{API}/children/{cid}")


# ---------------- Bank stats ----------------
class TestBankStats:
    def test_bank_stats_shape(self, session):
        r = session.get(f"{API}/assessment/bank-stats")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["total_questions"] >= 300, f"total_questions={data['total_questions']}"
        # session length must be 20 for all age groups
        for ag in ["3-5", "6-8", "9-12", "13-16"]:
            assert data["session_length"][ag] == 20
            ag_stats = data["age_groups"][ag]
            assert 75 <= ag_stats["total"] <= 100, f"{ag} count={ag_stats['total']}"
            # 9 primary categories present
            required = ["memory","logical_reasoning","pattern_recognition","visual_intelligence",
                        "attention","processing_speed","problem_solving","mathematical_thinking","language_skills"]
            for cat in required:
                assert cat in ag_stats["by_category"], f"{ag} missing category {cat}"
                assert ag_stats["by_category"][cat] >= 1
            # Balanced Easy/Medium/Hard — each roughly a third (~27-29 for ~82 qs). Allow 20-40 range.
            for tier in ["Easy", "Medium", "Hard"]:
                assert tier in ag_stats["by_difficulty"], f"{ag} missing tier {tier}"
                c = ag_stats["by_difficulty"][tier]
                assert 20 <= c <= 40, f"{ag} {tier}={c}"


# ---------------- Sessions start ----------------
class TestSessionStart:
    def test_start_returns_20_questions_and_adaptive_meta(self, session, child_id):
        r = session.post(f"{API}/sessions/start", json={"child_id": child_id})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["total_questions"] == 20
        assert len(data["questions"]) == 20
        meta = data["adaptive_meta"]
        assert "avg_prior_score" in meta
        assert "prior_attempts" in meta
        assert "seen_questions" in meta
        mix = meta["difficulty_mix"]
        assert mix["Easy"] + mix["Medium"] + mix["Hard"] == 20
        # First run: no priors
        # (This may be non-zero if fixture-child has prior data — we don't assert that strictly)

    def test_consecutive_sessions_minimize_overlap(self, session, child_id):
        r1 = session.post(f"{API}/sessions/start", json={"child_id": child_id}).json()
        r2 = session.post(f"{API}/sessions/start", json={"child_id": child_id}).json()
        ids1 = {q["id"] for q in r1["questions"]}
        ids2 = {q["id"] for q in r2["questions"]}
        overlap = len(ids1 & ids2)
        # Note: seen_ids only updated after SUBMIT, so both start-only calls draw from same pool.
        # But engine uses randomness -> overlap should still be < 20 (not identical).
        # Loose bound: fewer than 20 identical.
        assert overlap < 20, f"Consecutive starts identical (overlap={overlap})"


# ---------------- Submit + adaptive skew after low score ----------------
class TestSubmitAndAdaptive:
    def _submit_low_score(self, session, child_id):
        start = session.post(f"{API}/sessions/start", json={"child_id": child_id}).json()
        sid = start["session_id"]
        n = start["total_questions"]
        # All wrong answers -> answer 99 will not match anything
        answers = [99] * n
        durations = [20] * n
        r = session.post(f"{API}/sessions/submit", json={"session_id": sid, "answers": answers, "durations": durations})
        assert r.status_code == 200, r.text
        return r.json()

    def test_submit_returns_full_profile(self, session, child_id):
        result = self._submit_low_score(session, child_id)
        for key in ["overall_score", "accuracy", "category_scores", "strengths", "growth_areas",
                    "xp_earned", "stars_earned", "ai_report"]:
            assert key in result, f"missing {key}"
        # Should be near-zero score since all wrong
        assert result["accuracy"] <= 20

    def test_low_score_skews_next_session_easy(self, session, child_id):
        # Do one more low-score submit to boost prior signal
        self._submit_low_score(session, child_id)
        # Next session should skew Easy
        r = session.post(f"{API}/sessions/start", json={"child_id": child_id}).json()
        mix = r["adaptive_meta"]["difficulty_mix"]
        assert mix["Easy"] > mix["Hard"], f"Expected Easy>Hard but got {mix}"
        assert r["adaptive_meta"]["prior_attempts"] >= 1
        assert r["adaptive_meta"]["avg_prior_score"] is not None
        assert r["adaptive_meta"]["seen_questions"] > 0


# ---------------- Progress & Assessments listing ----------------
class TestProgressAndList:
    def test_progress_new_fields(self, session, child_id):
        r = session.get(f"{API}/progress/{child_id}")
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ["total_attempts", "avg_overall_score", "best_overall_score",
                    "strengths", "growth_areas", "timeline", "category_progress"]:
            assert key in data, f"progress missing {key}"
        assert data["total_attempts"] >= 1

    def test_assessments_child_list(self, session, child_id):
        r = session.get(f"{API}/assessments/child/{child_id}")
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_assessment_pdf_regression(self, session, child_id):
        lst = session.get(f"{API}/assessments/child/{child_id}").json()
        aid = lst[0].get("id") or lst[0].get("_id")
        assert aid, f"No assessment id in {lst[0]}"
        r = session.get(f"{API}/assessments/{aid}/pdf")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert len(r.content) > 500
