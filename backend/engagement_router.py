"""Engagement & Retention module: streaks, daily challenges, rewards, missions, avatars, timeline, AI suggestions."""
import os
import uuid
import random
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId
from emergentintegrations.llm.chat import LlmChat, UserMessage

from questions_data import QUESTIONS, CATEGORIES, CATEGORY_LABELS


def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def yesterday_str():
    return (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")


def xp_to_level(xp: int) -> dict:
    """Convert XP to level. 500 XP per level, capped at 50."""
    level = min(50, xp // 500 + 1)
    current_level_xp = (level - 1) * 500
    next_level_xp = level * 500
    progress = (xp - current_level_xp) / 500 if level < 50 else 1.0
    titles = ["Curious Sprout", "Quick Learner", "Bright Spark", "Sharp Thinker", "Brain Explorer",
             "Puzzle Master", "Focus Champion", "Logic Ninja", "Memory Hero", "Genius Squad"]
    title = titles[min(9, (level - 1) // 5)]
    return {"level": level, "title": title, "xp": xp, "current_level_xp": current_level_xp,
            "next_level_xp": next_level_xp if level < 50 else xp, "progress": round(progress * 100)}


# Avatar catalog - unlocked by level
AVATARS = [
    {"key": "sprout", "name": "Sprout", "emoji": "🌱", "unlock_level": 1},
    {"key": "star", "name": "Star", "emoji": "⭐", "unlock_level": 2},
    {"key": "rocket", "name": "Rocket", "emoji": "🚀", "unlock_level": 3},
    {"key": "brain", "name": "Brain", "emoji": "🧠", "unlock_level": 5},
    {"key": "unicorn", "name": "Unicorn", "emoji": "🦄", "unlock_level": 6},
    {"key": "dragon", "name": "Dragon", "emoji": "🐉", "unlock_level": 8},
    {"key": "wizard", "name": "Wizard", "emoji": "🧙", "unlock_level": 10},
    {"key": "trophy", "name": "Trophy", "emoji": "🏆", "unlock_level": 12},
    {"key": "diamond", "name": "Diamond", "emoji": "💎", "unlock_level": 15},
    {"key": "crown", "name": "Crown", "emoji": "👑", "unlock_level": 20},
    {"key": "sun", "name": "Sun", "emoji": "☀️", "unlock_level": 25},
    {"key": "galaxy", "name": "Galaxy", "emoji": "🌌", "unlock_level": 30},
]


MYSTERY_REWARDS = [
    {"kind": "xp", "amount": 25, "label": "+25 XP"},
    {"kind": "xp", "amount": 50, "label": "+50 XP"},
    {"kind": "coins", "amount": 10, "label": "+10 coins"},
    {"kind": "coins", "amount": 20, "label": "+20 coins"},
    {"kind": "credit", "amount": 1, "label": "+1 free assessment credit!"},
    {"kind": "badge", "amount": 1, "label": "Lucky badge!"},
]


DAILY_CHALLENGE_LENGTH = 5


class ClaimDailyIn(BaseModel):
    child_id: str


class OpenMysteryIn(BaseModel):
    child_id: str


class SelectAvatarIn(BaseModel):
    avatar_key: str


class DailyChallengeSubmitIn(BaseModel):
    child_id: str
    answers: List[int]


def build_engagement_router(db, get_current_user, push_notification):
    router = APIRouter(prefix="/api")

    # ============ PROGRESS / LEVEL ============
    @router.get("/progress/level/{child_id}")
    async def child_level(child_id: str, user=Depends(get_current_user)):
        try:
            child = await db.children.find_one({"_id": ObjectId(child_id), "parent_id": user["id"]})
        except Exception:
            raise HTTPException(400, "Invalid id")
        if not child: raise HTTPException(404, "Not found")
        return xp_to_level(child.get("xp", 0))

    # ============ STREAKS ============
    @router.get("/streak/{child_id}")
    async def get_streak(child_id: str, user=Depends(get_current_user)):
        streak = await db.streaks.find_one({"child_id": child_id, "parent_id": user["id"]})
        if not streak:
            return {"current_streak": 0, "longest_streak": 0, "last_active_date": None, "days_this_week": 0}
        today = today_str()
        yest = yesterday_str()
        current = streak.get("current_streak", 0)
        # Reset if last active > yesterday
        if streak.get("last_active_date") not in (today, yest):
            current = 0
        # Count active days in the last 7
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=6)).strftime("%Y-%m-%d")
        active_days = [d for d in streak.get("active_dates", []) if d >= seven_days_ago]
        return {
            "current_streak": current,
            "longest_streak": streak.get("longest_streak", 0),
            "last_active_date": streak.get("last_active_date"),
            "days_this_week": len(active_days),
            "active_dates": active_days,
        }

    async def _bump_streak(child_id: str, parent_id: str):
        """Called after any engagement event (assessment, game, daily challenge)."""
        today = today_str()
        yest = yesterday_str()
        streak = await db.streaks.find_one({"child_id": child_id, "parent_id": parent_id})
        if not streak:
            await db.streaks.insert_one({
                "child_id": child_id, "parent_id": parent_id,
                "current_streak": 1, "longest_streak": 1,
                "last_active_date": today, "active_dates": [today],
            })
            return {"current_streak": 1, "milestone": False}
        if streak.get("last_active_date") == today:
            return {"current_streak": streak["current_streak"], "milestone": False}
        prev = streak.get("last_active_date")
        current = streak.get("current_streak", 0) + 1 if prev == yest else 1
        longest = max(streak.get("longest_streak", 0), current)
        active = list(dict.fromkeys((streak.get("active_dates", []) + [today])[-60:]))
        await db.streaks.update_one({"_id": streak["_id"]}, {"$set": {
            "current_streak": current, "longest_streak": longest,
            "last_active_date": today, "active_dates": active,
        }})
        milestone = current in (7, 30, 100)
        if milestone:
            # Reward streak milestones
            bonus_xp = {7: 100, 30: 500, 100: 2000}[current]
            bonus_coins = {7: 20, 30: 100, 100: 500}[current]
            await db.children.update_one({"_id": ObjectId(child_id)}, {"$inc": {"xp": bonus_xp}})
            await db.users.update_one({"_id": ObjectId(parent_id)}, {"$inc": {"xp": bonus_xp, "coins": bonus_coins}})
            await db.notifications.insert_one({
                "user_id": parent_id, "kind": "streak_milestone",
                "title": f"🔥 {current}-day streak!",
                "body": f"Amazing consistency — +{bonus_xp} XP and +{bonus_coins} coins added.",
                "link": "/dashboard/rewards", "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            await db.timeline.insert_one({
                "child_id": child_id, "parent_id": parent_id,
                "kind": "streak_milestone", "title": f"{current}-day streak!",
                "meta": {"days": current, "xp": bonus_xp}, "created_at": datetime.now(timezone.utc).isoformat(),
            })
        return {"current_streak": current, "milestone": milestone}

    @router.post("/streak/{child_id}/bump")
    async def bump_streak_endpoint(child_id: str, user=Depends(get_current_user)):
        return await _bump_streak(child_id, user["id"])

    # Expose helper for other routes if needed
    router._bump_streak = _bump_streak

    # ============ DAILY LOGIN REWARD ============
    @router.get("/rewards/daily-status/{child_id}")
    async def daily_status(child_id: str, user=Depends(get_current_user)):
        today = today_str()
        claim = await db.daily_claims.find_one({"child_id": child_id, "parent_id": user["id"], "date": today})
        # Next reward cycles by streak: 10, 15, 20, 25, 30, 40, 50 xp for day 1-7 of the week
        streak = await db.streaks.find_one({"child_id": child_id, "parent_id": user["id"]})
        day_in_week = ((streak or {}).get("current_streak", 0) % 7) + 1
        rewards_ladder = [10, 15, 20, 25, 30, 40, 50]
        next_reward = rewards_ladder[min(6, day_in_week - 1)]
        return {"claimed_today": bool(claim), "next_reward_xp": next_reward, "day_in_week": day_in_week, "ladder": rewards_ladder}

    @router.post("/rewards/claim-daily")
    async def claim_daily(payload: ClaimDailyIn, user=Depends(get_current_user)):
        today = today_str()
        existing = await db.daily_claims.find_one({"child_id": payload.child_id, "parent_id": user["id"], "date": today})
        if existing:
            raise HTTPException(400, "Already claimed today")
        streak_info = await _bump_streak(payload.child_id, user["id"])
        day_in_week = ((streak_info["current_streak"] - 1) % 7) + 1
        rewards_ladder = [10, 15, 20, 25, 30, 40, 50]
        xp_reward = rewards_ladder[min(6, day_in_week - 1)]
        coins_reward = 5
        await db.children.update_one({"_id": ObjectId(payload.child_id)}, {"$inc": {"xp": xp_reward}})
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"xp": xp_reward, "coins": coins_reward}})
        await db.daily_claims.insert_one({
            "child_id": payload.child_id, "parent_id": user["id"],
            "date": today, "xp": xp_reward, "coins": coins_reward,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await db.timeline.insert_one({
            "child_id": payload.child_id, "parent_id": user["id"],
            "kind": "daily_claim", "title": "Daily login reward",
            "meta": {"xp": xp_reward, "coins": coins_reward, "streak": streak_info["current_streak"]},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"xp_awarded": xp_reward, "coins_awarded": coins_reward, "streak": streak_info["current_streak"]}

    # ============ DAILY BRAIN CHALLENGE ============
    def _daily_challenge_questions(age_group: str, seed_str: str):
        pool = [q for q in QUESTIONS if q["age_group"] == age_group and q["status"] == "active"]
        if not pool:
            return []
        # Deterministic per date
        rng = random.Random(seed_str)
        rng.shuffle(pool)
        return pool[:DAILY_CHALLENGE_LENGTH]

    @router.get("/daily-challenge/{child_id}")
    async def daily_challenge(child_id: str, user=Depends(get_current_user)):
        try:
            child = await db.children.find_one({"_id": ObjectId(child_id), "parent_id": user["id"]})
        except Exception:
            raise HTTPException(400, "Invalid id")
        if not child: raise HTTPException(404, "Not found")
        today = today_str()
        completed = await db.daily_challenge_completions.find_one({"child_id": child_id, "parent_id": user["id"], "date": today})
        seed = f"{today}-{child['age_group']}"
        qs = _daily_challenge_questions(child["age_group"], seed)
        return {
            "date": today,
            "age_group": child["age_group"],
            "completed": bool(completed),
            "score": (completed or {}).get("score"),
            "questions": [{"id": q["id"], "category": q["category"], "prompt": q["prompt"], "options": q["options"], "image": q.get("image", "")} for q in qs],
        }

    @router.post("/daily-challenge/submit")
    async def daily_challenge_submit(payload: DailyChallengeSubmitIn, user=Depends(get_current_user)):
        today = today_str()
        existing = await db.daily_challenge_completions.find_one({"child_id": payload.child_id, "parent_id": user["id"], "date": today})
        if existing:
            raise HTTPException(400, "Daily challenge already done")
        try:
            child = await db.children.find_one({"_id": ObjectId(payload.child_id), "parent_id": user["id"]})
        except Exception:
            raise HTTPException(400, "Invalid id")
        if not child: raise HTTPException(404, "Not found")
        seed = f"{today}-{child['age_group']}"
        qs = _daily_challenge_questions(child["age_group"], seed)
        if len(payload.answers) != len(qs):
            raise HTTPException(400, "Answer count mismatch")
        correct = sum(1 for i, q in enumerate(qs) if payload.answers[i] == q["answer"])
        xp = correct * 15 + 20
        coins = 3 if correct >= 4 else (2 if correct >= 2 else 1)
        await db.daily_challenge_completions.insert_one({
            "child_id": payload.child_id, "parent_id": user["id"], "date": today,
            "score": correct, "total": len(qs), "xp": xp, "coins": coins,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        streak_info = await _bump_streak(payload.child_id, user["id"])
        await db.children.update_one({"_id": ObjectId(payload.child_id)}, {"$inc": {"xp": xp}})
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"xp": xp, "coins": coins}})
        await db.timeline.insert_one({
            "child_id": payload.child_id, "parent_id": user["id"],
            "kind": "daily_challenge", "title": f"Daily challenge · {correct}/{len(qs)}",
            "meta": {"score": correct, "total": len(qs), "xp": xp}, "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"score": correct, "total": len(qs), "xp": xp, "coins": coins, "streak": streak_info["current_streak"]}

    # ============ WEEKLY / MONTHLY MISSIONS ============
    @router.get("/missions/{child_id}")
    async def missions(child_id: str, user=Depends(get_current_user)):
        now = datetime.now(timezone.utc)
        week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")
        month_start = now.strftime("%Y-%m")

        weekly_assessments = await db.assessments.count_documents({
            "child_id": child_id, "parent_id": user["id"], "created_at": {"$gte": week_start}
        })
        weekly_games = await db.brain_game_scores.count_documents({
            "child_id": child_id, "parent_id": user["id"], "created_at": {"$gte": week_start}
        })
        monthly_assessments = await db.assessments.count_documents({
            "child_id": child_id, "parent_id": user["id"], "created_at": {"$regex": f"^{month_start}"}
        })

        weekly = [
            {"key": "weekly_3_assessments", "title": "Take 3 assessments", "target": 3, "current": min(3, weekly_assessments), "xp": 100},
            {"key": "weekly_5_games", "title": "Play 5 brain games", "target": 5, "current": min(5, weekly_games), "xp": 60},
            {"key": "weekly_daily_challenge_3", "title": "Complete 3 daily challenges", "target": 3, "current": 0, "xp": 80},
        ]
        # Compute daily challenge count for this week
        week_start_dt = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")
        dc_count = await db.daily_challenge_completions.count_documents({
            "child_id": child_id, "parent_id": user["id"], "date": {"$gte": week_start_dt},
        })
        weekly[2]["current"] = min(3, dc_count)

        monthly = [
            {"key": "monthly_10_assessments", "title": "Take 10 assessments this month", "target": 10, "current": min(10, monthly_assessments), "xp": 400},
            {"key": "monthly_streak_7", "title": "Achieve a 7-day streak", "target": 7, "current": 0, "xp": 300},
        ]
        streak = await db.streaks.find_one({"child_id": child_id, "parent_id": user["id"]})
        monthly[1]["current"] = min(7, (streak or {}).get("longest_streak", 0))

        # Check completed & claimed
        for m in weekly + monthly:
            m["completed"] = m["current"] >= m["target"]
            claim = await db.mission_claims.find_one({
                "child_id": child_id, "parent_id": user["id"], "key": m["key"],
                "period": "week-" + week_start if m in weekly else "month-" + month_start,
            })
            m["claimed"] = bool(claim)

        return {"weekly": weekly, "monthly": monthly, "week_start": week_start, "month": month_start}

    @router.post("/missions/{child_id}/claim")
    async def claim_mission(child_id: str, key: str, user=Depends(get_current_user)):
        data = await missions(child_id, user)
        target = None
        period = None
        for m in data["weekly"]:
            if m["key"] == key:
                target = m
                period = "week-" + data["week_start"]
                break
        if not target:
            for m in data["monthly"]:
                if m["key"] == key:
                    target = m
                    period = "month-" + data["month"]
                    break
        if not target: raise HTTPException(404, "Mission not found")
        if not target["completed"]: raise HTTPException(400, "Not yet complete")
        if target["claimed"]: raise HTTPException(400, "Already claimed")
        await db.mission_claims.insert_one({
            "child_id": child_id, "parent_id": user["id"],
            "key": key, "period": period, "xp": target["xp"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await db.children.update_one({"_id": ObjectId(child_id)}, {"$inc": {"xp": target["xp"]}})
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"xp": target["xp"], "coins": 10}})
        await db.timeline.insert_one({
            "child_id": child_id, "parent_id": user["id"],
            "kind": "mission_claim", "title": target["title"],
            "meta": {"xp": target["xp"]}, "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"xp_awarded": target["xp"], "coins_awarded": 10}

    # ============ MYSTERY BOX ============
    @router.get("/mystery-box/status/{child_id}")
    async def mystery_status(child_id: str, user=Depends(get_current_user)):
        last = await db.mystery_boxes.find_one({"child_id": child_id, "parent_id": user["id"]}, sort=[("created_at", -1)])
        if not last:
            return {"available": True, "next_available_in_hours": 0}
        now = datetime.now(timezone.utc)
        last_at = datetime.fromisoformat(last["created_at"])
        elapsed = (now - last_at).total_seconds() / 3600
        remaining = max(0, 24 - elapsed)
        return {"available": remaining <= 0, "next_available_in_hours": round(remaining, 1), "last_reward": last.get("reward")}

    @router.post("/mystery-box/open")
    async def open_mystery(payload: OpenMysteryIn, user=Depends(get_current_user)):
        last = await db.mystery_boxes.find_one({"child_id": payload.child_id, "parent_id": user["id"]}, sort=[("created_at", -1)])
        if last:
            elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(last["created_at"])).total_seconds() / 3600
            if elapsed < 24:
                raise HTTPException(400, f"Come back in {round(24 - elapsed, 1)} hours!")
        reward = random.choice(MYSTERY_REWARDS)
        # Apply reward
        if reward["kind"] == "xp":
            await db.children.update_one({"_id": ObjectId(payload.child_id)}, {"$inc": {"xp": reward["amount"]}})
            await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"xp": reward["amount"]}})
        elif reward["kind"] == "coins":
            await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"coins": reward["amount"]}})
        elif reward["kind"] == "credit":
            await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"assessment_credits": reward["amount"]}})
        elif reward["kind"] == "badge":
            await db.children.update_one({"_id": ObjectId(payload.child_id)}, {"$addToSet": {"badges": "lucky"}})
        await db.mystery_boxes.insert_one({
            "child_id": payload.child_id, "parent_id": user["id"],
            "reward": reward, "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await db.timeline.insert_one({
            "child_id": payload.child_id, "parent_id": user["id"],
            "kind": "mystery_box", "title": f"Mystery box: {reward['label']}",
            "meta": reward, "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"reward": reward}

    # ============ AVATARS ============
    @router.get("/avatars/{child_id}")
    async def list_avatars(child_id: str, user=Depends(get_current_user)):
        try:
            child = await db.children.find_one({"_id": ObjectId(child_id), "parent_id": user["id"]})
        except Exception:
            raise HTTPException(400, "Invalid id")
        if not child: raise HTTPException(404, "Not found")
        level_info = xp_to_level(child.get("xp", 0))
        return {
            "current": child.get("avatar", "sprout"),
            "level": level_info["level"],
            "avatars": [{**a, "unlocked": a["unlock_level"] <= level_info["level"]} for a in AVATARS],
        }

    @router.post("/avatars/{child_id}/select")
    async def select_avatar(child_id: str, payload: SelectAvatarIn, user=Depends(get_current_user)):
        try:
            child = await db.children.find_one({"_id": ObjectId(child_id), "parent_id": user["id"]})
        except Exception:
            raise HTTPException(400, "Invalid id")
        if not child: raise HTTPException(404, "Not found")
        target = next((a for a in AVATARS if a["key"] == payload.avatar_key), None)
        if not target: raise HTTPException(404, "Avatar not found")
        level = xp_to_level(child.get("xp", 0))["level"]
        if target["unlock_level"] > level:
            raise HTTPException(400, f"Reach level {target['unlock_level']} to unlock this avatar.")
        await db.children.update_one({"_id": ObjectId(child_id)}, {"$set": {"avatar": payload.avatar_key}})
        return {"ok": True, "avatar": payload.avatar_key}

    # ============ ACHIEVEMENT TIMELINE ============
    @router.get("/timeline/{child_id}")
    async def timeline(child_id: str, user=Depends(get_current_user), limit: int = 50):
        items = []
        async for t in db.timeline.find({"child_id": child_id, "parent_id": user["id"]}).sort("created_at", -1).limit(min(limit, 200)):
            t["id"] = str(t["_id"]); t.pop("_id", None); items.append(t)
        return items

    # ============ AI DAILY PRACTICE SUGGESTION ============
    @router.get("/ai/daily-suggestion/{child_id}")
    async def ai_daily_suggestion(child_id: str, user=Depends(get_current_user)):
        try:
            child = await db.children.find_one({"_id": ObjectId(child_id), "parent_id": user["id"]})
        except Exception:
            raise HTTPException(400, "Invalid id")
        if not child: raise HTTPException(404, "Not found")
        today = today_str()
        cached = await db.ai_daily_suggestions.find_one({"child_id": child_id, "date": today})
        if cached:
            cached.pop("_id", None)
            return cached
        # Get weakest category from recent assessment if any
        recent = await db.assessments.find_one({"child_id": child_id, "parent_id": user["id"]}, sort=[("created_at", -1)])
        weakest = "curiosity"
        strongest = "problem solving"
        if recent and recent.get("growth_areas"):
            weakest = CATEGORY_LABELS.get(recent["growth_areas"][0], recent["growth_areas"][0])
        if recent and recent.get("strengths"):
            strongest = CATEGORY_LABELS.get(recent["strengths"][0], recent["strengths"][0])
        try:
            session_id = f"daily-{uuid.uuid4()}"
            chat = LlmChat(
                api_key=os.environ["EMERGENT_LLM_KEY"],
                session_id=session_id,
                system_message="You are a cheerful child-learning coach.",
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            reply = await chat.send_message(UserMessage(text=f"""
Suggest one concrete, playful 5-minute practice activity for {child['name']} (age {child['age']}) that gently develops {weakest}.
Their known strength is {strongest}.
Keep it 50-70 words, warm, addressed to the parent ("Try..."), no emojis, no clinical language.
"""))
            body = reply.strip()
        except Exception:
            body = f"Try a 5-minute {weakest} activity today: sort household items by color or size together, then invent 3 new categories. Celebrate every idea!"
        doc = {"child_id": child_id, "parent_id": user["id"], "date": today, "body": body,
               "focus_area": weakest, "created_at": datetime.now(timezone.utc).isoformat()}
        await db.ai_daily_suggestions.insert_one(doc)
        doc.pop("_id", None)
        return doc

    # ============ PARENT WEEKLY SUMMARY ============
    @router.get("/parent/weekly-summary")
    async def parent_weekly_summary(user=Depends(get_current_user)):
        now = datetime.now(timezone.utc)
        week_start = (now - timedelta(days=6)).isoformat()
        children_data = []
        async for c in db.children.find({"parent_id": user["id"]}):
            cid = str(c["_id"])
            assessments = await db.assessments.count_documents({"child_id": cid, "parent_id": user["id"], "created_at": {"$gte": week_start}})
            games = await db.brain_game_scores.count_documents({"child_id": cid, "parent_id": user["id"], "created_at": {"$gte": week_start}})
            streak = await db.streaks.find_one({"child_id": cid, "parent_id": user["id"]})
            level = xp_to_level(c.get("xp", 0))
            children_data.append({
                "child_id": cid,
                "name": c["name"],
                "assessments_this_week": assessments,
                "games_this_week": games,
                "current_streak": (streak or {}).get("current_streak", 0),
                "level": level["level"],
                "level_title": level["title"],
                "xp": c.get("xp", 0),
                "badges": c.get("badges", []),
            })
        return {"week_start": week_start, "children": children_data}

    return router
