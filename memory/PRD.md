# Kids IQ Test - Product Requirements Document

## Original Problem Statement
Build a world-class AI-powered web application called "Kids IQ Test" — a premium, colorful, interactive platform where parents help children aged 3–16 complete engaging brain-skills assessments. Results are educational cognitive skill estimates and learning insights (NOT a clinical IQ diagnosis).

## Architecture
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn UI + Framer Motion (via CSS) + Recharts
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT + bcrypt
- **AI**: Claude Sonnet 4.5 via `emergentintegrations.llm.chat` (Emergent Universal LLM Key)
- **Auth**: JWT-based custom auth with httpOnly cookies (access + refresh)

## User Personas
- **Parent** (primary): Wants to explore child's cognitive strengths in a fun, non-clinical way
- **Child** (3-16): Completes engaging multiple-choice assessments guided by parent
- **Admin**: Platform operator

## Core Requirements (Static)
- Multi-age assessments (3-5, 6-8, 9-12, 13-16)
- AI-generated personalized reports (positive, encouraging, non-clinical)
- Parent dashboard with children profiles, XP/coins/stars/badges
- Progress tracking, brain-skill radar chart
- Light/dark mode
- Playful design (Disney-quality, Duolingo-style gamification, Apple-clean, Material-inspired)

## Implementation Status (as of 2026-02-24)
### Done ✅
- JWT auth (register / login / logout / me) with httpOnly cookies
- Seeded test parent & admin accounts
- Child CRUD with age → age_group derivation
- Question bank (37 questions across 4 age groups, 5 skill categories)
- Assessment submit + AI report via Claude Sonnet 4.5 (with graceful fallback)
- Skill radar chart + skill breakdown (Recharts)
- Dashboard stats (children, assessments, XP, coins)
- Home page: hero, age cards, how-it-works, features, benefits, testimonials, FAQ, footer
- Light/dark theme toggle with persistence
- Confetti + micro animations on high scores
- Full end-to-end flow tested (backend 25/25 pytest, frontend E2E via Playwright)

## Prioritized Backlog
### P1 (Next iteration)
- Certificates page + downloadable PDF certificate
- Standalone "Brain Games" section with quick daily challenges
- Progress line-chart (assessment scores over time)
- i18n implementation (Telugu + Hindi translations)
- Password reset flow

### P2
- Google/OTP social login
- Stripe pricing/subscription
- Notification center
- Blog + About + Pricing + Contact static pages
- Voice guidance (text-to-speech) for younger kids
- Adaptive difficulty engine

## Test Credentials
See `/app/memory/test_credentials.md`
