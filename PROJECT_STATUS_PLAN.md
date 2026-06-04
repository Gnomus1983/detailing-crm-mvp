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
- `CODEX_PACKAGE/ARCHITECTURE.md`
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

### Legacy Webhook Compatibility
- legacy `VITE_N8N_WEBHOOK_URL` compatibility still exists
- `lead_created` webhook event exists
- `follow_up_updated` webhook event exists
- Settings page shows automation webhook status

### Architecture Shift
- project direction was updated away from `n8n-first`
- new target architecture is:
  - Supabase
  - Edge Functions
  - Cron
- `n8n` is now optional, not the core product layer

### Supabase-Native Automation Live Status
- duplicate `clients.phone` data was cleaned in the live project
- latest schema was applied to the live Supabase project
- public intake flow was verified live
- Edge Functions were deployed live:
  - `lead-alert`
  - `follow-up-reminder`
  - `daily-digest`
- all three passed live invocation after secrets were configured
- Telegram alerts and digest were confirmed working

### Hardening Progress
- live RLS was tightened for `clients`, `services`, `leads`, `lead_events`, `attachments`, and `automation_runs`
- public intake now has a minimal anti-spam layer
- public intake was re-verified live after hardening
- deployed automation was re-verified live after hardening
- Romanian localization was pushed further across:
  - CRM UI
  - Telegram automation templates
  - live demo data
  - role copy for `owner / manager / detailer`

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
- public intake works live
- Supabase-native automation works live

### In Progress
- role-aware visibility was verified through the single-user live QA path
- legacy `n8n` leftovers were reduced to compatibility-only references
- role-aware visibility needs re-verification against the stricter live policies
- access control can still be strengthened further for future SaaS-grade isolation
- Romanian localization should still be checked manually screen-by-screen during role QA
- because the live project currently has only one real profile, a single-user role QA path has been prepared

### Not Started Yet
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
4. Build a clear public-facing site and visual product layer around it
5. Add onboarding / usage instructions
6. Add QA / testing discipline and protection work
7. Package it as a sellable system
8. Later turn it into a reusable SaaS product
9. Later optionally add a mobile app

This means:
- web first
- workflow first
- automation first
- clarity first
- safety first
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
| 6 | Add role-aware visibility | Done | Verified through single-user live QA path |
| 7 | Build public client entry form | Done | Implemented and verified live |
| 8 | Add Supabase-native automation flows | Done | Edge Functions deployed and verified live |
| 9 | Strengthen UX / visual system | Active | CRM and public surface should feel cleaner, more premium, and easier to show |
| 10 | Build public-facing site layer | Active | Request flow, login experience, and visual presentation need to feel like a real product |
| 11 | Create onboarding / usage layer | Active | Instructions, roles, and usage path must be documented clearly |
| 12 | Create QA / testing discipline | Active | Pre-demo, post-change, and role-based checks must be repeatable |
| 13 | Keep security / protection active | Active | RLS, anti-spam, and safe operations remain a standing stream |
| 14 | Package as sellable product | Active | Demo story + offer + onboarding + visual confidence |
| 15 | Move toward SaaS model | Later | Multi-business structure |
| 16 | Mobile app | Later | Only after stable web CRM + stable backend automations |

## 10. Recommended Immediate Next Steps

### Step 1. Strengthen UX / visual system
- refine login
- refine public request form
- refine dashboard
- refine leads list and lead detail card
- align visual language with a clearer premium product feel

### Step 2. Strengthen public-facing product layer
- make public request and entry flow cleaner
- make login and first screen feel safer and more premium
- treat the product as both CRM and public-facing workflow system

### Step 3. Build onboarding / usage layer
- create user guide
- create roles and access guide
- create QA checklist
- explain how CRM is used in real work

### Step 4. Keep hardening active
- keep RLS strong
- keep anti-spam active
- maintain live automation safety
- keep safety and protection visible in the plan, not hidden in the background
- use `CODEX_PACKAGE/SECURITY_AUDIT.md` as current audit baseline
- keep `public-request` Edge Function as the active server-side throttle layer for public intake

### Step 5. Finalize stronger sales demo
- one believable end-to-end scenario
- incoming request
- manager sees lead
- follow-up is scheduled
- reminder is triggered
- client is booked

### Step 6. Keep QA discipline explicit
- repeatable smoke tests
- role verification
- pre-demo verification
- post-change verification

### Step 7. Keep architecture written down
- use `CODEX_PACKAGE/ARCHITECTURE.md` as current source of truth
- update it when core architecture changes

## 11. Suggested Execution Order

Recommended order from here:

1. Strengthen UX / visual system
2. Strengthen public-facing product layer
3. Build onboarding / usage layer
4. Keep QA discipline explicit
5. Keep hardening active
6. Finalize sales demo
7. Start thinking about reusable SaaS structure
8. Prepare mobile app layer only after stable web + automation core

## 12. Short Plain Summary

What we are building:
- a focused CRM + automation + intake workflow product for detailing businesses

What is already true:
- the internal CRM already works
- lead workflow already works
- follow-up workflow already works
- webhook wiring already works
- demo flow already works
- public intake works live
- Telegram automations work live

What is happening now:
- the next product step is not a new technical feature first
- the architecture is now formally documented
- the next product step is UX / visual strengthening
- public-facing product clarity must be improved
- onboarding / usage documentation must be created
- QA discipline must be made explicit
- hardening remains active in parallel

What comes next:
- UX / visual system
- public-facing product layer
- onboarding / usage layer
- QA / testing discipline
- sellable packaging
- SaaS path after product validation

## 13. Resume Prompt For Future Codex Session

If continuing later on another computer, use this context:

"Open the project `detailing-crm-mvp-main`. Read `PROJECT_HANDOFF.md`, `PROJECT_STATUS_PLAN.md`, `NEXT_TASKS.md`, `CODEX_PACKAGE/PACKAGE_INDEX.md`, and `CODEX_PACKAGE/MASTER_EXECUTION_ROADMAP_2026-06-03.md`. This is a detailing CRM MVP built with React + Vite + Supabase. The architecture has shifted away from `n8n-first` toward `Supabase + Edge Functions + Cron`. Internal CRM works, public intake works live, automation works live, role QA has already been verified through a single-user path, and the next active priorities are: strengthen the UX / visual system, strengthen the public-facing product layer, build onboarding and usage documentation, make QA/testing discipline explicit, keep safety/hardening active, and finalize the sales demo layer. Keep the product narrow, sellable, and MVP-level. Do not turn it into a large universal CRM." 
