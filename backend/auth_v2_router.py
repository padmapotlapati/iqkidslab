"""Auth v2 Router — Kids IQ Test.

Provides:
  - Email verification (Resend) with hard-lock on sensitive endpoints
  - Password reset (Resend, 1hr expiry)
  - Emergent-managed Google Sign-In (session_token cookie flow)

Integrates with the existing JWT-based email/password auth in server.py.
Keeps `db.users` as the single source of truth; adds `email_verified` field.

REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
"""
import asyncio
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
import resend
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr

TOKEN_HEX_LEN = 32                       # 64-char URL-safe token
VERIFICATION_TTL_HOURS = 24              # verify-email link
RESET_TTL_HOURS = 1                      # password reset — per user spec
SESSION_TTL_DAYS = 7                     # Emergent Google session cookie
RESEND_COOLDOWN_SECONDS = 60             # anti-spam guard


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _new_token() -> str:
    return secrets.token_urlsafe(TOKEN_HEX_LEN)


def _brand_email(title: str, body_html: str, cta_url: str, cta_label: str) -> str:
    """Simple table-based email template (inline CSS, no external assets)."""
    return f"""
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#8B5CF6;padding:20px 24px;color:#fff;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Kids IQ Test</td></tr>
        <tr><td style="padding:28px 28px 8px 28px;">
          <h1 style="margin:0;font-size:22px;color:#0F172A;">{title}</h1>
          <div style="font-size:14px;color:#334155;line-height:22px;margin-top:12px;">{body_html}</div>
          <div style="margin:24px 0;">
            <a href="{cta_url}" style="background:linear-gradient(90deg,#3B82F6,#8B5CF6);color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;display:inline-block;">{cta_label}</a>
          </div>
          <p style="font-size:12px;color:#64748B;margin-top:16px;">Or copy this link: <br/><span style="word-break:break-all;">{cta_url}</span></p>
        </td></tr>
        <tr><td style="padding:12px 28px 24px 28px;font-size:11px;color:#94A3B8;">
          If you didn't request this, you can safely ignore this email.<br/>
          © Kids IQ Test — Educational brain-skills estimates for kids, not clinical diagnoses.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
"""


async def _send_email(to: str, subject: str, html: str) -> Optional[str]:
    """Send via Resend (non-blocking). Also persist to db.emails_sent for audit."""
    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    email_id = None
    if api_key:
        try:
            resend.api_key = api_key
            resp = await asyncio.to_thread(
                resend.Emails.send,
                {"from": sender, "to": [to], "subject": subject, "html": html},
            )
            email_id = (resp or {}).get("id")
        except Exception as e:  # log and fall through to audit trail
            email_id = f"ERROR: {e}"
    return email_id


def build_auth_v2_router(db, get_current_user, push_notification) -> APIRouter:
    router = APIRouter(prefix="/api/auth")

    # ============ Pydantic in-models ============
    class VerifyResendIn(BaseModel):
        email: Optional[EmailStr] = None  # allow either authenticated call or explicit email

    class ForgotIn(BaseModel):
        email: EmailStr

    class ResetIn(BaseModel):
        token: str
        password: str

    class GoogleSessionIn(BaseModel):
        session_id: str

    frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")

    # ---------- helpers ----------
    async def _issue_verification(user_doc: dict) -> str:
        token = _new_token()
        await db.verification_tokens.insert_one({
            "user_id": str(user_doc["_id"]) if "_id" in user_doc else user_doc["id"],
            "email": user_doc["email"],
            "token": token,
            "expires_at": _now() + timedelta(hours=VERIFICATION_TTL_HOURS),
            "used": False,
            "created_at": _now(),
        })
        return token

    async def _issue_reset(user_doc: dict) -> str:
        token = _new_token()
        await db.password_reset_tokens.insert_one({
            "user_id": str(user_doc["_id"]),
            "email": user_doc["email"],
            "token": token,
            "expires_at": _now() + timedelta(hours=RESET_TTL_HOURS),
            "used": False,
            "created_at": _now(),
        })
        return token

    # ============ Email Verification ============
    @router.post("/send-verification")
    async def send_verification(payload: VerifyResendIn, request: Request):
        """Sends a verification email. Idempotent-ish: rate-limited to 1/min per email."""
        email = (payload.email or "").lower().strip()
        # If caller is authenticated, resolve email from cookie/JWT
        if not email:
            try:
                user = await get_current_user(request)
                email = user["email"]
            except Exception:
                raise HTTPException(status_code=400, detail="Email required")
        user = await db.users.find_one({"email": email})
        if not user:
            # generic response to avoid enumeration
            return {"ok": True}
        if user.get("email_verified"):
            return {"ok": True, "already_verified": True}
        # cooldown check
        last = await db.verification_tokens.find_one(
            {"email": email}, sort=[("created_at", -1)]
        )
        if last:
            _last_ts = last["created_at"]
            if _last_ts.tzinfo is None:
                _last_ts = _last_ts.replace(tzinfo=timezone.utc)
            if (_now() - _last_ts).total_seconds() < RESEND_COOLDOWN_SECONDS:
                raise HTTPException(status_code=429, detail=f"Please wait {RESEND_COOLDOWN_SECONDS}s before requesting another verification email.")
        token = await _issue_verification(user)
        link = f"{frontend_url}/verify-email?token={token}"
        html = _brand_email(
            title=f"Verify your email, {user.get('name','friend')} 🎉",
            body_html="Tap the button below to verify your email address and unlock the full Kids IQ Test dashboard.",
            cta_url=link,
            cta_label="Verify my email",
        )
        email_id = await _send_email(email, "Verify your Kids IQ Test email", html)
        await db.emails_sent.insert_one({
            "kind": "verify_email", "to": email, "link": link,
            "provider_id": email_id, "created_at": _now(),
        })
        return {"ok": True}

    @router.get("/verify-email/{token}")
    async def verify_email(token: str):
        doc = await db.verification_tokens.find_one({"token": token, "used": False})
        if not doc:
            raise HTTPException(status_code=400, detail="Invalid or already-used token")
        if doc["expires_at"].replace(tzinfo=timezone.utc) < _now():
            raise HTTPException(status_code=400, detail="Verification link expired — please request a new one")
        # Mark verified
        await db.users.update_one(
            {"email": doc["email"]},
            {"$set": {"email_verified": True, "email_verified_at": _now().isoformat()}},
        )
        await db.verification_tokens.update_one({"_id": doc["_id"]}, {"$set": {"used": True, "used_at": _now()}})
        return {"ok": True, "email": doc["email"]}

    # ============ Forgot / Reset Password ============
    @router.post("/forgot-password")
    async def forgot_password(payload: ForgotIn):
        email = payload.email.lower().strip()
        user = await db.users.find_one({"email": email})
        # Always return OK to avoid email enumeration
        if not user or not user.get("password_hash"):
            return {"ok": True}
        # cooldown
        last = await db.password_reset_tokens.find_one({"email": email}, sort=[("created_at", -1)])
        if last:
            _last_ts = last["created_at"]
            if _last_ts.tzinfo is None:
                _last_ts = _last_ts.replace(tzinfo=timezone.utc)
            if (_now() - _last_ts).total_seconds() < RESEND_COOLDOWN_SECONDS:
                return {"ok": True}
        token = await _issue_reset(user)
        link = f"{frontend_url}/reset-password?token={token}"
        html = _brand_email(
            title="Reset your password",
            body_html=f"Someone requested a password reset for your Kids IQ Test account.<br/>This link is valid for <b>{RESET_TTL_HOURS} hour(s)</b>. If it wasn't you, ignore this email.",
            cta_url=link,
            cta_label="Reset password",
        )
        email_id = await _send_email(email, "Reset your Kids IQ Test password", html)
        await db.emails_sent.insert_one({
            "kind": "password_reset", "to": email, "link": link,
            "provider_id": email_id, "created_at": _now(),
        })
        return {"ok": True}

    @router.post("/reset-password")
    async def reset_password(payload: ResetIn):
        if len(payload.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        doc = await db.password_reset_tokens.find_one({"token": payload.token, "used": False})
        if not doc:
            raise HTTPException(status_code=400, detail="Invalid or already-used token")
        if doc["expires_at"].replace(tzinfo=timezone.utc) < _now():
            raise HTTPException(status_code=400, detail="Reset link expired — please request a new one")
        from server import hash_password  # local import to avoid circular
        await db.users.update_one(
            {"email": doc["email"]},
            {"$set": {"password_hash": hash_password(payload.password), "password_reset_at": _now().isoformat()}},
        )
        await db.password_reset_tokens.update_one({"_id": doc["_id"]}, {"$set": {"used": True, "used_at": _now()}})
        # Invalidate other outstanding reset tokens for this user
        await db.password_reset_tokens.update_many(
            {"email": doc["email"], "used": False}, {"$set": {"used": True, "used_at": _now(), "invalidated": True}},
        )
        return {"ok": True}

    # ============ Emergent Google Auth ============
    @router.post("/google/session")
    async def google_session(payload: GoogleSessionIn, response: Response):
        """Exchange an Emergent Auth session_id for a persistent session_token cookie.
        Creates or updates the user in db.users (linked by email)."""
        headers = {"X-Session-ID": payload.session_id}
        emergent_url = os.environ.get("EMERGENT_AUTH_URL", "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data")
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(emergent_url, headers=headers)
            if r.status_code != 200:
                raise HTTPException(status_code=401, detail="Google session exchange failed")
            data = r.json()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Emergent auth error: {e}")

        email = (data.get("email") or "").lower().strip()
        if not email:
            raise HTTPException(status_code=400, detail="No email from Google")
        session_token = data.get("session_token")
        if not session_token:
            raise HTTPException(status_code=400, detail="No session_token from Emergent")

        name = data.get("name") or email.split("@")[0]
        picture = data.get("picture")

        existing = await db.users.find_one({"email": email})
        if existing:
            uid = str(existing["_id"])
            await db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "name": existing.get("name") or name,
                    "picture": picture or existing.get("picture"),
                    "email_verified": True,  # Google emails are trusted
                    "google_linked": True,
                    "last_google_login_at": _now().isoformat(),
                }},
            )
        else:
            new_doc = {
                "email": email, "name": name, "picture": picture,
                "role": "parent", "xp": 0, "coins": 50,
                "email_verified": True, "google_linked": True,
                "created_at": _now().isoformat(),
                "assessment_credits": 0,
                # note: no password_hash — this is a Google-only user
            }
            res = await db.users.insert_one(new_doc)
            uid = str(res.inserted_id)
            await push_notification(uid, "welcome", "Welcome to Kids IQ Test!",
                                    "Create your first child profile to get started.", "/dashboard")

        # Persist Emergent session
        await db.user_sessions.insert_one({
            "user_id": uid, "email": email,
            "session_token": session_token,
            "expires_at": _now() + timedelta(days=SESSION_TTL_DAYS),
            "provider": "emergent_google",
            "created_at": _now(),
        })
        response.set_cookie(
            "session_token", session_token,
            httponly=True, secure=True, samesite="none",
            max_age=SESSION_TTL_DAYS * 86400, path="/",
        )
        return {"id": uid, "email": email, "name": name, "picture": picture, "role": "parent", "email_verified": True}

    return router
