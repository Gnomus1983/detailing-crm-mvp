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
- public intake works live
- Edge Functions work live for:
  - `lead-alert`
  - `follow-up-reminder`
  - `daily-digest`
- A profile row was inserted manually for the current owner account

## Known MVP compromises

- Access control still needs tightening and final QA
- There is no tenant isolation yet
- Anti-spam protection on the public form is still minimal
- Historical docs still contain some old architecture wording

## Recommended next steps

1. Finish role-aware visibility QA for `owner`, `manager`, `detailer`
2. Tighten RLS / access control
3. Add stronger anti-spam protection to the public request flow
4. Clean remaining legacy `n8n` wording and compatibility tails
5. Prepare stronger sales demo and believable walkthrough

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
