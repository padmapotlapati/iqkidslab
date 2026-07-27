"""Phonics Fun Router — tracks stars, correct answers, badges per child.

Endpoints:
  GET  /api/phonics/state/{child_id}    → current stars / correct / badges
  POST /api/phonics/answer              → record an answer; grants +1 star on correct
  POST /api/phonics/badge               → award a letter badge (A-Z)
  POST /api/phonics/reset/{child_id}    → reset progress (used by 'Play Again')

Uses db.phonics_progress collection. Keeps XP/coins hooks OPTIONAL — increments the
child's total XP by a small amount per correct answer so it feeds into the existing
engagement system without duplicating logic.
"""
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel


def _now():
    return datetime.now(timezone.utc)


def build_phonics_router(db, get_current_user) -> APIRouter:
    router = APIRouter(prefix="/api/phonics")

    class AnswerIn(BaseModel):
        child_id: str
        kind: str  # "sound" | "speak" | "letter"
        letter: Optional[str] = None
        correct: bool = True

    class BadgeIn(BaseModel):
        child_id: str
        letter: str  # single uppercase letter

    async def _get_or_create(child_id: str, parent_id: str) -> dict:
        p = await db.phonics_progress.find_one({"child_id": child_id, "parent_id": parent_id})
        if p:
            return p
        doc = {
            "child_id": child_id, "parent_id": parent_id,
            "stars": 0, "correct_answers": 0,
            "sound_attempts": 0, "speak_attempts": 0,
            "badges": [], "created_at": _now().isoformat(),
        }
        await db.phonics_progress.insert_one(doc)
        return doc

    @router.get("/state/{child_id}")
    async def state(child_id: str, user=Depends(get_current_user)):
        # Ownership check
        c = await db.children.find_one({"_id": ObjectId(child_id), "parent_id": user["id"]})
        if not c: raise HTTPException(404, "Child not found")
        p = await _get_or_create(child_id, user["id"])
        return {
            "stars": p.get("stars", 0),
            "max_stars": 10,
            "correct_answers": p.get("correct_answers", 0),
            "sound_attempts": p.get("sound_attempts", 0),
            "speak_attempts": p.get("speak_attempts", 0),
            "badges": p.get("badges", []),
            "badges_earned": len(p.get("badges", [])),
            "child_name": c.get("name"),
        }

    @router.post("/answer")
    async def answer(payload: AnswerIn, user=Depends(get_current_user)):
        c = await db.children.find_one({"_id": ObjectId(payload.child_id), "parent_id": user["id"]})
        if not c: raise HTTPException(404, "Child not found")
        await _get_or_create(payload.child_id, user["id"])

        inc = {}
        if payload.kind == "sound":
            inc["sound_attempts"] = 1
        elif payload.kind == "speak":
            inc["speak_attempts"] = 1
        if payload.correct:
            inc["correct_answers"] = 1
            # Cap stars at 10 per session — but never regress
            existing = await db.phonics_progress.find_one({"child_id": payload.child_id, "parent_id": user["id"]})
            if (existing or {}).get("stars", 0) < 10:
                inc["stars"] = 1

        if inc:
            await db.phonics_progress.update_one(
                {"child_id": payload.child_id, "parent_id": user["id"]},
                {"$inc": inc, "$set": {"updated_at": _now().isoformat()}},
            )
        # Small XP tie-in with existing engagement system
        if payload.correct:
            await db.children.update_one({"_id": ObjectId(payload.child_id)}, {"$inc": {"xp": 5}})
            await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"xp": 5, "coins": 1}})

        p = await db.phonics_progress.find_one({"child_id": payload.child_id, "parent_id": user["id"]})
        return {
            "ok": True,
            "stars": p.get("stars", 0),
            "correct_answers": p.get("correct_answers", 0),
            "badges_earned": len(p.get("badges", [])),
        }

    @router.post("/badge")
    async def badge(payload: BadgeIn, user=Depends(get_current_user)):
        letter = (payload.letter or "").upper()[:1]
        if not letter or not letter.isalpha():
            raise HTTPException(400, "Invalid letter")
        c = await db.children.find_one({"_id": ObjectId(payload.child_id), "parent_id": user["id"]})
        if not c: raise HTTPException(404, "Child not found")
        await _get_or_create(payload.child_id, user["id"])
        await db.phonics_progress.update_one(
            {"child_id": payload.child_id, "parent_id": user["id"]},
            {"$addToSet": {"badges": letter}, "$set": {"updated_at": _now().isoformat()}},
        )
        p = await db.phonics_progress.find_one({"child_id": payload.child_id, "parent_id": user["id"]})
        return {"ok": True, "badges": p.get("badges", []), "badges_earned": len(p.get("badges", []))}

    @router.post("/reset/{child_id}")
    async def reset(child_id: str, user=Depends(get_current_user)):
        c = await db.children.find_one({"_id": ObjectId(child_id), "parent_id": user["id"]})
        if not c: raise HTTPException(404, "Child not found")
        await db.phonics_progress.update_one(
            {"child_id": child_id, "parent_id": user["id"]},
            {"$set": {
                "stars": 0, "correct_answers": 0,
                "sound_attempts": 0, "speak_attempts": 0,
                "updated_at": _now().isoformat(),
            }},
            upsert=True,
        )
        return {"ok": True}

    return router
