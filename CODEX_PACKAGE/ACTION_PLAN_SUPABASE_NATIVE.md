# ACTION PLAN - SUPABASE NATIVE CRM

## Main Direction

We are building a sellable mini CRM for detailing and local service businesses with this architecture:

- React + Vite
- Supabase
- Edge Functions
- Cron

This is now the primary direction.

`n8n` is no longer the core architecture.

## Main Goal

Create a CRM that:
- captures leads
- manages follow-up
- supports staff roles
- automates reminders and alerts
- can later be sold as a subscription product

## Current Stage

We already have:
- internal CRM
- lead flow
- timeline / notes
- follow-up
- public request form
- role-aware visibility started

Now we need to turn this into a more product-native system.

## Stage A. Stabilize Current CRM

### A1. Role QA
- verify owner
- verify manager
- verify detailer
- prepare assigned lead for detailer

### A2. Public Flow Verification
- apply latest `supabase/schema.sql`
- verify `/request`
- verify `npm run public:flow`
- confirm clients / leads / lead_events are created correctly

## Stage B. Move Automation Into Supabase-Native Backend

### B1. New Lead Alert
Build first Edge Function:
- receives new lead context
- sends Telegram alert
- supports internal and public lead sources

### B2. Follow-Up Reminder
Build Cron + Edge Function flow:
- check leads with due `follow_up_at`
- send manager reminder
- prevent duplicate reminders

### B3. Daily Digest
Build Cron + Edge Function flow:
- summarize new leads
- summarize overdue follow-ups
- summarize active work
- send digest to owner / manager

## Stage C. Sales-Ready Workflow

Prepare one believable demo:
- public lead comes in
- manager sees it in CRM
- follow-up gets scheduled
- reminder is sent
- lead moves toward booking

This is the point where the product becomes much easier to sell.

## Stage D. Productization

After stable workflows:
- refine onboarding flow
- define reusable configuration points
- prepare multi-business model
- prepare SaaS subscription direction

## Stage E. Mobile Layer

Only after stable web product and stable backend automations:
- define mobile MVP scope
- reuse the same Supabase backend
- focus on owner / manager / detailer mobile workflows
- keep mobile as a client of the same system, not a separate product

## Technical Priority Order

1. role QA
2. public flow verification
3. Edge Function alert
4. follow-up reminder
5. daily digest
6. demo polish
7. SaaS structure
8. mobile layer later

## What Not To Do

- do not turn this into a huge universal CRM
- do not rebuild everything from scratch
- do not depend on `n8n` as the core product engine
- do not put secret keys in frontend

## Product Philosophy

This is not "CRM for everyone."

This is:
- mini CRM
- lead dispatcher
- booking + follow-up + reminder system
- for local service businesses

Start with detailing.
Then adapt later if needed.
