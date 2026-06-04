# SECURITY AUDIT

Audit date:
- 2026-06-04

Scope:
- current repository code
- Supabase schema
- Supabase Edge Functions
- browser-to-Supabase access patterns

This audit covers tasks 1-3:
- backend/functions auth audit
- RLS audit
- IDOR audit

Follow-up fixes have since started for:
- stronger rate limiting
- stronger input validation layer

## 1. Endpoint Audit

### Notes

- There is no custom Node/Express backend in this repository.
- The backend surface is currently:
  - Supabase Auth used from frontend
  - one public Postgres RPC: `submit_public_lead(...)`
  - three Supabase Edge Functions
- Login and signup use Supabase Auth endpoints outside this repository. They are part of the deployed Supabase auth service, not local backend code here.

### Endpoint Table

| Endpoint | Auth check | Role check | Vulnerability | Comment |
|---|---|---|---|---|
| `Supabase Auth signInWithPassword` via `src/App.jsx` | Yes, handled by Supabase Auth | No app-level role check at login stage | No direct repo vulnerability found | Authentication is delegated to Supabase; no local login endpoint exists in repo |
| `Supabase Auth signUp` via `src/App.jsx` | No prior auth required | No role check | No direct repo vulnerability found | Normal public signup path; profile row later created by DB trigger |
| `RPC public.submit_public_lead(...)` | No auth required by design | No role check by design | No direct auth bug found, but abuse surface exists | Public intake intentionally open; protected only by honeypot + phone/source duplicate throttle |
| `POST /functions/v1/lead-alert` | Yes, `x-internal-token` checked if configured | No user role check | Low/medium operational risk | Uses service-role client internally; if `ALERT_INTERNAL_TOKEN` leaks, function can write `lead_events` and `automation_runs` |
| `POST /functions/v1/follow-up-reminder` | Yes, `x-internal-token` checked if configured | No user role check | Low/medium operational risk | Uses service-role client internally; token leak would allow reminder batch execution |
| `POST /functions/v1/daily-digest` | Yes, `x-internal-token` checked if configured | No user role check | Low/medium operational risk | Uses service-role client internally; token leak would allow digest execution |

### Findings

#### Good
- No anonymous read/write custom backend routes were found in repository code.
- All Edge Functions require POST and check `ALERT_INTERNAL_TOKEN` when configured.
- Public write path is centralized through one RPC instead of open anonymous inserts directly from frontend.

#### Risks
- `submit_public_lead(...)` is intentionally public and currently has only minimal anti-abuse protection.
- Edge Functions use `SUPABASE_SERVICE_ROLE_KEY`, so they bypass RLS intentionally. That is normal for server-side automation, but it raises the importance of protecting `ALERT_INTERNAL_TOKEN`.
- There is no additional request signing, source allowlist, or replay protection on Edge Function invocations beyond the shared internal token.

## 2. RLS Audit

### Notes

RLS is enabled on all current application tables listed below.

The main model is role-based access:
- `owner`
- `manager`
- `detailer`

There is no multi-tenant isolation yet.
This is a single-business CRM model today.

### RLS Table Audit

| Table | RLS enabled | SELECT policy | INSERT policy | UPDATE policy | DELETE policy | User/role check present | Audit result |
|---|---|---|---|---|---|---|---|
| `profiles` | Yes | Yes | No | Yes | No | `auth.uid() = id` for self-update | Partial by design |
| `clients` | Yes | Yes | Yes | Yes | Yes | Role checks and assigned-lead read path | Good |
| `services` | Yes | Yes | Yes | Yes | Yes | Role checks for owner/manager; anon read active services | Good |
| `leads` | Yes | Yes | Yes | Yes | Yes | Role checks and `assigned_to = auth.uid()` | Good |
| `lead_events` | Yes | Yes | Yes | Yes | Yes | Role checks and assigned-lead read path | Good |
| `attachments` | Yes | Yes | Yes | Yes | Yes | Role checks and assigned-lead read path | Good |
| `automation_runs` | Yes | Yes | No | No | No | Read limited to owner/manager | Partial by design |

### RLS Findings

#### Good
- RLS is enabled on all current app tables.
- Critical operational tables (`clients`, `leads`, `lead_events`) have full authenticated policies for owner/manager and restricted read access for detailer.
- Public anonymous access is narrow:
  - active `services`
  - execute `submit_public_lead(...)`

#### By-design partial areas
- `profiles` has no insert/delete policies because rows are created through a `security definer` trigger from `auth.users`.
- `automation_runs` has no client-side write policies because writes are intended to happen from Edge Functions using service role.

#### Structural limitation
- RLS currently protects by role, not by tenant.
- Because there is no `tenant_id` model, owner/manager can see all CRM data in the project.
- This is acceptable only for the current single-business MVP.
- It is not sufficient for future multi-business SaaS isolation.

## RLS_AUDIT

### Tables with RLS enabled
- `profiles`
- `clients`
- `services`
- `leads`
- `lead_events`
- `attachments`
- `automation_runs`

### Tables with missing or partial policy coverage
- `profiles`
  - no insert/delete policy
  - acceptable by current trigger-based design
- `automation_runs`
  - no insert/update/delete policy for authenticated clients
  - acceptable by current Edge Function/service-role design

### Tables with no RLS-disabled gap found
- no current app table in `schema.sql` was found with RLS disabled

## 3. IDOR Audit

### Search rule used

The audit looked for places where the code accesses or mutates records by ID, especially:
- `.eq("id", ...)`
- lead/client references passed from UI
- backend functions that accept identifiers and use service role

### Results

| File | Location | Pattern | Ownership check present | Vulnerability | Comment |
|---|---|---|---|---|---|
| `src/App.jsx` | profile load around `session.user.id` | `.eq("id", session.user.id)` | Yes | No | Reads own profile only |
| `src/crm.js` | `updateLeadStatusRecord(...)` | `.from("leads").update(...).eq("id", leadId)` | Not in JS layer; enforced by RLS | No direct current IDOR | Browser helper trusts RLS; safe for current role-based single-business model |
| `src/crm.js` | `updateLeadFollowUpRecord(...)` | `.from("leads").update(...).eq("id", leadId)` | Not in JS layer; enforced by RLS | No direct current IDOR | Same as above |
| `src/crm.js` | `addLeadNoteRecord(...)` / `createLeadEvent(...)` | inserts by `lead_id` | Not in JS layer; enforced by RLS insert policy | No direct current IDOR | Owner/manager only by policy |
| `supabase/functions/lead-alert/index.ts` | uses payload `lead.id` and service role insert into `lead_events` | No ownership check | No direct external IDOR, but privileged write path | Depends entirely on internal token trust |
| `supabase/functions/follow-up-reminder/index.ts` | service-role reads due leads and inserts `lead_events` | No ownership check | No direct external IDOR, but privileged server path | Intended internal automation path |
| `supabase/functions/daily-digest/index.ts` | service-role aggregate reads | No ownership check | No direct external IDOR | Internal automation only |

### IDOR Findings

#### No direct browser-side IDOR found in current app flow
- Browser-side updates by lead ID rely on Supabase RLS, which is the real authorization boundary.
- A detailer cannot update leads through frontend helpers because:
  - UI forbids edit actions
  - RLS also blocks update access

#### Important future risk
- Because there is no tenant model, current authorization is not ownership-per-tenant, only role-based within a single business.
- If this app is later reused for multiple businesses without adding `tenant_id` isolation, the current query pattern would become a serious cross-tenant exposure risk.

#### Operational privileged-path risk
- Edge Functions use service role and therefore bypass RLS.
- This is not an IDOR bug by itself, but it means that any leak of `ALERT_INTERNAL_TOKEN` would expose privileged write/read behavior.

## Priority Findings

### High priority for future product safety
1. No tenant isolation model yet
2. Public intake anti-abuse is still minimal
3. Edge Functions depend on one shared internal token

### Medium priority
1. No formal request signing or replay protection for Edge Functions
2. No dedicated server-side rate limiting layer beyond current intake duplicate window

### Lower priority / acceptable current-state design
1. `profiles` missing insert/delete RLS policies because trigger owns row creation
2. `automation_runs` write policies absent for authenticated users because writes are service-role only

## Recommended Next Fixing Order

1. Add stronger rate limiting / abuse protection
2. Add stronger input validation / schema validation
3. Document and later implement tenant isolation before any multi-business rollout
4. Consider stronger internal function authentication than one shared token

## Bottom Line

Current result:
- no catastrophic anonymous data exposure was found in repository code
- no direct browser-side IDOR was found in current single-business role model
- RLS coverage is materially good for current MVP scope

Main security truth:
- this CRM is reasonably protected for a single-business MVP
- it is not yet architected for secure multi-tenant SaaS use

## Rate Limiting Follow-Up

Implementation status after this audit:
- public request flow was moved toward server-side rate limiting through the `public-request` Edge Function
- current target rule:
  - public request: 3 requests per hour per IP

Live verification:
- `public-request` Edge Function deployed successfully
- normal public flow still succeeds
- repeated same-source requests now return HTTP `429`
- returned message:
  - `Ai trimis deja prea multe cereri in ultima ora. Incearca din nou mai tarziu.`

Known limitation still remaining:
- login/signup flow is currently delegated directly to Supabase Auth from the frontend
- this repository does not expose a custom `/login` or `/register` backend route where repository-owned rate limiting can be added
- any stronger application-owned login throttling would require introducing an auth proxy layer or redesigning the auth entry flow

## Validation Follow-Up

Implementation status after this audit:
- `public-request` now uses server-side `Zod` validation with `.strict()`
- `lead-alert` now uses server-side `Zod` validation with `.strict()`

What this improves:
- required fields are enforced predictably
- optional fields are typed and bounded
- unexpected fields are rejected
- mass-assignment style extra payload keys are not accepted on these endpoints

Current validation coverage:
- `public-request`
  - validated
- `lead-alert`
  - validated
- `follow-up-reminder`
  - no external user payload expected
- `daily-digest`
  - no external user payload expected
- frontend login/signup
  - still delegated to Supabase Auth, not a local POST endpoint in this repo

Live verification:
- invalid `public-request` payload now returns HTTP `400`
- invalid `lead-alert` payload now returns HTTP `400`
- unexpected fields are rejected on both endpoints
