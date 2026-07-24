# Kids IQ Test - Product Requirements Document

## Original Problem Statement
Build a world-class AI-powered web application called "Kids IQ Test" — a premium, colorful, interactive platform where parents help children aged 3–16 complete engaging brain-skills assessments. Results are educational cognitive skill estimates (NOT clinical IQ diagnosis).

## Architecture (v2 — Part 2 Extension)
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn UI + Recharts + Framer Motion (CSS)
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT + bcrypt + reportlab (PDF) + qrcode
- **AI**: Claude Sonnet 4.5 via `emergentintegrations` (Emergent LLM key)
- **Auth**: JWT httpOnly cookies (access + refresh)
- Note: Part 2 requested Node/PostgreSQL; environment mandates FastAPI/MongoDB. Feature parity delivered on the mandated stack.

## User Personas
- **Parent** — dashboard, child mgmt, view reports, download certificates
- **Child** — completes adaptive assessments guided by parent
- **Admin** — manage question bank via /api/admin/*

## Implementation Status (2026-02-24)

### v1 ✅
- JWT auth + seeded accounts
- Child CRUD + Dashboard + basic assessment + AI report + radar chart
- Light/dark theme + confetti + playful design system

### v2 ✅ (Part 2 extension)
- **10 cognitive categories**: logical_reasoning, visual_intelligence, pattern_recognition, memory, attention, processing_speed, mathematical_thinking, language_skills, creativity, problem_solving
- **Adaptive session engine**: builds balanced category-diverse sets, ramps difficulty, per-age session length (3-5: 10Q, 6-8: 12Q, 9-12/13-16: 15Q), per-question timer
- **Weighted scoring**: accuracy 40% + difficulty 25% + speed 15% + consistency 10% + attention 10% → overall %, estimated_index 80-130, percentile
- **Question bank**: 79 curated questions across 4 age groups, difficulty 1-5, question_type tagged, image/emoji support, points
- **AI report v2**: Summary, Strengths, Growth Opportunities, Daily Activities, Weekly Practice Plan, Monthly Development Goals (with graceful fallback)
- **PDF report**: `/api/assessments/{id}/pdf` — reportlab styled, KPI grid, category breakdown, AI narrative
- **Certificates**: auto-generated for score ≥ 50%, unique ID (KIQ-XXXXXXXX), QR verification, PDF download
- **Brain games**: 7 game definitions; 3 fully playable (Memory Match, Reaction Tap, Focus Find) with score persistence + XP
- **Progress page**: line chart timeline + horizontal bar chart of category strengths (Recharts)
- **Notifications**: system events (welcome, assessment_complete, achievement), bell UI with unread badge, mark-read
- **Admin**: `/api/admin/questions` GET + POST (role-gated)
- **Dashboard stats v2**: adds total_certificates + unread_notifications

### Tests
- Backend: 34/34 pytest passing (`/app/backend/tests/backend_test.py`)
- Frontend: full E2E verified (login → games → memory match → assessment → PDF download → certificates → progress)

## Prioritized Backlog

### P1 (next)
- Complete remaining 4 brain games (Pattern Hunt, Math Dash, Word Link, Logic Flow)
- Password reset flow
- Actual i18n translations (Telugu / Hindi)
- Family leaderboard + shareable achievement cards (social virality)

### P2
- Google OAuth + OTP login
- Stripe pricing / subscriptions
- Voice guidance TTS for younger kids
- Adaptive difficulty ramp within a single session (currently balanced-but-not-live-adaptive)
- Split server.py into per-domain routers (auth/children/sessions/games/certificates/notifications/admin)
- Blog + About + Contact + Pricing static pages

## Test Credentials
See `/app/memory/test_credentials.md`
