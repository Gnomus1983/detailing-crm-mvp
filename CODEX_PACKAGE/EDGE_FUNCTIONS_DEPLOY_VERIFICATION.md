# Edge Functions Deploy Verification

## Date

- `2026-06-02`

## Project

- Supabase project: `detailing-crm-mvp`
- Project ID: `knegynsaxsufwfbgqmoq`

## What Was Done

### Schema / Data

1. Duplicate `clients.phone` rows were found and cleaned safely.
2. Latest `supabase/schema.sql` was applied successfully.
3. Verified:
   - `automation_runs` exists
   - `submit_public_lead(...)` exists
   - `clients_phone_unique_idx` exists

### Public Flow

4. `npm run public:flow` succeeded against the live Supabase project.
5. Verified public lead creation and `lead_events` creation.

### Edge Functions

6. Deployed successfully:
   - `lead-alert`
   - `follow-up-reminder`
   - `daily-digest`

7. Verified all three functions are `ACTIVE`.

## Live Invocation Result

All three deployed functions respond, but currently stop with:

```json
{
  "error": "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_MANAGER_CHAT_ID"
}
```

## Meaning

This is a good result.

It means:

1. deployment worked
2. routing worked
3. function runtime worked
4. invocation worked
5. current blocker is not code deployment
6. current blocker is missing function secrets

## Current Remaining Requirement

Set these Supabase Edge Function secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_MANAGER_CHAT_ID`
- `ALERT_INTERNAL_TOKEN`

## After Secrets Are Set

Re-test:

1. `lead-alert`
2. `follow-up-reminder`
3. `daily-digest`

Then verify:

1. Telegram delivery
2. `automation_runs` rows
3. `lead_events` rows for alert/reminder flows

## Status

Edge Functions are now:

- deployed
- reachable
- executable

The next step is secret configuration, not code deployment.
