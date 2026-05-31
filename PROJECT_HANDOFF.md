# Project Handoff

## What this is

`detailing-crm-mvp` is the first working CRM MVP for an auto detailing business.

It already includes:

- Supabase schema and seed files
- React + Vite frontend
- Supabase auth
- dashboard
- leads list and lead detail panel
- clients list
- services list
- settings page
- lead status update flow

## Current Supabase project

- Project ref: `knegynsaxsufwfbgqmoq`
- Region: `eu-west-1`

The real `.env` on the desktop machine points to the active Supabase project.

## Important local files

- [README.md](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/README.md)
- [PROJECT_HANDOFF.md](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/PROJECT_HANDOFF.md)
- [schema.sql](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/supabase/schema.sql)
- [seed.sql](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/supabase/seed.sql)
- [App.jsx](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/src/App.jsx)
- [styles.css](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/src/styles.css)
- [supabase.js](C:/Users/Asus/Documents/New project 2/detailing-crm-mvp/src/supabase.js)

## Current state

- The app runs locally with `npm.cmd run dev`
- Production build passes with `npm.cmd run build`
- Supabase has live demo data
- RLS was relaxed for MVP reads so the interface can show demo data immediately
- A profile row was inserted manually for the current owner account

## Known MVP compromises

- Read policies are intentionally broad for MVP speed
- There is no tenant isolation yet
- There is no public client form inside this app yet
- There is no create-lead form yet
- There is no notes timeline UI yet
- There is no n8n webhook integration yet

## Recommended next steps

1. Add `new lead` form inside CRM
2. Add `lead events` timeline
3. Add create/update follow-up date UI
4. Add role-aware visibility for `owner`, `manager`, `detailer`
5. Add public client request form
6. Connect first n8n workflow:
   - new lead -> Telegram alert
   - follow_up_at -> reminder

## Moving to another machine

1. Clone the repo
2. Create `.env` from `.env.example`
3. Put the real Supabase URL and publishable key into `.env`
4. Run:

```bash
npm install
npm run dev
```

## Supabase reminder

Do not store or commit the secret key.

Only the publishable key belongs in the frontend `.env`.
