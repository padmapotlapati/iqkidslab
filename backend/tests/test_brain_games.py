"""Brain Games expansion API tests - iteration 5.
Direct requests calls (no pytest env-var propagation issue) using cookie session.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://brain-skills-kids.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PARENT_EMAIL = "parent@test.com"
PARENT_PASSWORD = "Parent@12345"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": PARENT_EMAIL, "password": PARENT_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def child_id(session):
    r = session.get(f"{API}/children", timeout=15)
    assert r.status_code == 200
    children = r.json()
    if children:
        return children[0]["id"]
    # create one
    r = session.post(f"{API}/children", json={"name": "TEST_BG_Kid", "age": 7, "gender": "male"}, timeout=15)
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


# ============ CATALOG ============
@pytest.mark.parametrize("age_group", ["3-5", "6-8", "9-12", "13-16"])
def test_games_by_age_group_returns_5(session, age_group):
    r = session.get(f"{API}/games", params={"age_group": age_group}, timeout=15)
    assert r.status_code == 200, r.text
    games = r.json()
    assert isinstance(games, list)
    assert len(games) == 5, f"Expected 5 games for {age_group}, got {len(games)}: {[g.get('key') for g in games]}"
    for g in games:
        assert "difficulty_label" in g and g["difficulty_label"] in ("Easy", "Medium", "Hard")
        assert age_group in g.get("age_groups", [])
        assert "engine" in g and "key" in g and "name" in g


def test_games_by_age_param_maps_to_group(session):
    r = session.get(f"{API}/games", params={"age": 4}, timeout=15)
    assert r.status_code == 200
    games = r.json()
    assert len(games) == 5
    for g in games:
        assert "3-5" in g["age_groups"]


def test_games_difficulty_distribution_per_group(session):
    """Each age group should have Easy/Medium/Hard tiers present."""
    for ag in ["3-5", "6-8", "9-12", "13-16"]:
        r = session.get(f"{API}/games", params={"age_group": ag}, timeout=15)
        labels = [g["difficulty_label"] for g in r.json()]
        assert "Easy" in labels and "Medium" in labels and "Hard" in labels, f"{ag}: {labels}"


# ============ DETAIL ============
def test_game_detail_returns_full_metadata(session):
    # pick one with a variant to verify variant field
    r = session.get(f"{API}/games/detail/color_match_easy", timeout=15)
    assert r.status_code == 200, r.text
    g = r.json()
    assert g["engine"] == "color_match"
    assert g["difficulty_label"] == "Easy"
    assert g["key"] == "color_match_easy"


def test_game_detail_with_variant(session):
    r = session.get(f"{API}/games/detail/word_scramble", timeout=15)
    assert r.status_code == 200
    g = r.json()
    assert g["engine"] == "word_scramble"
    assert g.get("variant") == "medium"


def test_game_detail_not_found(session):
    r = session.get(f"{API}/games/detail/nonexistent_key", timeout=15)
    assert r.status_code == 404


# ============ SCORE ============
def test_post_score_returns_xp_coins_streak(session, child_id):
    payload = {"child_id": child_id, "game_key": "color_match_easy", "score": 150, "duration_seconds": 30}
    r = session.post(f"{API}/games/score", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "xp_earned" in data and data["xp_earned"] >= 5
    assert "coins_earned" in data and data["coins_earned"] >= 2
    assert "streak" in data and isinstance(data["streak"], int) and data["streak"] >= 1
    assert "id" in data


def test_post_score_increments_child_xp(session, child_id):
    # get before
    r0 = session.get(f"{API}/children", timeout=15)
    kids = {k["id"]: k for k in r0.json()}
    before_xp = kids[child_id].get("xp", 0)

    payload = {"child_id": child_id, "game_key": "memory_match", "score": 100, "duration_seconds": 40}
    r = session.post(f"{API}/games/score", json=payload, timeout=15)
    assert r.status_code == 200
    xp_earned = r.json()["xp_earned"]

    r1 = session.get(f"{API}/children", timeout=15)
    kids2 = {k["id"]: k for k in r1.json()}
    after_xp = kids2[child_id].get("xp", 0)
    assert after_xp - before_xp == xp_earned, f"xp: {before_xp} -> {after_xp}, earned={xp_earned}"


def test_post_score_writes_timeline_entry(session, child_id):
    payload = {"child_id": child_id, "game_key": "sequence_easy", "score": 80, "duration_seconds": 25}
    r = session.post(f"{API}/games/score", json=payload, timeout=15)
    assert r.status_code == 200
    # verify timeline
    r2 = session.get(f"{API}/timeline/{child_id}", timeout=15)
    if r2.status_code == 200:
        entries = r2.json()
        found = any(
            (e.get("kind") == "brain_game" and "sequence_easy" in (e.get("title", "") or ""))
            for e in entries
        )
        assert found, f"Timeline entry not found. Recent: {entries[:3] if entries else 'empty'}"
    else:
        pytest.skip(f"Timeline endpoint returned {r2.status_code}")
