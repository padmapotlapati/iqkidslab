from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt as pyjwt
import uuid
import logging
import secrets

from questions_data import get_questions, SKILL_LABELS

# LLM via emergentintegrations
from emergentintegrations.llm.chat import LlmChat, UserMessage

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
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access",
    }
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
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


class AssessmentSubmit(BaseModel):
    child_id: str
    age_group: str
    answers: List[int]  # index for each question in order
    duration_seconds: Optional[int] = 0


# ------------- Helpers -------------
def age_to_group(age: int) -> str:
    if age <= 5:
        return "3-5"
    if age <= 8:
        return "6-8"
    if age <= 12:
        return "9-12"
    return "13-16"


# ------------- Auth Endpoints -------------
@api_router.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "role": "parent",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "xp": 0,
        "coins": 50,
    }
    result = await db.users.insert_one(doc)
    uid = str(result.inserted_id)
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": doc["name"], "role": "parent", "xp": 0, "coins": 50}


@api_router.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {
        "id": uid,
        "email": email,
        "name": user.get("name"),
        "role": user.get("role", "parent"),
        "xp": user.get("xp", 0),
        "coins": user.get("coins", 0),
    }


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ------------- Children -------------
@api_router.post("/children")
async def create_child(payload: ChildIn, user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc["parent_id"] = user["id"]
    doc["age_group"] = age_to_group(payload.age)
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["xp"] = 0
    doc["stars"] = 0
    doc["badges"] = []
    result = await db.children.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.get("/children")
async def list_children(user=Depends(get_current_user)):
    items = []
    async for c in db.children.find({"parent_id": user["id"]}):
        c["id"] = str(c["_id"])
        c.pop("_id", None)
        items.append(c)
    return items


@api_router.get("/children/{child_id}")
async def get_child(child_id: str, user=Depends(get_current_user)):
    c = await db.children.find_one({"_id": ObjectId(child_id), "parent_id": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Child not found")
    c["id"] = str(c["_id"])
    c.pop("_id", None)
    return c


@api_router.delete("/children/{child_id}")
async def delete_child(child_id: str, user=Depends(get_current_user)):
    await db.children.delete_one({"_id": ObjectId(child_id), "parent_id": user["id"]})
    await db.assessments.delete_many({"child_id": child_id})
    return {"ok": True}


# ------------- Assessment -------------
@api_router.get("/assessment/questions/{age_group}")
async def get_assessment_questions(age_group: str, user=Depends(get_current_user)):
    qs = get_questions(age_group)
    if not qs:
        raise HTTPException(status_code=404, detail="No questions for this age group")
    # Strip answers for client
    return [{"id": q["id"], "skill": q["skill"], "prompt": q["prompt"], "options": q["options"]} for q in qs]


async def generate_ai_report(child_name: str, age: int, skill_scores: dict, total_correct: int, total_qs: int) -> str:
    """Generate friendly parent-facing report via Claude Sonnet 4.5."""
    try:
        skills_str = "\n".join([f"- {SKILL_LABELS.get(k, k)}: {v['correct']}/{v['total']}" for k, v in skill_scores.items()])
        prompt = f"""You are a friendly child-development coach writing a positive, encouraging report for a parent about their child's brain-skills assessment.

Child: {child_name}, Age: {age}
Overall score: {total_correct}/{total_qs}

Skill breakdown:
{skills_str}

Write a warm, uplifting report (150-220 words) with these sections using markdown-style headings:
## Summary
## Strengths
## Growth Opportunities
## Suggested Activities

Rules:
- NEVER call it an IQ diagnosis or clinical test
- Use positive language, celebrate the child
- Give 3 concrete fun activities to try at home
- Address the parent directly ("Your child...", "You can try...")
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
    except Exception as e:
        logging.exception("AI report generation failed")
        return f"""## Summary
Great job to {child_name} for completing the assessment! They scored {total_correct} out of {total_qs}.

## Strengths
Your child showed engagement and effort across multiple thinking skills.

## Growth Opportunities
Continue nurturing curiosity through play-based learning.

## Suggested Activities
- Try a daily 10-minute puzzle time
- Read a short story together and ask questions
- Play memory-matching card games"""


@api_router.post("/assessment/submit")
async def submit_assessment(payload: AssessmentSubmit, user=Depends(get_current_user)):
    child = await db.children.find_one({"_id": ObjectId(payload.child_id), "parent_id": user["id"]})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    qs = get_questions(payload.age_group)
    if len(payload.answers) != len(qs):
        raise HTTPException(status_code=400, detail="Answer count mismatch")

    skill_scores = {}
    total_correct = 0
    for i, q in enumerate(qs):
        skill = q["skill"]
        skill_scores.setdefault(skill, {"correct": 0, "total": 0})
        skill_scores[skill]["total"] += 1
        if payload.answers[i] == q["answer"]:
            skill_scores[skill]["correct"] += 1
            total_correct += 1

    percentage = round((total_correct / len(qs)) * 100)
    # Estimated cognitive score (educational, not clinical)
    est_score = 80 + round((percentage / 100) * 40)  # 80-120 range

    xp_earned = total_correct * 10
    stars_earned = 3 if percentage >= 80 else (2 if percentage >= 60 else 1)

    ai_report = await generate_ai_report(child["name"], child["age"], skill_scores, total_correct, len(qs))

    assessment_doc = {
        "child_id": payload.child_id,
        "parent_id": user["id"],
        "age_group": payload.age_group,
        "skill_scores": skill_scores,
        "total_correct": total_correct,
        "total_questions": len(qs),
        "percentage": percentage,
        "estimated_score": est_score,
        "duration_seconds": payload.duration_seconds,
        "xp_earned": xp_earned,
        "stars_earned": stars_earned,
        "ai_report": ai_report,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.assessments.insert_one(assessment_doc)

    # Update child stats
    new_badges = list(child.get("badges", []))
    if percentage >= 80 and "brain_star" not in new_badges:
        new_badges.append("brain_star")
    if len(qs) - total_correct <= 1 and "sharp_mind" not in new_badges:
        new_badges.append("sharp_mind")

    await db.children.update_one(
        {"_id": ObjectId(payload.child_id)},
        {"$inc": {"xp": xp_earned, "stars": stars_earned}, "$set": {"badges": new_badges}},
    )
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"xp": xp_earned, "coins": stars_earned * 5}})

    assessment_doc["id"] = str(result.inserted_id)
    assessment_doc.pop("_id", None)
    return assessment_doc


@api_router.get("/assessments/child/{child_id}")
async def list_assessments(child_id: str, user=Depends(get_current_user)):
    items = []
    async for a in db.assessments.find({"child_id": child_id, "parent_id": user["id"]}).sort("created_at", -1):
        a["id"] = str(a["_id"])
        a.pop("_id", None)
        items.append(a)
    return items


@api_router.get("/assessments/{assessment_id}")
async def get_assessment(assessment_id: str, user=Depends(get_current_user)):
    a = await db.assessments.find_one({"_id": ObjectId(assessment_id), "parent_id": user["id"]})
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    a["id"] = str(a["_id"])
    a.pop("_id", None)
    return a


@api_router.get("/dashboard/stats")
async def dashboard_stats(user=Depends(get_current_user)):
    total_children = await db.children.count_documents({"parent_id": user["id"]})
    total_assessments = await db.assessments.count_documents({"parent_id": user["id"]})
    # Recent 5 assessments
    recent = []
    async for a in db.assessments.find({"parent_id": user["id"]}).sort("created_at", -1).limit(5):
        a["id"] = str(a["_id"])
        a.pop("_id", None)
        recent.append(a)
    return {
        "total_children": total_children,
        "total_assessments": total_assessments,
        "recent_assessments": recent,
        "xp": user.get("xp", 0),
        "coins": user.get("coins", 0),
    }


@api_router.get("/")
async def root():
    return {"message": "Kids IQ Test API", "status": "ok"}


# ------------- Startup -------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.children.create_index("parent_id")
    await db.assessments.create_index("child_id")
    # Seed admin & test parent
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

# CORS
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
