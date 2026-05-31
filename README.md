# Detailing CRM MVP

Lean MVP CRM for auto detailing businesses.

## Stack

- Supabase Free
- React + Vite + Tailwind
- n8n self-hosted
- Vercel Free

## First setup

1. Create a new Supabase project.
2. Open the SQL Editor.
3. Run [supabase/schema.sql](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/supabase/schema.sql).
4. Run [supabase/seed.sql](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/supabase/seed.sql) if you want demo data.

## Local app setup

1. Copy `.env.example` to `.env`
2. Fill in the real Supabase URL and publishable key
3. Run:

```bash
npm install
npm run dev
```

## Project handoff

See [PROJECT_HANDOFF.md](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/PROJECT_HANDOFF.md) for the current build state and the exact next steps.

## Initial statuses

- `new`
- `contacted`
- `quoted`
- `scheduled`
- `in_progress`
- `done`
- `lost`

## Next build steps

1. `leads` list
2. lead detail page
3. status updates + event logging
4. client list
5. dashboard metrics
6. n8n alerts and reminders
