# Execution Checklist

## Now

1. Verify `git` / backup state and confirm how the project is safely stored.
2. Review current codebase for structural bugs and mismatches.
3. Apply the latest `supabase/schema.sql` to the live Supabase project.
4. Verify the public request flow end-to-end.
5. Deploy and test the current Edge Functions:
   - `lead-alert`
   - `follow-up-reminder`
   - `daily-digest`

## After Now

1. Remove legacy `n8n`-first leftovers from UI and app flows.
2. Re-check role behavior for `owner / manager / detailer`.
3. Add minimal anti-spam protection to the public request form.
4. Re-run build and functional verification after cleanup.
5. Update package docs with the new stable state.

## Later

1. Strengthen operational automation flows:
   - reactivation
   - post-service follow-up
   - review request
2. Improve admin/demo readiness:
   - demo users
   - demo leads
   - clean walkthrough
3. Prepare multi-business/SaaS-oriented structure carefully.
4. Add AI assistant features only after the automation layer is stable.
5. Prepare mobile app direction on the same backend foundation.

## Do Not Touch Yet

1. Do not expand into a universal CRM.
2. Do not build AI autopilot before the core CRM and automations are stable.
3. Do not start the mobile app as a separate logic stack.
4. Do not add heavy feature sprawl before verification and cleanup are complete.

## Working Rule

For each iteration:

1. Audit the current layer.
2. Fix bugs and structural issues.
3. Verify the result.
4. Record the state in `CODEX_PACKAGE`.
5. Only then move to the next layer.
