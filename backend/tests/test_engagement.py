"""Backend tests for Engagement & Retention System (v4).
Streaks, daily challenge, daily rewards, missions, mystery box, avatars, level, timeline, AI suggestion, weekly summary.
"""
import os
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import asyncio

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

TEST_PARENT_EMAIL = "parent@test.com"
TEST_PARENT_PASSWORD = "Parent@12345"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


def _login():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": TEST_PARENT_EMAIL, "password": TEST_PARENT_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def parent():
    return _login()


@pytest.fixture(scope="module")
def child_id(parent):
    """Create a fresh test child for isolation."""
    name = f"TEST_ENG_{uuid.uuid4().hex[:6]}"
    r = parent.post(f"{API}/children", json={"name": name, "age": 10}, timeout=15)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    yield cid
    # cleanup: purge collections for this child
    async def _cleanup():
        cli = AsyncIOMotorClient(MONGO_URL)
        db = cli[DB_NAME]
        for col in ["streaks", "daily_claims", "daily_challenge_completions",
                    "mission_claims", "mystery_boxes", "timeline", "ai_daily_suggestions"]:
            await db[col].delete_many({"child_id": cid})
        await db.children.delete_one({"_id": ObjectId(cid)})
        cli.close()
    asyncio.get_event_loop().run_until_complete(_cleanup())


def _db():
    cli = AsyncIOMotorClient(MONGO_URL)
    return cli, cli[DB_NAME]


# ---------- Progress / Level ----------
class TestLevel:
    def test_level_default_xp_0(self, parent, child_id):
        r = parent.get(f"{API}/progress/level/{child_id}", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["level"] == 1
        assert d["title"] == "Curious Sprout"
        assert d["xp"] == 0
        assert d["current_level_xp"] == 0
        assert d["next_level_xp"] == 500
        assert d["progress"] == 0

    def test_level_invalid_id(self, parent):
        r = parent.get(f"{API}/progress/level/notarealid", timeout=10)
        assert r.status_code == 400


# ---------- Streak ----------
class TestStreak:
    def test_get_streak_empty(self, parent, child_id):
        r = parent.get(f"{API}/streak/{child_id}", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["current_streak"] == 0
        assert d["longest_streak"] == 0
        assert d["last_active_date"] is None

    def test_bump_streak_creates(self, parent, child_id):
        r = parent.post(f"{API}/streak/{child_id}/bump", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["current_streak"] == 1
        assert d["milestone"] is False

    def test_bump_idempotent_same_day(self, parent, child_id):
        r1 = parent.post(f"{API}/streak/{child_id}/bump", timeout=10).json()
        r2 = parent.post(f"{API}/streak/{child_id}/bump", timeout=10).json()
        assert r1["current_streak"] == r2["current_streak"] == 1

    def test_streak_reads_after_bump(self, parent, child_id):
        r = parent.get(f"{API}/streak/{child_id}", timeout=10)
        d = r.json()
        assert d["current_streak"] == 1
        assert d["days_this_week"] == 1
        assert isinstance(d["active_dates"], list)


# ---------- Daily Rewards ----------
class TestDailyRewards:
    def test_status_before_claim(self, parent, child_id):
        r = parent.get(f"{API}/rewards/daily-status/{child_id}", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["claimed_today"] is False
        assert d["ladder"] == [10, 15, 20, 25, 30, 40, 50]
        assert d["next_reward_xp"] in d["ladder"]
        assert isinstance(d["day_in_week"], int)

    def test_claim_daily(self, parent, child_id):
        r = parent.post(f"{API}/rewards/claim-daily", json={"child_id": child_id}, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["xp_awarded"] in [10, 15, 20, 25, 30, 40, 50]
        assert d["coins_awarded"] == 5
        assert d["streak"] >= 1

    def test_claim_daily_second_time_400(self, parent, child_id):
        r = parent.post(f"{API}/rewards/claim-daily", json={"child_id": child_id}, timeout=10)
        assert r.status_code == 400

    def test_status_after_claim(self, parent, child_id):
        r = parent.get(f"{API}/rewards/daily-status/{child_id}", timeout=10).json()
        assert r["claimed_today"] is True


# ---------- Daily Challenge ----------
class TestDailyChallenge:
    def test_get_challenge(self, parent, child_id):
        r = parent.get(f"{API}/daily-challenge/{child_id}", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["age_group"] == "9-12"
        assert d["completed"] is False
        assert len(d["questions"]) == 5
        for q in d["questions"]:
            assert "answer" not in q
            assert {"id", "category", "prompt", "options"}.issubset(q.keys())

    def test_challenge_deterministic(self, parent, child_id):
        a = parent.get(f"{API}/daily-challenge/{child_id}", timeout=10).json()
        b = parent.get(f"{API}/daily-challenge/{child_id}", timeout=10).json()
        assert [q["id"] for q in a["questions"]] == [q["id"] for q in b["questions"]]

    def test_submit_challenge(self, parent, child_id):
        answers = [0, 0, 0, 0, 0]
        r = parent.post(f"{API}/daily-challenge/submit",
                        json={"child_id": child_id, "answers": answers}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["total"] == 5
        assert 0 <= d["score"] <= 5
        assert d["xp"] >= 20
        assert d["coins"] >= 1
        assert d["streak"] >= 1

    def test_submit_twice_400(self, parent, child_id):
        r = parent.post(f"{API}/daily-challenge/submit",
                        json={"child_id": child_id, "answers": [0, 0, 0, 0, 0]}, timeout=10)
        assert r.status_code == 400

    def test_get_after_submit_shows_completed(self, parent, child_id):
        d = parent.get(f"{API}/daily-challenge/{child_id}", timeout=10).json()
        assert d["completed"] is True
        assert d["score"] is not None


# ---------- Missions ----------
class TestMissions:
    def test_missions_shape(self, parent, child_id):
        r = parent.get(f"{API}/missions/{child_id}", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert len(d["weekly"]) == 3
        assert len(d["monthly"]) == 2
        for m in d["weekly"] + d["monthly"]:
            assert {"key", "title", "target", "current", "xp", "completed", "claimed"}.issubset(m.keys())

    def test_claim_incomplete_mission_400(self, parent, child_id):
        r = parent.post(f"{API}/missions/{child_id}/claim?key=weekly_3_assessments", timeout=10)
        assert r.status_code == 400

    def test_claim_unknown_mission_404(self, parent, child_id):
        r = parent.post(f"{API}/missions/{child_id}/claim?key=nonexistent_key", timeout=10)
        assert r.status_code == 404


# ---------- Mystery Box ----------
class TestMysteryBox:
    def test_status_available(self, parent, child_id):
        r = parent.get(f"{API}/mystery-box/status/{child_id}", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["available"] is True

    def test_open_box(self, parent, child_id):
        r = parent.post(f"{API}/mystery-box/open", json={"child_id": child_id}, timeout=10)
        assert r.status_code == 200, r.text
        reward = r.json()["reward"]
        assert reward["kind"] in ["xp", "coins", "credit", "badge"]
        assert "label" in reward

    def test_open_again_400(self, parent, child_id):
        r = parent.post(f"{API}/mystery-box/open", json={"child_id": child_id}, timeout=10)
        assert r.status_code == 400

    def test_status_not_available_after(self, parent, child_id):
        d = parent.get(f"{API}/mystery-box/status/{child_id}", timeout=10).json()
        assert d["available"] is False
        assert d["next_available_in_hours"] > 0


# ---------- Avatars ----------
class TestAvatars:
    def test_list_avatars(self, parent, child_id):
        r = parent.get(f"{API}/avatars/{child_id}", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert len(d["avatars"]) == 12
        # Level 1 child - only sprout unlocked
        sprout = next(a for a in d["avatars"] if a["key"] == "sprout")
        assert sprout["unlocked"] is True
        crown = next(a for a in d["avatars"] if a["key"] == "crown")
        assert crown["unlocked"] is False

    def test_select_unlocked_avatar(self, parent, child_id):
        r = parent.post(f"{API}/avatars/{child_id}/select", json={"avatar_key": "sprout"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["avatar"] == "sprout"

    def test_select_locked_avatar_400(self, parent, child_id):
        r = parent.post(f"{API}/avatars/{child_id}/select", json={"avatar_key": "crown"}, timeout=10)
        assert r.status_code == 400


# ---------- Timeline ----------
class TestTimeline:
    def test_timeline_has_events(self, parent, child_id):
        r = parent.get(f"{API}/timeline/{child_id}?limit=50", timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 3  # claim + challenge + mystery box
        kinds = {i["kind"] for i in items}
        assert "daily_claim" in kinds
        assert "daily_challenge" in kinds
        assert "mystery_box" in kinds
        for i in items:
            assert "_id" not in i
            assert "id" in i


# ---------- AI Daily Suggestion ----------
class TestAISuggestion:
    def test_get_suggestion(self, parent, child_id):
        r = parent.get(f"{API}/ai/daily-suggestion/{child_id}", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "body" in d
        assert len(d["body"]) > 10
        assert "focus_area" in d
        assert "_id" not in d

    def test_suggestion_cached(self, parent, child_id):
        d1 = parent.get(f"{API}/ai/daily-suggestion/{child_id}", timeout=30).json()
        d2 = parent.get(f"{API}/ai/daily-suggestion/{child_id}", timeout=10).json()
        assert d1["body"] == d2["body"]


# ---------- Parent Weekly Summary ----------
class TestWeeklySummary:
    def test_weekly_summary(self, parent):
        r = parent.get(f"{API}/parent/weekly-summary", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "children" in d
        assert isinstance(d["children"], list)
        if d["children"]:
            c = d["children"][0]
            assert {"child_id", "name", "assessments_this_week", "games_this_week",
                    "current_streak", "level", "level_title", "xp", "badges"}.issubset(c.keys())


# ---------- 7-day Streak Milestone ----------
class TestStreakMilestone:
    def test_seven_day_milestone(self, parent, child_id):
        # Manually set streak to 6 days with yesterday active, then bump
        async def _seed():
            cli = AsyncIOMotorClient(MONGO_URL)
            db = cli[DB_NAME]
            # Find parent id
            login = await db.users.find_one({"email": TEST_PARENT_EMAIL})
            pid = str(login["_id"])
            yest = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
            active = [(datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(1, 7)]
            await db.streaks.update_one(
                {"child_id": child_id, "parent_id": pid},
                {"$set": {"current_streak": 6, "longest_streak": 6,
                          "last_active_date": yest, "active_dates": active}},
                upsert=True,
            )
            # Also clear today's claim/challenge/timeline milestone if any
            await db.notifications.delete_many({"user_id": pid, "kind": "streak_milestone"})
            await db.timeline.delete_many({"child_id": child_id, "kind": "streak_milestone"})
            cli.close()
            return pid

        pid = asyncio.get_event_loop().run_until_complete(_seed())
        r = parent.post(f"{API}/streak/{child_id}/bump", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["current_streak"] == 7
        assert d["milestone"] is True

        # verify notification + timeline
        async def _verify():
            cli = AsyncIOMotorClient(MONGO_URL)
            db = cli[DB_NAME]
            n = await db.notifications.find_one({"user_id": pid, "kind": "streak_milestone"})
            t = await db.timeline.find_one({"child_id": child_id, "kind": "streak_milestone"})
            cli.close()
            return n, t
        n, t = asyncio.get_event_loop().run_until_complete(_verify())
        assert n is not None, "streak_milestone notification not created"
        assert t is not None, "streak_milestone timeline entry not created"
        assert "7-day" in n["title"] or "7" in n["title"]
