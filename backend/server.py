from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt as pyjwt
import uuid
import io
import logging
import secrets

from questions_data import (
    QUESTIONS, get_questions_by_age, public_view, CATEGORIES, CATEGORY_LABELS,
    QUESTION_TIME, SESSION_LENGTH,
)
from assessment_engine import build_adaptive_session, compute_weighted_score
from pdf_generator import build_report_pdf, build_certificate_pdf
from saas_router import build_router as build_saas_router

from emergentintegrations.llm.chat import LlmChat, UserMessage

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.responses import JSONResponse as _JSONResponse

limiter = Limiter(key_func=get_remote_address)

# --- Mongo ---
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=86400, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ------------- Models -------------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ChildIn(BaseModel):
    name: str
    nickname: Optional[str] = ""
    age: int
    gender: Optional[str] = ""
    grade: Optional[str] = ""
    language: Optional[str] = "English"
    interests: Optional[List[str]] = []
    avatar: Optional[str] = ""


class StartSessionIn(BaseModel):
    child_id: str


class SubmitSessionIn(BaseModel):
    session_id: str
    answers: List[int]
    durations: List[int]  # seconds spent on each question


class QuestionIn(BaseModel):
    age_group: str
    category: str
    question_type: str
    difficulty: int
    prompt: str
    image: Optional[str] = ""
    options: List[str]
    answer: int
    explanation: Optional[str] = ""
    estimated_time: int = 20
    points: int = 10
    tags: Optional[List[str]] = []
    language: Optional[str] = "en"


class BrainGameScoreIn(BaseModel):
    child_id: str
    game_key: str
    score: int
    duration_seconds: Optional[int] = 0
    metadata: Optional[Dict[str, Any]] = {}


# ------------- Helpers -------------
def age_to_group(age: int) -> str:
    if age <= 5: return "3-5"
    if age <= 8: return "6-8"
    if age <= 12: return "9-12"
    return "13-16"


async def push_notification(user_id: str, kind: str, title: str, body: str, link: str = ""):
    await db.notifications.insert_one({
        "user_id": user_id, "kind": kind, "title": title, "body": body,
        "link": link, "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


# ============ AUTH ============
@api_router.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email, "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "role": "parent",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "xp": 0, "coins": 50,
    }
    result = await db.users.insert_one(doc)
    uid = str(result.inserted_id)
    access, refresh = create_access_token(uid, email), create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    await push_notification(uid, "welcome", "Welcome to Kids IQ Test!", "Create your first child profile to get started.", "/dashboard")
    return {"id": uid, "email": email, "name": doc["name"], "role": "parent", "xp": 0, "coins": 50}


@api_router.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("blocked"):
        raise HTTPException(status_code=403, detail="Account blocked. Contact support.")
    uid = str(user["_id"])
    access, refresh = create_access_token(uid, email), create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    await db.audit_logs.insert_one({
        "user_id": uid, "action": "login",
        "meta": {"ip": request.client.host if request.client else ""},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": uid, "email": email, "name": user.get("name"), "role": user.get("role", "parent"),
            "xp": user.get("xp", 0), "coins": user.get("coins", 0)}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    # Include assessment_credits + active subscription flag
    raw = await db.users.find_one({"_id": ObjectId(user["id"])})
    user["assessment_credits"] = int((raw or {}).get("assessment_credits", 0))
    sub = await db.subscriptions.find_one({"user_id": user["id"], "active": True})
    user["is_premium"] = bool(sub)
    if sub:
        user["premium_plan"] = sub.get("plan_id")
        user["premium_expires_at"] = sub.get("expires_at")
    return user


# ============ CHILDREN ============
@api_router.post("/children")
async def create_child(payload: ChildIn, user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc["parent_id"] = user["id"]
    doc["age_group"] = age_to_group(payload.age)
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["xp"] = 0; doc["stars"] = 0; doc["badges"] = []
    result = await db.children.insert_one(doc)
    doc["id"] = str(result.inserted_id); doc.pop("_id", None)
    return doc


@api_router.get("/children")
async def list_children(user=Depends(get_current_user)):
    items = []
    async for c in db.children.find({"parent_id": user["id"]}):
        c["id"] = str(c["_id"]); c.pop("_id", None); items.append(c)
    return items


@api_router.get("/children/{child_id}")
async def get_child(child_id: str, user=Depends(get_current_user)):
    try:
        c = await db.children.find_one({"_id": ObjectId(child_id), "parent_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid child id")
    if not c: raise HTTPException(status_code=404, detail="Child not found")
    c["id"] = str(c["_id"]); c.pop("_id", None)
    return c


@api_router.delete("/children/{child_id}")
async def delete_child(child_id: str, user=Depends(get_current_user)):
    try:
        r = await db.children.delete_one({"_id": ObjectId(child_id), "parent_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid child id")
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Child not found")
    await db.assessments.delete_many({"child_id": child_id})
    await db.assessment_sessions.delete_many({"child_id": child_id})
    await db.brain_game_scores.delete_many({"child_id": child_id})
    return {"ok": True}


# ============ QUESTIONS META ============
@api_router.get("/meta/categories")
async def meta_categories(_=Depends(get_current_user)):
    return {"categories": CATEGORIES, "labels": CATEGORY_LABELS}


# Legacy endpoint kept for backward compatibility
@api_router.get("/assessment/questions/{age_group}")
async def get_assessment_questions(age_group: str, user=Depends(get_current_user)):
    qs = get_questions_by_age(age_group)
    if not qs: raise HTTPException(status_code=404, detail="No questions for this age group")
    return [{"id": q["id"], "skill": q["category"], "prompt": q["prompt"], "options": q["options"]} for q in qs]


# ============ ASSESSMENT SESSIONS (adaptive) ============
@api_router.post("/sessions/start")
async def start_session(payload: StartSessionIn, user=Depends(get_current_user)):
    try:
        child = await db.children.find_one({"_id": ObjectId(payload.child_id), "parent_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid child id")
    if not child: raise HTTPException(status_code=404, detail="Child not found")

    age_group = child["age_group"]
    questions = build_adaptive_session(age_group)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions available")

    session_doc = {
        "child_id": payload.child_id,
        "parent_id": user["id"],
        "age_group": age_group,
        "question_ids": [q["id"] for q in questions],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "status": "in_progress",
        "time_per_question": QUESTION_TIME.get(age_group, 25),
    }
    r = await db.assessment_sessions.insert_one(session_doc)
    sid = str(r.inserted_id)
    return {
        "session_id": sid,
        "age_group": age_group,
        "time_per_question": session_doc["time_per_question"],
        "questions": [public_view(q) for q in questions],
    }


@api_router.post("/sessions/submit")
async def submit_session(payload: SubmitSessionIn, user=Depends(get_current_user)):
    try:
        sess = await db.assessment_sessions.find_one({"_id": ObjectId(payload.session_id), "parent_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session id")
    if not sess: raise HTTPException(status_code=404, detail="Session not found")
    if sess.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Session already submitted")

    qids = sess["question_ids"]
    qmap = {q["id"]: q for q in QUESTIONS}
    ordered_qs = [qmap[qid] for qid in qids if qid in qmap]

    if len(payload.answers) != len(ordered_qs):
        raise HTTPException(status_code=400, detail="Answer count mismatch")

    durations = payload.durations if len(payload.durations) == len(ordered_qs) else [q["estimated_time"] for q in ordered_qs]

    profile = compute_weighted_score(ordered_qs, payload.answers, durations)

    xp_earned = profile["total_points_earned"]
    stars_earned = 3 if profile["overall_score"] >= 80 else (2 if profile["overall_score"] >= 60 else 1)

    # AI report
    child = await db.children.find_one({"_id": ObjectId(sess["child_id"])})
    ai_report = await generate_ai_report(child, profile)

    assessment_doc = {
        "session_id": payload.session_id,
        "child_id": sess["child_id"],
        "parent_id": user["id"],
        "age_group": sess["age_group"],
        "question_ids": qids,
        "answers": payload.answers,
        "durations": durations,
        **profile,
        "xp_earned": xp_earned,
        "stars_earned": stars_earned,
        "ai_report": ai_report,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    r = await db.assessments.insert_one(assessment_doc)
    assessment_id = str(r.inserted_id)

    # Mark session complete
    await db.assessment_sessions.update_one({"_id": sess["_id"]}, {"$set": {"status": "completed", "assessment_id": assessment_id}})

    # Badges
    new_badges = list((child or {}).get("badges", []))
    if profile["overall_score"] >= 80 and "brain_star" not in new_badges:
        new_badges.append("brain_star")
    if profile["accuracy"] >= 90 and "sharp_mind" not in new_badges:
        new_badges.append("sharp_mind")
    if profile["speed_score"] >= 80 and "quick_thinker" not in new_badges:
        new_badges.append("quick_thinker")

    await db.children.update_one(
        {"_id": ObjectId(sess["child_id"])},
        {"$inc": {"xp": xp_earned, "stars": stars_earned}, "$set": {"badges": new_badges}},
    )
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"xp": xp_earned, "coins": stars_earned * 5}})

    # Create certificate record if score decent
    if profile["overall_score"] >= 50:
        cert_id = f"KIQ-{secrets.token_hex(4).upper()}"
        await db.certificates.insert_one({
            "certificate_id": cert_id,
            "assessment_id": assessment_id,
            "child_id": sess["child_id"],
            "parent_id": user["id"],
            "child_name": (child or {}).get("name"),
            "age_group": sess["age_group"],
            "overall_score": profile["overall_score"],
            "estimated_index": profile["estimated_index"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await push_notification(user["id"], "achievement", "New certificate unlocked!",
                                f"{(child or {}).get('name')} earned a certificate with {profile['overall_score']}% overall.",
                                f"/dashboard/certificates")

    await push_notification(user["id"], "assessment_complete", "Assessment complete",
                            f"View the personalized brain-skills report for {(child or {}).get('name')}.",
                            f"/dashboard/report/{assessment_id}")

    assessment_doc["id"] = assessment_id; assessment_doc.pop("_id", None)
    return assessment_doc


async def generate_ai_report(child: dict, profile: dict) -> str:
    try:
        cat_lines = "\n".join([
            f"- {CATEGORY_LABELS.get(k, k)}: {v['correct']}/{v['total']} ({v['score']}%)"
            for k, v in profile["category_scores"].items()
        ])
        strengths_str = ", ".join([CATEGORY_LABELS.get(s, s) for s in profile["strengths"]])
        growth_str = ", ".join([CATEGORY_LABELS.get(g, g) for g in profile["growth_areas"]]) or "no critical growth areas"

        prompt = f"""You are a friendly child-development coach writing an upbeat, encouraging report for a parent about their child's brain-skills assessment.

Child: {child.get('name')}, Age: {child.get('age')}
Overall Brain-Skills Score: {profile['overall_score']}%
Accuracy: {profile['accuracy']}% · Speed: {profile['speed_score']}% · Consistency: {profile['consistency']}%
Estimated cognitive index (educational only): {profile['estimated_index']}
Percentile: {profile['percentile']}th
Top strengths: {strengths_str}
Growth areas: {growth_str}

Category scores:
{cat_lines}

Write a warm, uplifting parent-facing report (200-260 words) with these markdown headings:
## Summary
## Strengths
## Growth Opportunities
## Daily Activities
## Weekly Practice Plan
## Monthly Development Goals

Rules:
- Never call this a clinical IQ diagnosis
- Positive, celebratory tone; address the parent directly
- Give 3 concrete fun home activities in Daily Activities as a bulleted list
- Weekly plan: 4-5 short bullet actions
- Monthly goals: 2-3 aspirational but realistic bullets
- No emojis
"""
        session_id = f"report-{uuid.uuid4()}"
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=session_id,
            system_message="You are a friendly, encouraging child-development coach.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        reply = await chat.send_message(UserMessage(text=prompt))
        return reply
    except Exception:
        logging.exception("AI report generation failed")
        return f"""## Summary
Great job! {child.get('name', 'Your child')} scored {profile['overall_score']}% overall with an estimated index of {profile['estimated_index']}. This reflects wonderful engagement across the brain-skills activities.

## Strengths
Standout areas include {', '.join([CATEGORY_LABELS.get(s, s) for s in profile['strengths']]) or 'well-rounded thinking'}.

## Growth Opportunities
Gently continue to nurture {', '.join([CATEGORY_LABELS.get(g, g) for g in profile['growth_areas']]) or 'curiosity across all skills'}.

## Daily Activities
- 10-minute puzzle time
- Read a short story and ask "why" questions
- Memory-matching card game with 8 pairs

## Weekly Practice Plan
- 2 days of pattern puzzles
- 2 days of story-based logic
- 1 day of word/vocabulary play

## Monthly Development Goals
- Complete 4 brain-skills sessions this month
- Try one new game category each week"""


@api_router.get("/assessments/{assessment_id}")
async def get_assessment(assessment_id: str, user=Depends(get_current_user)):
    try:
        a = await db.assessments.find_one({"_id": ObjectId(assessment_id), "parent_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not a: raise HTTPException(status_code=404, detail="Assessment not found")
    a["id"] = str(a["_id"]); a.pop("_id", None)
    return a


@api_router.get("/assessments/child/{child_id}")
async def list_assessments(child_id: str, user=Depends(get_current_user)):
    items = []
    async for a in db.assessments.find({"child_id": child_id, "parent_id": user["id"]}).sort("created_at", -1):
        a["id"] = str(a["_id"]); a.pop("_id", None); items.append(a)
    return items


@api_router.get("/assessments/{assessment_id}/pdf")
async def download_assessment_pdf(assessment_id: str, user=Depends(get_current_user)):
    try:
        a = await db.assessments.find_one({"_id": ObjectId(assessment_id), "parent_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not a: raise HTTPException(status_code=404, detail="Not found")
    child = await db.children.find_one({"_id": ObjectId(a["child_id"])})
    pdf_bytes = build_report_pdf(child or {}, a, a.get("ai_report", ""))
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="brain-skills-report-{assessment_id}.pdf"'})


# ============ CERTIFICATES ============
@api_router.get("/certificates")
async def list_certificates(user=Depends(get_current_user)):
    items = []
    async for c in db.certificates.find({"parent_id": user["id"]}).sort("created_at", -1):
        c["id"] = str(c["_id"]); c.pop("_id", None); items.append(c)
    return items


@api_router.get("/certificates/{certificate_id}/pdf")
async def download_certificate_pdf(certificate_id: str, user=Depends(get_current_user)):
    c = await db.certificates.find_one({"certificate_id": certificate_id, "parent_id": user["id"]})
    if not c: raise HTTPException(status_code=404, detail="Not found")
    assessment = await db.assessments.find_one({"_id": ObjectId(c["assessment_id"])})
    child = await db.children.find_one({"_id": ObjectId(c["child_id"])})
    verify_url = f"{os.environ.get('FRONTEND_URL','')}/verify/{certificate_id}"
    pdf = build_certificate_pdf(child or {}, assessment or {}, certificate_id, verify_url)
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="certificate-{certificate_id}.pdf"'})


@api_router.get("/certificates/verify/{certificate_id}")
async def verify_certificate(certificate_id: str):
    c = await db.certificates.find_one({"certificate_id": certificate_id})
    if not c: return {"valid": False}
    c.pop("_id", None); c.pop("parent_id", None)
    return {"valid": True, "certificate": c}


# ============ BRAIN GAMES ============
BRAIN_GAMES = [
    {"key": "memory_match", "name": "Memory Match", "category": "memory", "color": "from-pink-500 to-rose-500", "icon": "brain", "description": "Flip cards and find pairs. Trains memory."},
    {"key": "reaction_tap", "name": "Reaction Tap", "category": "processing_speed", "color": "from-orange-500 to-red-500", "icon": "zap", "description": "Tap targets as fast as you can. Trains reflexes."},
    {"key": "pattern_hunt", "name": "Pattern Hunt", "category": "pattern_recognition", "color": "from-purple-500 to-fuchsia-500", "icon": "shapes", "description": "Spot the next shape in the sequence."},
    {"key": "focus_find", "name": "Focus Find", "category": "attention", "color": "from-blue-500 to-cyan-500", "icon": "target", "description": "Find the odd one out under time pressure."},
    {"key": "math_dash", "name": "Math Dash", "category": "mathematical_thinking", "color": "from-emerald-500 to-teal-500", "icon": "calculator", "description": "Solve quick math problems against the clock."},
    {"key": "word_link", "name": "Word Link", "category": "language_skills", "color": "from-yellow-500 to-orange-500", "icon": "book", "description": "Match rhymes, synonyms & antonyms."},
    {"key": "logic_flow", "name": "Logic Flow", "category": "logical_reasoning", "color": "from-indigo-500 to-purple-500", "icon": "puzzle", "description": "Solve step-by-step logic puzzles."},
]


@api_router.get("/games")
async def list_games(_=Depends(get_current_user)):
    return BRAIN_GAMES


@api_router.post("/games/score")
async def save_game_score(payload: BrainGameScoreIn, user=Depends(get_current_user)):
    try:
        child = await db.children.find_one({"_id": ObjectId(payload.child_id), "parent_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid child id")
    if not child: raise HTTPException(status_code=404, detail="Child not found")
    doc = {
        "child_id": payload.child_id,
        "parent_id": user["id"],
        "game_key": payload.game_key,
        "score": payload.score,
        "duration_seconds": payload.duration_seconds,
        "metadata": payload.metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    r = await db.brain_game_scores.insert_one(doc)
    xp = max(5, payload.score // 5)
    await db.children.update_one({"_id": ObjectId(payload.child_id)}, {"$inc": {"xp": xp}})
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"xp": xp}})
    return {"id": str(r.inserted_id), "xp_earned": xp}


@api_router.get("/games/scores/{child_id}")
async def list_game_scores(child_id: str, user=Depends(get_current_user)):
    items = []
    async for s in db.brain_game_scores.find({"child_id": child_id, "parent_id": user["id"]}).sort("created_at", -1).limit(50):
        s["id"] = str(s["_id"]); s.pop("_id", None); items.append(s)
    return items


# ============ PROGRESS ============
@api_router.get("/progress/{child_id}")
async def progress(child_id: str, user=Depends(get_current_user)):
    try:
        child = await db.children.find_one({"_id": ObjectId(child_id), "parent_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not child: raise HTTPException(status_code=404, detail="Not found")

    assessments = []
    async for a in db.assessments.find({"child_id": child_id, "parent_id": user["id"]}).sort("created_at", 1):
        assessments.append({
            "date": a["created_at"],
            "overall_score": a.get("overall_score", a.get("percentage", 0)),
            "accuracy": a.get("accuracy", 0),
            "estimated_index": a.get("estimated_index", 0),
        })

    # Aggregate category scores across assessments
    cat_agg: Dict[str, Dict] = {c: {"correct": 0, "total": 0} for c in CATEGORIES}
    async for a in db.assessments.find({"child_id": child_id, "parent_id": user["id"]}):
        for cat, s in (a.get("category_scores") or {}).items():
            if cat in cat_agg:
                cat_agg[cat]["correct"] += s.get("correct", 0)
                cat_agg[cat]["total"] += s.get("total", 0)

    category_progress = []
    for cat, s in cat_agg.items():
        if s["total"] > 0:
            category_progress.append({
                "category": cat,
                "label": CATEGORY_LABELS[cat],
                "correct": s["correct"], "total": s["total"],
                "percentage": round(s["correct"] / s["total"] * 100),
            })

    return {
        "child": {"id": str(child["_id"]), "name": child["name"], "xp": child.get("xp", 0), "stars": child.get("stars", 0), "badges": child.get("badges", [])},
        "timeline": assessments,
        "category_progress": category_progress,
    }


# ============ NOTIFICATIONS ============
@api_router.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    items = []
    async for n in db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).limit(30):
        n["id"] = str(n["_id"]); n.pop("_id", None); items.append(n)
    return items


@api_router.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user=Depends(get_current_user)):
    try:
        await db.notifications.update_one({"_id": ObjectId(notif_id), "user_id": user["id"]}, {"$set": {"read": True}})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    return {"ok": True}


@api_router.post("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


# ============ DASHBOARD ============
@api_router.get("/dashboard/stats")
async def dashboard_stats(user=Depends(get_current_user)):
    total_children = await db.children.count_documents({"parent_id": user["id"]})
    total_assessments = await db.assessments.count_documents({"parent_id": user["id"]})
    total_certificates = await db.certificates.count_documents({"parent_id": user["id"]})
    total_notifs_unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    recent = []
    async for a in db.assessments.find({"parent_id": user["id"]}).sort("created_at", -1).limit(5):
        a["id"] = str(a["_id"]); a.pop("_id", None); recent.append(a)
    return {
        "total_children": total_children,
        "total_assessments": total_assessments,
        "total_certificates": total_certificates,
        "unread_notifications": total_notifs_unread,
        "recent_assessments": recent,
        "xp": user.get("xp", 0), "coins": user.get("coins", 0),
    }


# ============ ADMIN ============
@api_router.get("/admin/questions")
async def admin_list_questions(admin=Depends(require_admin)):
    # Returns bank + any DB-stored custom questions
    custom = []
    async for q in db.custom_questions.find({}):
        q["id"] = q.get("q_id", str(q["_id"])); q.pop("_id", None); custom.append(q)
    return {"builtin_count": len(QUESTIONS), "builtin": QUESTIONS, "custom": custom}


@api_router.post("/admin/questions")
async def admin_add_question(payload: QuestionIn, admin=Depends(require_admin)):
    qid = f"custom-{secrets.token_hex(4)}"
    doc = payload.model_dump()
    doc.update({"q_id": qid, "status": "active", "created_by": admin["id"],
                "created_at": datetime.now(timezone.utc).isoformat()})
    r = await db.custom_questions.insert_one(doc)
    return {"id": qid, "_stored": str(r.inserted_id)}


# ============ ROOT ============
@api_router.get("/")
async def root():
    return {"message": "Kids IQ Test API", "status": "ok", "version": "2.0"}


# ============ Startup ============
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.children.create_index("parent_id")
    await db.assessments.create_index("child_id")
    await db.assessment_sessions.create_index("parent_id")
    await db.certificates.create_index("certificate_id", unique=True)
    # Deduplicate existing coupons before creating unique index
    seen_codes = set()
    async for c in db.coupons.find({}):
        code = c.get("code")
        if code in seen_codes:
            await db.coupons.delete_one({"_id": c["_id"]})
        else:
            seen_codes.add(code)
    await db.coupons.create_index("code", unique=True)
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.brain_game_scores.create_index([("child_id", 1), ("created_at", -1)])

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@kidsiqtest.com")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    if not await db.users.find_one({"email": admin_email}):
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_pw),
            "name": "Admin", "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "xp": 0, "coins": 0,
        })
    if not await db.users.find_one({"email": "parent@test.com"}):
        await db.users.insert_one({
            "email": "parent@test.com", "password_hash": hash_password("Parent@12345"),
            "name": "Test Parent", "role": "parent",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "xp": 0, "coins": 50,
        })


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)

# Part 3 SaaS routes (admin, payments, blog, analytics, coupons)
app.include_router(build_saas_router(db, require_admin, get_current_user, push_notification))

# Rate limiting: limit login/register to prevent brute force
app.state.limiter = limiter
@app.exception_handler(RateLimitExceeded)
async def _ratelimit_handler(request: Request, exc: RateLimitExceeded):
    return _JSONResponse(status_code=429, content={"detail": "Too many requests. Please try again later."})

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
