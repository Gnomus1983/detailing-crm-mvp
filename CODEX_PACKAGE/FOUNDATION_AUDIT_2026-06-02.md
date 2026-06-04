# Foundation Audit - 2026-06-02

## What Was Strengthened

1. Git / GitHub connection was restored safely.
2. A full backup copy was created before git reconnect.
3. The current local working state is now committed and pushed.
4. `schema.sql` was improved for safer re-apply behavior:
   - policy recreation is now explicit and repeatable
5. Client create/reuse logic was hardened:
   - frontend now uses `upsert` by `phone`
   - `submit_public_lead(...)` now uses `on conflict (phone)`
6. Automation webhook naming was generalized:
   - `VITE_AUTOMATION_WEBHOOK_URL`
   - legacy `VITE_N8N_WEBHOOK_URL` still supported
7. UI wording now reflects the Supabase-native automation direction.

## Current Strong Areas

1. CRM core is working.
2. Build passes.
3. Public intake exists in code.
4. Edge Function scaffolds exist:
   - `lead-alert`
   - `follow-up-reminder`
   - `daily-digest`
5. Automation logging exists through `automation_runs`.
6. Project state and handoff docs are preserved in `CODEX_PACKAGE`.

## Remaining Risks

### High

1. Role protection is still mostly frontend-level.
   - Current RLS policies for `clients`, `leads`, and `lead_events` still allow broad authenticated access.
   - This is acceptable for current MVP iteration, but not yet strong enough for a real multi-user paid product.

### Medium

2. `clients.phone` is now unique in schema, but applying the unique index will fail if live data already contains duplicate phone rows.
3. Public request flow still lacks anti-spam / abuse protection.
4. Edge Functions are scaffolded but not yet verified through live deploy/invoke.

### Low

5. Some historical docs still mention `n8n`.
6. Legacy compatibility helpers still reference the old webhook naming to avoid breaking earlier scripts.

## Recommended Next Step

1. Check the live database for duplicate `clients.phone` values before applying schema.
2. Apply the latest `supabase/schema.sql`.
3. Verify the public request flow.
4. Deploy and verify Edge Functions.
5. Then move into deeper access-control hardening.
