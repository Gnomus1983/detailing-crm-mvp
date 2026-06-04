# HOW WE MOVE NOW

## Product Direction

We are building a small-business CRM product in this order:

1. CRM core
2. backend automations
3. UX / visual system
4. public-facing site / request layer
5. onboarding / usage layer
6. QA / testing discipline
7. sales demo layer
8. AI assistant
9. optional AI autopilot later

## Architecture Direction

Main stack now:
- React + Vite
- Supabase
- Edge Functions
- Cron

Not the main stack:
- `n8n-first`

## Current Truth

Already built:
- internal CRM
- lead flow
- notes / timeline
- follow-up
- public request form
- role-aware visibility
- automation scaffolding
- Romanian localization layer
- single-user role QA path

## Current Priorities

### Priority 1
Strengthen the UX / visual system

### Priority 2
Strengthen the public-facing product layer

### Priority 3
Create onboarding / usage documentation

### Priority 4
Keep security/hardening active in parallel

### Priority 5
Make QA/testing discipline explicit

### Priority 6
Finalize the sales demo layer

### Priority 7
Only after stable web + automation core, begin AI assistant planning

### Priority 8
Only after stable web + automation core, prepare mobile app direction

## AI Direction

### First
AI assistant:
- summarize lead
- suggest reply
- suggest next action

### Later
AI autopilot:
- automated conversation
- auto qualification
- booking assistant

## Key Guardrail

Do not try to make the system fully autonomous too early.

Stable automation must come first.
Clear product usage, visual confidence, and safety must also come before AI.
