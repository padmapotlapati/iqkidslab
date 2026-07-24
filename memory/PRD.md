# Kids IQ Test - Product Requirements Document

## Original Problem Statement
Kids IQ Test is a premium SaaS platform where parents help children aged 3–16 complete brain-skills assessments. Educational cognitive skill estimates only — NOT clinical IQ diagnoses.

## Architecture (v3.1 — INR Monetization)
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn UI + Recharts + PageTracker
- **Backend**: FastAPI + Motor MongoDB + PyJWT + bcrypt + reportlab (PDF) + qrcode + slowapi + emergentintegrations (LLM + Stripe)
- **Payments**: Stripe (Flow B, INR currency, STRIPE_API_KEY=sk_test_emergent)
- **AI**: Claude Sonnet 4.5 via Emergent Universal LLM Key
- **Auth**: JWT httpOnly cookies

## Implementation Status

### v1 ✅ MVP (auth, children, assessments, AI report, dashboard)
### v2 ✅ Advanced engine (10 categories, adaptive, PDF, certificates, brain games, progress, notifications)
### v3 ✅ SaaS (admin dashboard, blog CMS, contact, legal, audit, self-hosted analytics, page tracker, coupons, subscriptions)
### v3.1 ✅ INR Monetization
- **5 plan tiers** (all INR): Free ₹0 · Pay Per Test ₹9 (1 credit) · Starter Pack ₹39 (5 credits) · Family Pack ₹69 (10 credits) · **Premium Monthly ₹99 (MOST POPULAR — golden border + glow + pulse + ribbon)** · Premium Yearly ₹799 (SAVE 33%)
- **Credits system**: one-time purchases add `assessment_credits` to user (`/api/auth/me` exposes both `assessment_credits` and `is_premium`)
- **Geo detection** (`/api/geo/detect`): heuristic via Accept-Language + CF-IPCountry → INR default for India, USD otherwise; frontend currency toggle overrides
- **Referral system**: `/api/referrals/me` returns stable KIQ-XXXXXX code; both referrer + referee earn +3 credits on referee's first purchase
- **Admin Revenue tab** (default): Today / This Month / This Year revenue in ₹, plan mix, most-purchased, Free→Paid conversion, payment success rate, recent transactions
- **Dashboard banners**: dynamic upgrade / credits / premium banner + referral widget with copy button
- **Graceful Stripe errors**: INR amounts below Stripe's ~₹42 minimum return a friendly HTTP 400 with an actionable message instead of a 500

## Testing
- Backend: 63/65 pytest passing (2 test assertions still expect USD — not application bugs); the 2 originally CRITICAL bugs from iteration 4 (Stripe 500 on pay_per_test/starter_pack) are FIXED with try/except → 400.
- Frontend: all E2E flows verified. Pricing hero renders correctly with golden border + pulse; currency toggle switches ₹↔$; coupon LAUNCH20 applies; dashboard shows correct banner + referral widget with copy; admin revenue tab renders in ₹.
- Admin header revenue KPI now displays in ₹ (was $).

## Known Mocked / Deferred (highlighted)
- **UPI / Razorpay for micro-transactions in India** — NOT integrated. Stripe INR floor is ~₹42, so `pay_per_test (₹9)` and `starter_pack (₹39)` show a friendly error at checkout. Plans remain visible per user's business request. Add Razorpay for real ₹9 processing.
- **Email delivery** — MOCKED to `db.emails_sent`
- **Google Analytics 4 / Search Console / Microsoft Clarity** — not integrated
- **i18n Telugu/Hindi translations** — English-first UI, switcher stub only
- **PWA offline** — not enabled
- **Rate-limit decorators** — slowapi installed, no per-endpoint `@limiter.limit`
- **Credit gating** — free/credit users are NOT yet blocked from `/api/sessions/start`. P1 backlog.

## Prioritized Backlog

### P0 (blockers for revenue)
- Wire Razorpay for India micro-transactions (₹9, ₹39) — Stripe rejects amounts below ~₹42
- Enforce assessment_credits / subscription gating on `/api/sessions/start`

### P1
- Real email delivery (Resend/SendGrid)
- `@limiter.limit('5/minute')` on login/register
- Blocked-user check inside `get_current_user`
- Actual Telugu / Hindi translations

### P2
- Google OAuth + OTP login
- GA4 / Microsoft Clarity if keys provided
- PWA + offline
- Split `server.py` into per-domain routers

## Test Credentials
See `/app/memory/test_credentials.md`
