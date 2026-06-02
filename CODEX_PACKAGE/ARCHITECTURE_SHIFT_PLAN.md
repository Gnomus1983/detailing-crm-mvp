# ARCHITECTURE SHIFT PLAN

## Decision

We are changing the project direction from:

- `Supabase + n8n-first automation`

to:

- `Supabase + Edge Functions + Cron` as the main product architecture

`n8n` is no longer considered the core automation engine.

It may remain only as an optional temporary integration helper later if really needed.

## Why We Are Changing

Reasons:
- `n8n` free trial is temporary
- `n8n` cloud becomes an extra recurring cost
- product logic should live inside the product, not mostly outside of it
- this CRM is intended to become a sellable subscription product
- long-term profitability matters
- `Supabase + Edge Functions + Cron` is more product-native and SaaS-friendly

## New Core Architecture

### Frontend
- React
- Vite

### Core backend/data layer
- Supabase Auth
- Supabase Postgres
- RLS / policies
- SQL functions

### Product automation layer
- Supabase Edge Functions
- Supabase Cron
- optional DB webhooks / triggers where useful

### Optional integration layer
- n8n only if needed for a specific external integration
- not required as the product backbone

## Product Logic Ownership

### Should live in our product code
- public lead intake processing
- lead creation workflows
- follow-up reminder workflows
- daily digest workflows
- reactivation logic
- post-service follow-up
- review request logic
- role-aware flows
- tenant-aware business rules later

### Can optionally stay external if needed
- rare third-party connector experiments
- one-off workflow prototypes

## Strategic Product Direction

We are building:
- a focused mini CRM
- with automation built into the product
- starting from detailing
- later reusable for other local service businesses
- later sellable as a subscription SaaS

## New Recommended Build Order

1. stabilize internal CRM
2. finalize role QA
3. verify public intake
4. replace webhook-first automation thinking with Edge Functions-first automation
5. build first product-native alert flow
6. build follow-up reminders
7. build daily digest
8. prepare multi-business SaaS direction later

## Immediate Technical Shift

### Keep
- existing CRM UI
- public request form
- Supabase schema
- roles
- leads / clients / events data model

### Reframe
- webhook events are now optional helpers, not the main automation model
- automation should move into Supabase-native backend logic

### Build next
- Edge Function for new lead alert dispatch
- Cron-driven reminder logic
- Cron-driven daily digest logic

## Financial Logic

Why this is more rentable:
- avoids ongoing dependence on `n8n` cloud pricing
- keeps automation inside our product stack
- reduces external workflow platform cost
- makes future subscription margins healthier

## Rule Going Forward

From this point:
- plan around `Supabase + Edge Functions + Cron`
- do not design the core system around `n8n`
- treat `n8n` as optional, not essential
