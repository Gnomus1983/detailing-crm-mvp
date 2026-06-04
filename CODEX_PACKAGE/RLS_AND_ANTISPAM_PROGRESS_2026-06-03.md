# RLS And Anti-Spam Progress - 2026-06-03

## What Was Done

### Legacy Cleanup

1. Root docs were updated to reflect the current architecture:
   - `README.md`
   - `PROJECT_HANDOFF.md`
2. Runtime naming now favors the automation layer instead of `n8n` wording.

### Access Control / RLS

3. Live schema was updated to tighten RLS for:
   - `clients`
   - `services`
   - `leads`
   - `lead_events`
   - `attachments`
   - `automation_runs`
4. New access model now distinguishes:
   - `owner / manager`
   - `detailer`

### Public Form Anti-Spam

5. Public intake now includes:
   - honeypot field (`website`)
   - duplicate recent submission protection by `phone + source` within 10 minutes

## Live Verification

1. `npm run public:flow` succeeded after the anti-spam and RLS changes.
2. `daily-digest` still succeeded after the RLS hardening.

## Meaning

The project foundation is stronger now:

1. data access is less open than before
2. public intake has a minimal server-side anti-spam layer
3. automation still works after the hardening pass

## What Still Remains

1. finish cleanup of historical `n8n` wording in secondary docs
2. run role QA against the stricter live policies
3. consider whether public intake should later move from exposed `security definer` RPC to an Edge Function entry path
