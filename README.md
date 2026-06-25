# Detailing CRM MVP

Vertical CRM for auto services in Moldova: detailing, car wash, tire service, small auto studios, and light auto-service teams.

## Stack

- Supabase Free
- React + Vite
- Supabase Edge Functions + Cron
- Vercel Free

## Product Positioning

- CRM for detailing, car washes, tire service, and auto studios
- not just booking: lead control, status flow, payments, before/after photos, and repeat visits
- local Moldova fit: Russian/Romanian operator context, Telegram-first loop, human onboarding
- sales motion is guided onboarding, not pure self-service only

## First setup

1. Create a new Supabase project.
2. Open the SQL Editor.
3. Run [supabase/schema.sql](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/supabase/schema.sql).
4. Run [supabase/seed.sql](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/supabase/seed.sql) if you want demo data.

## Local app setup

1. Copy `.env.example` to `.env`
2. Fill in the real Supabase URL and publishable key
3. If Google OAuth is used on a live domain, set `VITE_AUTH_REDIRECT_URL` to the final app URL
4. For stable smoke tests, explicitly set demo accounts in `.env`:
   - `VITE_TEST_EMAIL` / `VITE_TEST_PASSWORD`
   - `MANAGER_TEST_EMAIL` / `MANAGER_TEST_PASSWORD`
   - `OWNER_TEST_EMAIL` / `OWNER_TEST_PASSWORD`
   - `CREATOR_TEST_EMAIL` / `CREATOR_TEST_PASSWORD`
5. Run:

```bash
npm install
npm run dev
```

## Project handoff

See [PROJECT_HANDOFF.md](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/PROJECT_HANDOFF.md) for the current build state and the exact next steps.

## Demo accounts

Use [CODEX_PACKAGE/DEMO_ACCOUNTS_MATRIX_2026-06-17.md](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/CODEX_PACKAGE/DEMO_ACCOUNTS_MATRIX_2026-06-17.md) as the single source of truth for demo logins and smoke-test expectations.

## Initial statuses

- `new`
- `accepted`
- `diagnostics`
- `approval`
- `scheduled`
- `in_progress`
- `waiting_client`
- `waiting_payment`
- `done`
- `paid`
- `follow_up`
- `lost`

Legacy demo/live records may still contain earlier statuses such as `contacted` or `quoted`; the UI keeps them readable while the product moves toward the more operational auto-service flow above.

## Current build focus

1. stronger vertical positioning for auto services in Moldova
2. guided onboarding flow for owners instead of pure self-serve
3. richer work-order statuses, public status experience, and before/after proof
4. creator/platform hardening before first real paid onboardings
