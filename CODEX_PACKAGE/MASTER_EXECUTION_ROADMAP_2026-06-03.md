# MASTER EXECUTION ROADMAP

## Why This Roadmap Exists

The previous plan covered architecture, CRM features, automation, and demo readiness, but it did not explicitly separate several critical workstreams strongly enough:
- public-facing site / request layer
- UX / visual system
- onboarding and usage instructions
- security and protection
- QA / testing discipline

This roadmap corrects that.

From this point forward, the project should move by this structure instead of adding new work ad hoc.

## Product We Are Building

We are building a focused detailing CRM product for small local service businesses.

This product is not only:
- a CRM database
- a lead tracker
- a Telegram reminder system

It is a complete operational workflow product with:
- internal CRM
- public intake entry point
- automation layer
- clear UX
- clear user roles
- onboarding instructions
- protection / hardening
- a sales-ready demo path

## Core Execution Order

### Phase 1. Foundation And Backend Safety

Goal:
- build a stable product core that does not break as we grow

Includes:
- schema quality
- role model
- RLS and access control
- anti-spam
- automation logs
- Edge Functions
- stable build
- recovery / handoff docs

Status:
- mostly done
- should continue in parallel as a maintenance stream

### Phase 2. Public Site And Visual Product Layer

Goal:
- make the product understandable and attractive from the outside

Includes:
- public-facing request flow
- login visual polish
- public request page polish
- dashboard visual hierarchy
- leads list and detail card polish
- cleaner Romanian product copy
- stronger visual identity for owner / manager / technician

Status:
- active
- this is one of the main current priorities

### Phase 3. Usage And Onboarding Layer

Goal:
- make the CRM usable by real people without guessing

Includes:
- CRM user guide
- roles and access guide
- owner workflow guide
- manager workflow guide
- technician workflow guide
- how to log in
- how to use follow-up
- how Telegram reminders work
- how to run the demo

Status:
- active
- not fully documented yet

### Phase 4. QA And Operational Discipline

Goal:
- prevent random regressions and keep the product trustworthy

Includes:
- repeatable QA checklist
- role QA checklist
- public flow verification
- post-change smoke tests
- pre-demo verification steps
- live operational checklists

Status:
- active
- partially done, but should be unified and expanded

### Phase 5. Demo And Sales Layer

Goal:
- make the product easy to show, explain, and sell

Includes:
- one strong end-to-end demo scenario
- believable demo data
- clean Romanian demo copy
- sales walkthrough
- explanation of roles
- explanation of business value
- pricing / packaging thinking later

Status:
- active
- base layer is done, but should still be strengthened

### Phase 6. Automation Deepening

Goal:
- turn the CRM into a workflow system, not just a database

Includes:
- lead alert
- follow-up reminder
- daily digest
- later reactivation flow
- later post-service follow-up
- later review request flow

Status:
- core done
- deeper flows later

### Phase 7. AI Assistant Layer

Goal:
- help operators work faster inside an already stable CRM

Includes:
- lead summary
- suggested next step
- draft follow-up message
- priority hints

Status:
- later
- not the current active focus

### Phase 8. SaaS Structuring

Goal:
- prepare the product to serve multiple businesses cleanly

Includes:
- multi-business structure
- safer isolation
- subscription model
- onboarding model for new customers

Status:
- later

### Phase 9. Mobile App Layer

Goal:
- extend the same stable backend into mobile

Includes:
- mobile UX direction
- operator mobile usage
- reuse of Supabase / Edge Functions backend

Status:
- later
- only after strong web + automation + onboarding layers

## What Is Current And What Is Not

### Current Active Priorities

1. UX / visual strengthening
2. onboarding and usage documentation
3. QA discipline
4. security/hardening maintenance
5. stronger sales demo

### Not Current Priorities

1. AI autopilot
2. full SaaS expansion
3. mobile buildout
4. broad niche expansion
5. universal CRM behavior

## Working Rule

Each new cycle should follow this order:

1. audit the current layer
2. fix gaps
3. verify
4. document in `CODEX_PACKAGE`
5. move to the next layer

## Practical Meaning Right Now

We should not behave as if the CRM is "done" only because the code works.

A sellable CRM product at this stage must also include:
- visual clarity
- user instructions
- role clarity
- safety
- repeatable testing
- a clean demo path

That is now the official plan.
