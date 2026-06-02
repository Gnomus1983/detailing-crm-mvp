# HOW WE MOVE NOW

## Product Direction

We are building a small-business CRM product in this order:

1. CRM core
2. backend automations
3. AI assistant
4. optional AI autopilot later

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

## Current Priorities

### Priority 1
Apply the latest schema and verify public flow

### Priority 2
Complete deploy/invoke path for Edge Functions

### Priority 3
Use Supabase-native backend automations as the main workflow engine

### Priority 4
Only after stable automation, begin AI assistant planning

### Priority 5
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
