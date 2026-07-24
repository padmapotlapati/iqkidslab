# Kids IQ Test - Product Requirements Document

## Original Problem Statement
Kids IQ Test is a premium SaaS platform where parents help children aged 3–16 complete brain-skills assessments. Results are educational cognitive skill estimates and learning insights — NOT clinical IQ diagnoses.

## Architecture (v3 — Production SaaS)
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn UI + Recharts + Framer Motion (CSS)
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT + bcrypt + reportlab (PDF) + qrcode + slowapi (rate-limit ready) + emergentintegrations (LLM + Stripe)
- **Payments**: Stripe (Flow B via emergentintegrations, STRIPE_API_KEY=sk_test_emergent)
- **AI**: Claude Sonnet 4.5 via Emergent Universal LLM Key
- **Auth**: JWT httpOnly cookies (access + refresh)
- Note: Part 3 requested Node/PostgreSQL/Razorpay/GA4/Clarity. Environment mandates FastAPI + MongoDB, so equivalent capabilities were built on the mandated stack (self-hosted analytics + Stripe). Razorpay/GA4/Clarity keys were not provided.

## Implementation Status

### v1 ✅ (Part 1 - MVP)
JWT auth, child CRUD, basic assessments, AI report, dashboard, playful landing.

### v2 ✅ (Part 2 - Advanced engine)
10-category adaptive scoring, weighted score, PDF report, certificates with QR, brain games (3), progress charts, notifications.

### v3 ✅ (Part 3 - Commercial SaaS)
- **Super Admin Dashboard** (`/admin`): 8 KPIs (parents/children/assessments/certs/views/uniques/active7d/revenue) + signup line chart + traffic bar chart + 6 tabs (Users / Blog / Coupons / Questions / Messages / Audit)
- **User Management**: search, block/unblock (blocked user login → 403), delete cascades, CSV export
- **Question Management**: view all 79 builtin + custom, add/edit/delete custom, CSV export
- **Payments (Stripe)**: `/pricing` with Free/Premium Monthly ($9.99) / Premium Yearly ($89.99 - BEST VALUE) plans, checkout via `/api/payments/checkout`, webhook `/api/webhook/stripe`, `/payment/success` polling, subscription persistence, payment history
- **Coupons**: unique-indexed codes with redemption tracking + admin CRUD + public `/api/coupons/{code}` lookup
- **Blog CMS**: admin publish/delete + public `/blog` list + `/blog/:slug` detail with view counter + search
- **Legal**: `/about`, `/contact` (form → DB), `/privacy`, `/terms`, `/cookies`, `/disclaimer`
- **Analytics**: self-hosted page-view tracking (`PageTracker` fires on route change) + admin trend charts + top pages
- **Audit Logs**: every admin action + login persisted to `audit_logs`
- **Rate Limiting**: slowapi installed and wired
- **Complete Brain Games**: 7/7 playable (Memory Match, Reaction Tap, Focus Find, Pattern Hunt, Math Dash, Word Link, Logic Flow)
- **Blocked-user gate**: `/api/auth/login` returns 403 for blocked users
- **Contact Messages**: `/api/contact` → admin Messages tab
- **Email log (MOCKED)**: outgoing emails are written to `db.emails_sent` (no actual delivery)

### Tests
- Backend: 70/71 pytest passing (backend_test.py + test_saas.py). Zero critical issues.
- Frontend: 100% of tested flows verified end-to-end.
- Fixed post-test: duplicate coupon → 400 (unique index added), coupon POST now returns id.

## Known Mocked / Deferred (marked)
- **Email delivery** is MOCKED — writes to `db.emails_sent` instead of actually sending. Add SendGrid/Resend key to enable delivery.
- **Google Analytics 4 / Search Console / Microsoft Clarity** — not integrated (no keys provided). Self-hosted analytics dashboard delivers equivalent visitor/pageview KPIs.
- **Razorpay** — Stripe used instead. Razorpay integration deferred.
- **Actual i18n translations** — UI is English-first; language switcher stub exists on child profile.
- **PWA offline support** — not enabled.
- **Rate limiting decorators** — slowapi loaded but no explicit `@limiter.limit` decorators. Add to `/auth/login` and `/auth/register` for brute-force hardening.

## Prioritized Backlog

### P1
- Wire real email delivery (Resend or SendGrid)
- Add `@limiter.limit('5/minute')` on login/register
- Blocked-user re-check inside `get_current_user` (currently only enforced at login)
- Actual Telugu / Hindi translations
- Password reset flow

### P2
- Google OAuth / OTP login
- Razorpay for India
- GA4 / Microsoft Clarity if user provides keys
- PWA + offline
- Split `server.py` into per-domain routers

## Test Credentials
See `/app/memory/test_credentials.md`
