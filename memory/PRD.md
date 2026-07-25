# Kids IQ Test - Product Requirements Document

## Original Problem Statement
Premium SaaS for parent-supervised brain-skills assessments for kids 3–16. Educational estimates only — never clinical IQ diagnoses.

## Architecture (v4 — Engagement & Retention)
- **Frontend**: React 19 + Router 7 + Tailwind + Shadcn UI + Recharts + PageTracker
- **Backend**: FastAPI + Motor MongoDB + PyJWT + bcrypt + reportlab + qrcode + slowapi + emergentintegrations (LLM + Stripe)
- **Payments**: Stripe INR (Flow B)
- **AI**: Claude Sonnet 4.5 via Emergent Universal LLM Key

## Implementation Status
### v1 ✅ MVP · v2 ✅ Advanced engine · v3 ✅ SaaS · v3.1 ✅ INR Monetization
### v4 ✅ Engagement & Retention System
### v4.1 ✅ Age-Adaptive Brain Games Hub (2026-02)
### v4.2 ✅ Assessment & Question Bank v2 (2026-02)
### v4.3 ✅ Child Dashboard + Report v2 (2026-02)
- **Child Dashboard reordered** into 9 sections: Welcome → Level/XP/Coins/Streak stats → Today's Mission → Continue/Start Assessment → Featured Brain Games (5 gradient cards with Play Now) → Brain Skills Tests history → Achievements & Badges → Progress Overview → Daily Reward
- **Brain Games featured prominently on dashboard** (5 age-appropriate colorful cards, 1-tap play)
- **Report expanded to 12 sections**: Overall score, Category-wise Scores, Strengths, Areas for Improvement, Personalized Tips, Daily Practice Suggestions, Weekly Goals, Parent Guidance, Recommended Brain Games (3), Recommended Next Assessment (X days), XP/Levels/Badges/Progress, AI Insights
- **Free vs Premium gating**: free users see summary (hero + KPIs + radar + category + strengths + growth + next-assessment + progress) with a locked upsell card; premium users see all detailed sections + Download PDF
- **Backend PDF gating**: `GET /api/assessments/{id}/pdf` returns 403 if not premium & no credits
- **PDF enhanced**: Strengths/Areas table, Personalized Tips, Daily Practice, Weekly Goals, Parent Guidance sections added before AI Insights
- **New endpoint**: `GET /api/sessions/in-progress/{child_id}` for Continue Assessment
- Tested end-to-end (backend 6/6 + full frontend flow both tiers) — iteration_7.json
- **Fixed**: Critical bug where `/missions/{id}` returned an object shape and broke the whole Child Dashboard (silent redirect)

- **Question bank expanded 4.5×**: 330 total questions (~82 per age group, meets 75–100 spec) across 4 age groups
- **9 primary categories** per age group (9 each): Memory, Logical Reasoning, Pattern Recognition, Visual Skills, Attention & Focus, Processing Speed, Problem Solving, Math Reasoning, Language Skills + Creativity bonus
- **Difficulty tiers relative-per-age-group**: ~27 Easy / 28 Medium / 27 Hard in each age group (auto-rebalanced at import time)
- **SESSION_LENGTH = 20** for every age group
- **Adaptive session builder**: reads last 5 assessments to build `seen_ids` (minimize repetition via weighted random picking) + avg of last 3 `overall_score` to tune difficulty mix
  - avg ≥80% → 3E/8M/9H (push harder), 65-79% → 5E/9M/6H (sweet spot), 50-64% → 7E/9M/4H (balanced), <50% or first-attempt → 10E/7M/3H / 8E/8M/4H (build confidence)
- **Category balance pass** ensures all 9 primary categories are represented in each 20-question session
- **New endpoints**:
  - `GET /api/assessment/bank-stats` → returns total counts, per-age-group category & difficulty breakdown (for admin + monitoring)
  - `POST /api/sessions/start` response now includes `adaptive_meta` (avg_prior_score, prior_attempts, seen_questions, difficulty_mix)
  - `GET /api/progress/{child_id}` now includes `total_attempts`, `avg_overall_score`, `best_overall_score`, `strengths`, `growth_areas`
- **Frontend**: Assessment page shows color-coded difficulty label (Easy = green, Medium = amber, Hard = rose) at `data-testid=assessment-question-meta`
- **Design ready to scale to 200 questions/age group** with zero schema changes — bank is a Python module list; add rows and the rebalance step handles the rest
- Tested end-to-end (backend 8/8, frontend flow verified) — iteration_6.json

- Backend catalog now serves **5 curated games per age group (20 total)** with `difficulty_label` (Easy / Medium / Hard) tiers
  - Ages 3–5: Color Match · Baby Memory · Shape Sort · Copy Me · Next Color
  - Ages 6–8: Reaction Tap · Memory Match · Math Sprint · Rhyme Time · Simon Says
  - Ages 9–12: Math Dash · Number Series · Word Scramble · Memory Chain · Logic Flow
  - Ages 13–16: Math Blitz · Anagram Ace · Sequence Sage · Deep Logic · Stroop Test
- New endpoint `GET /api/games?age=<int>` auto-maps age → age_group
- New endpoint `GET /api/games/detail/{game_key}` returns full metadata (engine + variant + difficulty_label)
- `POST /api/games/score` now returns `{xp_earned, coins_earned, streak}` — awards coins, bumps streak, writes timeline entry
- 4 new frontend engines: **ColorMatch** (incl. Stroop variant), **SequenceRecall** (Simon-Says), **OddOneOut**, **WordScramble**
- `/dashboard/games` auto-filters by selected child's age and groups games under Easy / Medium / Hard sections
- Play screen shows reward badges (+XP, +Coins, streak) with confetti
- Tested end-to-end (backend 12/12, all 4 new engines verified) — iteration_5.json

- **Streaks**: current/longest/days_this_week tracking, resets after >1 day gap, active_dates array, 7/30/100-day milestones with bonus XP + coins + notification + timeline entry
- **Daily Login Rewards**: 7-day ladder [10,15,20,25,30,40,50 XP] + 5 coins/day, cannot re-claim same day (400), auto-bumps streak
- **Daily Brain Challenge**: 5 deterministic questions per (date, age_group), scored with XP + coins + streak bump, one submission/day (400 on retry)
- **Missions**: 3 weekly (3 assessments / 5 games / 3 daily challenges) + 2 monthly (10 assessments / 7-day streak) with individual XP claims + timeline entries
- **Mystery Box**: 24h cooldown, 6 random rewards (xp/coins/free credit/badge), modal celebration
- **Avatar Collection**: 12 avatars unlocked by level (Sprout, Star, Rocket, Brain, Unicorn, Dragon, Wizard, Trophy, Diamond, Crown, Sun, Galaxy), selectable if unlocked
- **Progress Levels**: 50 levels (500 XP each), 10 tier titles (Curious Sprout → Genius Squad)
- **Achievement Timeline**: chronological event feed with icons + XP annotations
- **AI Daily Practice**: Claude-generated 5-minute activity focused on child's weakest category; cached per (child, date)
- **Parent Weekly Summary**: aggregated per-child assessments/games/streak/level for the last 7 days
- **Frontend pages**: /dashboard/rewards (hub), /dashboard/timeline, /dashboard/daily-challenge
- **Dashboard integration**: orange rewards CTA banner + streak badges (🔥Nd) on each child card
- **Navbar**: added Rewards nav link

### Testing (iteration 5)
- **Backend suite blocked** on env var propagation (`REACT_APP_BACKEND_URL` not visible to pytest child process); test file `test_engagement.py` written but not executed.
- **Manual E2E via curl VERIFIED**: 8/8 key endpoints (level, streak, claim daily, duplicate 400, missions, mystery status, weekly summary, timeline) all return correct data. Screenshot of /dashboard/rewards confirms full UI renders (level card, streak card, ladder, AI suggestion, Daily Challenge + Mystery Box CTAs, avatars, missions).
- **Static code review** (all minor): no critical bugs. Fixed: added `parent_id` filter to weekly-summary aggregation for defense-in-depth. Remaining P2 nits: mission_claim reuses route function (works but re-runs counts), no rate-limit on bump/mystery, avatar-select doesn't emit timeline entry.

## Known Mocked / Deferred (highlighted)
- **Backend automated tests for engagement router** — suite is written and ready in `/app/backend/tests/test_engagement.py`; a one-line `load_dotenv()` fix will unblock execution
- **Razorpay / UPI** — still needed for ₹9/₹39 micro-transactions in India
- **Email delivery** — MOCKED to `db.emails_sent`
- **Credit / subscription gating on `/api/sessions/start`** — P0 backlog
- **Push notifications / browser notifications** — not implemented
- **Actual Telugu/Hindi translations** — English-first
- **Rate-limit decorators** — installed but not applied
- **PWA offline** — not enabled

## Prioritized Backlog

### P0 (revenue-critical)
- Razorpay for India micro-transactions
- Enforce credit / subscription gating on session start
- Fix env-var propagation in pytest so engagement suite can run

### P1
- Real email delivery (Resend / SendGrid)
- Rate-limit login/register + mystery-box/open
- Add timeline entry when avatar is selected
- Weighted mystery-box rewards (currently uniform — free credits too generous)

### P2
- Google OAuth + OTP login
- GA4 / Clarity (need keys)
- PWA + offline
- Telugu / Hindi translations
- Split server.py into per-domain routers

## Test Credentials
See `/app/memory/test_credentials.md`
