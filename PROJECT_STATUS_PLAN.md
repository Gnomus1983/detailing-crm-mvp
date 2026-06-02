# Detailing CRM MVP - Status And Next Plan

## 1. Product Direction

We are building not a large universal CRM, but a focused, sellable mini CRM for local service businesses, starting with auto detailing.

Core positioning:
- mini CRM
- lead dispatcher
- booking + follow-up + reminders system
- detailing lead automation system

Core stack:
- React + Vite
- Supabase
- Supabase Edge Functions
- Supabase Cron
- optional n8n only if needed later
- later: Vercel deployment
- later: mobile app on top of stable web product

Business goal:
- help small businesses stop losing leads
- centralize incoming requests
- manage follow-ups
- automate reminders and alerts
- later sell this as a paid subscription product

Product shape:
- internal CRM for owner / manager / later detailer
- separate public client entry form
- automation layer through Supabase-native backend logic

This is a narrow MVP for detailing first, with later adaptation possible for:
- cleaning
- STO / repair
- tire service
- mobile service businesses
- other local service operations

## 2. Current Project State

Project path:
- `C:\Users\Iura\Documents\CRM detaling\detailing-crm-mvp-main`

Important source files:
- `PROJECT_HANDOFF.md`
- `README.md`
- `src/App.jsx`
- `src/styles.css`
- `src/crm.js`
- `supabase/schema.sql`
- `supabase/seed.sql`
- `scripts/demo-flow.mjs`

Current stage:
- internal CRM MVP is already working
- demo-ready flow is largely completed
- role-aware visibility has been started and implemented in the frontend

## 3. What Was Already Done

### Base MVP
- Supabase project is connected
- schema and seed were already applied
- auth / login works
- Dashboard works
- Leads works
- Clients works
- Services works
- Settings works
- data is read from Supabase

### Leads MVP Improvements
- New lead form added
- create / reuse client flow added
- lead creation writes to `lead_events`
- timeline / notes added in lead card
- manual note creation added
- `follow_up_at` field and UI added
- lead detail card expanded
- loading / empty / error states improved
- save feedback improved
- submit/actions disabled while saving
- cleaner labels and small UX polish added

### n8n Preparation
- `VITE_N8N_WEBHOOK_URL` support added
- `lead_created` webhook event added
- `follow_up_updated` webhook event added
- Settings page shows webhook status

### Architecture Shift
- project direction was updated away from `n8n-first`
- new target architecture is:
  - Supabase
  - Edge Functions
  - Cron
- `n8n` is now optional, not the core product layer

### Demo Preparation
- demo-like seed data improved
- believable lead timeline entries added
- automated live demo script added: `npm run demo:flow`
- full live flow was successfully verified on real Supabase session:
  - create lead
  - create/reuse client
  - change status
  - add note
  - set follow-up
  - verify `lead_events`
  - verify webhook events

### Role Layer
- role-aware visibility started
- frontend now moves toward:
  - `owner`
  - `manager`
  - `detailer`

## 4. Important Recovery Note

During role work, `src/App.jsx` became technically corrupted at the byte level and had to be reconstructed.

What was done:
- `App.jsx` was restored
- role-aware visibility was rebuilt into the restored file
- build was verified again successfully

Current status after recovery:
- project builds successfully
- `npm run build` passes

## 5. Current Functional Status

### Done
- internal CRM MVP works
- demo-ready leads flow works
- timeline / notes / follow-up work
- webhook wiring works
- demo flow was verified
- frontend role layer has been added

### In Progress
- role-aware visibility needs final real-world QA with demo users/data
- public client entry form is implemented in code but still needs live verification after schema update
- architecture is being shifted toward Supabase-native automation
- first Edge Function alert scaffold has been added to the project
- follow-up reminder Edge Function scaffold has been added to the project

### Not Started Yet
- daily digest workflow through Cron / Edge Functions
- reactivation flow
- post-service follow-up flow
- SaaS tenant model
- subscription model
- mobile app layer

## 6. Role Model We Are Moving Toward

### Owner
- sees everything
- full internal CRM access

### Manager
- sees leads / clients / services
- can create leads
- can change statuses
- can manage follow-up
- can add notes

### Detailer
- should only see assigned work
- should not manage the full pipeline
- in current MVP direction:
  - can view assigned leads
  - cannot create leads
  - cannot change follow-up
  - cannot add manager notes

### Client
- does not log into CRM
- later uses separate public form / status layer

## 7. Where We Are Right Now

We are no longer at the "start building the MVP" stage.

We are now at this stage:
- internal CRM demo is mostly ready
- automation integration has started
- role layer has started
- next step is to turn this from a good demo into a real sellable workflow product

In practical terms:
- the internal back-office part is already strong enough to show
- the next big value jump comes from public lead intake + automation

## 8. Strategic Direction

The product direction is:

1. Build a strong internal CRM for small service businesses
2. Add a public lead intake layer
3. Add automations and reminders inside Supabase-native backend logic
4. Package it as a sellable system
5. Later turn it into a reusable SaaS product
6. Later optionally add a mobile app

This means:
- web first
- workflow first
- automation first
- SaaS later
- mobile later

## 9. Roadmap

| Stage | Goal | Status | Notes |
|---|---|---|---|
| 1 | Stabilize internal CRM MVP | Done | Base CRM is working |
| 2 | Add New Lead flow | Done | Create / reuse client works |
| 3 | Add timeline / notes / follow-up | Done | Lead card now has workflow history |
| 4 | Prepare initial webhook/event layer | Done | Webhook wiring exists, but is no longer the main architecture target |
| 5 | Demo polish | Done | Better UX, better demo data, live flow verified |
| 6 | Add role-aware visibility | In progress | Frontend role layer added, needs final QA |
| 7 | Build public client entry form | In progress | Implemented in code, pending live verification |
| 8 | Add Supabase-native automation flows | Next | Edge Functions + Cron for alerts, reminders, digest |
| 9 | Package as sellable product | Later | Demo story + offer + onboarding |
| 10 | Move toward SaaS model | Later | Multi-business structure |
| 11 | Mobile app | Later | Only after stable web CRM + stable backend automations |

## 10. Recommended Immediate Next Steps

### Step 1. Finalize role-aware visibility
- verify owner UX
- verify manager UX
- verify detailer UX
- prepare demo users
- prepare assigned leads for detailer

### Step 2. Build public client entry form
- separate public page without CRM login
- creates lead in Supabase
- supports source/channel
- suitable for landing / Instagram / Telegram funnels

Current note:
- public form is already implemented
- next sub-step is live verification after applying updated schema

### Step 3. Build first real product-native automation workflows
- new lead -> Edge Function alert
- follow_up_at -> reminder via Cron
- daily digest via Cron

### Step 4. Prepare stronger sales demo
- one believable end-to-end scenario
- incoming request
- manager sees lead
- follow-up is scheduled
- reminder is triggered
- client is booked

## 11. Suggested Execution Order

Recommended order from here:

1. Finish role QA
2. Build public client entry form
3. Add Edge Function alert workflow
4. Add follow-up reminder workflow
5. Add daily digest
6. Polish sales demo
7. Start thinking about reusable SaaS structure
8. Prepare mobile app layer only after stable web + automation core

## 12. Short Plain Summary

What we are building:
- a focused CRM + automation system for detailing businesses

What is already true:
- the internal CRM already works
- lead workflow already works
- follow-up workflow already works
- webhook wiring already works
- demo flow already works

What is happening now:
- role-aware visibility is being completed

What comes next:
- public lead intake
- automations
- sellable packaging
- SaaS path after product validation

## 13. Resume Prompt For Future Codex Session

If continuing later on another computer, use this context:

"Open the project `detailing-crm-mvp-main`. Read `PROJECT_HANDOFF.md` and `PROJECT_STATUS_PLAN.md`. This is a detailing CRM MVP built with React + Vite + Supabase + n8n. Internal CRM demo is mostly ready. New lead form, timeline/notes, follow_up_at, webhook wiring, demo flow verification, and role-aware visibility are already implemented. Current next priority is to finish QA of roles and then build the public client entry form, followed by n8n workflows for Telegram alerts, follow-up reminders, and daily digest. Keep the product narrow, sellable, and MVP-level. Do not turn it into a large universal CRM." 
