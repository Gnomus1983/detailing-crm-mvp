# ARCHITECTURE

## Purpose

This document describes the current architecture of the project as it actually exists in code.

It does not describe a desired future state.
It describes the current implemented system.

## Project Identity

- Project: `detailing-crm-mvp`
- Current local path: `C:\Users\Iura\Documents\CRM detaling\detailing-crm-mvp-main`
- Product type: narrow CRM MVP for auto detailing operations

## Runtime Stack

### Frontend
- React 19
- React Router DOM 7
- Vite 7

### Backend / Data / Auth
- Supabase
- Supabase Postgres
- Supabase Auth
- Supabase Row Level Security
- Supabase Edge Functions

### Automation
- Supabase Edge Functions
- Telegram API
- `automation_runs` table for automation execution logging

### Local scripts
- Node scripts for demo verification and public-flow verification

## Package-Level Structure

### Frontend application
- `src/App.jsx`
- `src/crm.js`
- `src/supabase.js`
- `src/styles.css`

### Database and backend
- `supabase/schema.sql`
- `supabase/seed.sql`
- `supabase/functions/lead-alert/index.ts`
- `supabase/functions/follow-up-reminder/index.ts`
- `supabase/functions/daily-digest/index.ts`
- `supabase/functions/_shared/telegram.ts`
- `supabase/functions/_shared/automation-log.ts`

### Operational and handoff docs
- `PROJECT_HANDOFF.md`
- `PROJECT_STATUS_PLAN.md`
- `NEXT_TASKS.md`
- `CODEX_PACKAGE/*`

## Frontend Architecture

The frontend is a single Vite React app.

The main application flow lives in `src/App.jsx`.

### Main routing

The app currently has two top-level modes:

1. Public request flow
   - route: `/request`
   - handled by `PublicRequestPage`

2. Authenticated CRM flow
   - default app routes under authenticated state
   - handled by `ProtectedApp`

### Main authenticated routes

Defined in `src/App.jsx`:

- `/dashboard`
- `/leads`
- `/clients`
- `/services`
- `/settings`

Routes are filtered by role through frontend permissions.

## Auth Architecture

Auth is implemented with Supabase Auth.

Frontend client setup is in `src/supabase.js`:
- `createClient(...)`
- `persistSession: true`
- `autoRefreshToken: true`

The current frontend auth flow is:

### Sign up
- `supabase.auth.signUp(...)`
- optional `full_name` passed in user metadata

### Sign in
- `supabase.auth.signInWithPassword(...)`

### Session bootstrap
- `supabase.auth.getSession()`
- `supabase.auth.onAuthStateChange(...)`

### Sign out
- `supabase.auth.signOut()`

There is currently no separate custom backend auth layer.
There is no custom session middleware in this project.

## Role Model

The implemented roles are:

- `owner`
- `manager`
- `detailer`

Role labels in UI:
- `owner` -> `Proprietar`
- `manager` -> `Manager`
- `detailer` -> `Tehnician detailing`

### Frontend role permissions

Defined in `src/App.jsx` through `rolePermissions`.

#### owner
- can access:
  - dashboard
  - leads
  - clients
  - services
  - settings
- can create leads
- can edit leads

#### manager
- can access:
  - dashboard
  - leads
  - clients
  - services
- cannot access settings
- can create leads
- can edit leads

#### detailer
- can access:
  - dashboard
  - leads
- cannot create leads
- cannot edit leads
- only sees assigned leads in frontend filtering

## Database Architecture

The current schema is defined in `supabase/schema.sql`.

### Core tables

#### `public.profiles`
Stores CRM user profile data linked to Supabase auth users.

Main fields:
- `id` -> references `auth.users(id)`
- `full_name`
- `email`
- `role`
- `telegram_chat_id`

#### `public.clients`
Stores customer data.

Main fields:
- `id`
- `name`
- `phone`
- `email`
- vehicle data fields
- `notes`

Important constraint:
- unique index on `phone`

#### `public.services`
Stores available detailing services.

Main fields:
- `id`
- `name`
- `base_price`
- `duration_minutes`
- `is_active`

#### `public.leads`
Stores detailing requests / work pipeline records.

Main fields:
- `id`
- `client_id`
- `service_id`
- `status`
- `source`
- `address`
- `comment`
- `preferred_date`
- `preferred_time`
- `estimated_price`
- `assigned_to`
- `follow_up_at`
- `last_contacted_at`

#### `public.lead_events`
Stores timeline/history per lead.

Main fields:
- `lead_id`
- `type`
- `note`
- `payload`
- `created_by`

Supported event types:
- `created`
- `status_changed`
- `note_added`
- `follow_up_set`
- `assigned`
- `price_updated`
- `reminder_sent`

#### `public.attachments`
Stores file references per lead.

#### `public.automation_runs`
Stores system-level automation execution records.

Main fields:
- `automation_key`
- `status`
- `scope_key`
- `lead_id`
- `payload`
- `error_message`

## Tenant Model

There is currently no implemented multi-tenant data model.

Specifically:
- there is no `tenant_id` column in the current schema
- there is no schema-per-tenant setup
- this project currently behaves as a single-business CRM

This is an intentional current-state limitation and is also called out in project docs.

## Data Access Model

The frontend talks directly to Supabase from the browser using `@supabase/supabase-js`.

There is no custom REST API server in this repository.

Current browser-side data access patterns:
- direct table reads from Supabase
- direct inserts/updates to allowed tables
- one RPC for public intake

## Public Request Architecture

Public request handling is split across frontend and database:

### Frontend
`PublicRequestPage` in `src/App.jsx`

Responsibilities:
- loads active services from Supabase
- collects request fields
- sends request through `submitPublicLead(...)`

### Browser-side helper
`submitPublicLead(...)` in `src/crm.js`

Responsibilities:
- calls Supabase RPC `submit_public_lead`

### Database-side intake function
`public.submit_public_lead(...)` in `supabase/schema.sql`

Responsibilities:
- honeypot spam check via `p_website`
- duplicate request throttling by phone + source in 10-minute window
- create or reuse client through phone conflict handling
- create lead
- create initial lead events
- return summary JSON

## CRM Mutation Helpers

The frontend mutation helpers are in `src/crm.js`.

Current helpers:
- `sendAutomationWebhook(...)`
- `createLeadEvent(...)`
- `createOrReuseClient(...)`
- `createLeadRecord(...)`
- `submitPublicLead(...)`
- `updateLeadStatusRecord(...)`
- `updateLeadFollowUpRecord(...)`
- `addLeadNoteRecord(...)`

## Row Level Security Architecture

RLS is enabled on:
- `profiles`
- `clients`
- `services`
- `leads`
- `lead_events`
- `attachments`
- `automation_runs`

### Implemented access direction

#### Profiles
- authenticated users can read profiles
- users can update their own profile

#### Clients
- owners/managers can read all clients
- detailers can read clients linked to assigned leads
- owners/managers can create/update/delete clients

#### Services
- authenticated users can read services
- owners/managers can manage services
- anonymous users can read active services

#### Leads
- owners/managers can read all leads
- detailers can read assigned leads
- owners/managers can create/update/delete leads

#### Lead events
- owners/managers can read all lead events
- detailers can read lead events for assigned leads
- owners/managers can create/update/delete lead events

#### Attachments
- owners/managers can read all attachments
- detailers can read attachments for assigned leads
- owners/managers can create/update/delete attachments

#### Automation runs
- owners/managers can read automation runs

## Automation Architecture

The current automation direction is Supabase-native.

### Shared helpers

#### `supabase/functions/_shared/telegram.ts`
- escapes Telegram HTML
- sends Telegram messages

#### `supabase/functions/_shared/automation-log.ts`
- writes execution rows to `automation_runs`

### Edge Function: `lead-alert`

File:
- `supabase/functions/lead-alert/index.ts`

Responsibilities:
- receives `lead_created` style payload
- validates internal token if configured
- builds Telegram message
- sends manager alert
- writes `automation_runs`
- writes `lead_events` reminder entry after alert success

### Edge Function: `follow-up-reminder`

File:
- `supabase/functions/follow-up-reminder/index.ts`

Responsibilities:
- validates internal token if configured
- finds due leads with `follow_up_at <= now`
- limits scope to active statuses
- deduplicates reminders per day through `automation_runs`
- sends Telegram reminders
- writes `lead_events`
- writes batch and per-lead `automation_runs`

### Edge Function: `daily-digest`

File:
- `supabase/functions/daily-digest/index.ts`

Responsibilities:
- validates internal token if configured
- calculates daily metrics from `leads`
- deduplicates by day through `automation_runs`
- sends Telegram daily summary
- writes `automation_runs`

## Webhook Compatibility Layer

The frontend still supports an optional external automation webhook.

Current env lookup:
- `VITE_AUTOMATION_WEBHOOK_URL`
- legacy fallback:
  - `VITE_N8N_WEBHOOK_URL`

Current browser-side events sent externally:
- `lead_created`
- `follow_up_updated`

This is compatibility-only behavior.
The main architecture is no longer `n8n-first`.

## Environment Variables Currently Used

### Frontend
Defined in `.env.example`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_AUTOMATION_WEBHOOK_URL`
- optional legacy commented fallback for `VITE_N8N_WEBHOOK_URL`

### Edge Functions / Supabase runtime
Observed from code usage:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_MANAGER_CHAT_ID`
- `ALERT_INTERNAL_TOKEN`

## Deployment Shape

### Frontend
Current known runtime:
- local Vite dev / preview during development

The docs still mention Vercel as target direction, but this repository does not contain a custom Vercel server layer.

### Database / Auth / Functions
- Supabase project
- live project ref noted in handoff docs
- Edge Functions deployed in Supabase

## Known Current Architecture Limits

These are real current-state limits, not guesses:

- no implemented multi-tenant model
- no custom backend API server
- browser talks directly to Supabase
- no formal design system file yet
- no formal automated E2E suite yet
- no formal architecture file existed before this one

## Current Architecture Summary

The current system is:

- a single React/Vite frontend
- directly connected to Supabase
- using Supabase Auth for login
- using Postgres tables for CRM data
- using RLS for role-based data access
- using one RPC for public request intake
- using Supabase Edge Functions for Telegram automation
- operating today as a single-business detailing CRM, not as a multi-tenant SaaS system
