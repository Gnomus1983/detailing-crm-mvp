# UI Polish And Demo Hardening — 2026-06-04

## What Was Completed

- QA smoke suite was closed fully with `5 passed`
- the CRM topbar now uses `DETAIL CRM` branding consistently
- the topbar user name now comes from the CRM profile, not stale auth metadata
- the `Leads` screen was reworked into a clearer operator workspace:
  - manual lead form is hidden by default
  - compact quick-entry hint shown first
  - pipeline stays visible
  - lead detail card stays on the right on desktop
- mixed dashboard wording was reduced:
  - `Dashboard` -> `Панель`
  - `pending follow-up` -> `follow-up на сегодня`
  - `Live pipeline` -> `Оперативная сводка`

## Demo Data Cleanup

Live Supabase data was cleaned to remove test pollution:

- deleted `Rate Limit Smoke*` clients and leads
- deleted `Rate Limit Test*` clients and leads
- deleted linked `lead_events` for those test records
- cleared `rate_limit_events`
- kept one clean `Public Demo Client`
- kept the believable real demo layer:
  - `Public Demo Client`
  - `Victor Sandu`
  - `Andrei Popa`
  - `Mihai Rusu`

## Visual Result

After cleanup, the main screens look demo-ready again:

- Dashboard shows believable recent requests
- Leads pipeline is readable and no longer dominated by test garbage
- Clients list is short, credible, and suitable for a sales call

## Important Note

The smoke test account still exists for QA, but its visible name was cleaned for demo use:

- role: `manager`
- display name: `Демо менеджер`

## Current Stage

At this point:

- Security is done
- QA is done
- UI redesign is done
- demo cleanup is done

The project is now in a strong **demo / first-sales ready** state.

## Recommended Next Step

Choose one of two paths:

1. commit and push this stage as a clean checkpoint
2. move directly into the next product layer after one final live demo rehearsal
