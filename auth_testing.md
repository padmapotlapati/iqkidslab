# Auth v2 Testing Playbook — Kids IQ Test

## Auth flows to test
1. Email + Password register → creates user with `email_verified: False`, sends verification email via Resend
2. Login with unverified email → succeeds, but `/api/auth/me` returns `email_verified:false`
3. Verified user can access `/api/children`, `/api/sessions/start`, etc.
4. UNverified user hits 403 with `email_verification_required` on protected endpoints
5. `POST /api/auth/resend-verification` re-sends the email (rate-limited to once per 60s)
6. `GET /api/auth/verify-email/{token}` flips `email_verified:true`
7. `POST /api/auth/forgot-password` with valid email → sends reset email (returns generic OK regardless of email existence to avoid enumeration)
8. `POST /api/auth/reset-password` with valid token → resets password, invalidates token
9. Google Sign-In: frontend redirects to `https://auth.emergentagent.com/?redirect=...`, comes back with `#session_id=`, backend exchanges via `/api/auth/google/session`, sets HttpOnly `session_token` cookie AND creates/updates user with `email_verified: True` (Google emails are trusted)
10. `/api/auth/me` accepts either `access_token` (JWT — email/password) OR `session_token` (Emergent Google Auth)
11. Child profiles stay linked via `parent_id` regardless of auth method

## Test data
- Email/password parent: `parent@test.com` / `Parent@12345` (existing, marked as `email_verified: true` post-migration)
- Fresh unverified user: register `TEST_verify_<epoch>@example.com`
- Emergent Google Auth test: use any browser-flow session_id captured from Emergent auth flow

## Endpoints to exercise
- POST /api/auth/register — includes email verification send
- POST /api/auth/login — unchanged
- POST /api/auth/resend-verification (authenticated)
- GET /api/auth/verify-email/{token} — public
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/google/session — public, exchanges session_id
- GET /api/auth/me — accepts either cookie

## Frontend routes to test
- `/login` — has "Continue with Google" button + "Forgot password?" link
- `/register` — has "Continue with Google" button
- `/forgot-password` — form
- `/reset-password?token=<token>` — form
- `/verify-email?token=<token>` — landing page that auto-verifies
- ProtectedRoute redirects unverified users to `/verify-email-required` (banner + resend button)

## Regression checklist
- Existing dashboards, assessments, brain games, reports, PDF, XP, coins, badges, streaks, rewards must not be affected
- `/api/auth/me` still returns same shape + adds `email_verified`
