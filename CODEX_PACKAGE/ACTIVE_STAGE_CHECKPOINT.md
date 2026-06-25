# ACTIVE STAGE CHECKPOINT

Last updated: 2026-06-21
Stage: sellable web MVP + storefront + partial SaaS foundation

## How To Use This File

This file is the current execution checkpoint for the project.

Before any new implementation batch:
1. Read this file first.
2. Use this file as the source of truth for the current stage.
3. Use `NEXT_TASKS.md` and `PROJECT_STATUS_PLAN.md` only as broader planning context.
4. If this file conflicts with stale checklist items elsewhere, trust this file for the current execution state until the broader plan is updated.

After any meaningful batch:
1. update `What Was Just Confirmed`
2. move items between `Done`, `Partial`, and `Next Actual Block`
3. record any new guardrails in `Do Not Break`
4. if product/UI code changed, build and deploy before considering the batch complete

## What Was Just Confirmed

- storefront is already live and is not the current main engineering bottleneck
- internal CRM is live
- `/request` is live and company-aware
- `/status/:token` is live
- creator/platform surface is already much further than a basic foundation
- multi-company foundation is already partially implemented in live code and real flow
- some broader plan documents are behind the real code state, especially around `/platform`
- creator handoff between storefront leads, demo requests, and company activation is now materially stronger than the original plan baseline
- creator handoff control now includes stage-based filtering, activation checklist logic, and clearer next-step control inside `/platform`
- creator now has an explicit multi-company QA/readiness layer inside `/platform`
- current live verification is green for `build + public flow + smoke`
- current live verification is green again after the creator manual-billing upgrade:
  - `build`
  - `public:flow`
  - `platform:qa:strict`
- creator now has an explicit paid-onboarding / go-live layer for first real paying companies
- platform-admin access no longer depends on email fallback in app code
- smoke tests no longer depend on hardcoded creator / manager / status-token fallbacks
- frontend no longer uses legacy `VITE_N8N_WEBHOOK_URL` fallback
- frontend session profile is no longer artificially backfilled with company role
- creator overview now has an explicit control-map split:
  - `autopilot`
  - `billing control`
  - `onboarding`
  - `ready to bill`
  - `qa / hardening`
- creator now has one unified manual queue instead of forcing the operator to scan multiple sections mentally
- companies list now supports dedicated `billing` and `autopilot` modes
- company management card now shows an explicit creator control state and next step
- creator can now create a paused company + starter trial directly from a demo-request and jump into the linked company handoff
- creator can now also load the niche service pack for that company directly from `/platform`
- `scripts/demo-flow.mjs` no longer depends on legacy `VITE_N8N_WEBHOOK_URL`
- creator launch pipeline now explicitly splits who the launch is waiting on:
  - handoff
  - owner
  - team
  - services
  - billing
  - ready
- company cards now include a creator-side onboarding pack with quick links and a copyable owner/team closing summary
- launch mode inside the companies panel now supports direct subfilters for:
  - handoff
  - owner
  - team
  - services / activation
  - billing
  - ready
- billing mode inside the companies panel now also supports direct operational subfilters
- QA mode inside the companies panel now also supports direct issue-type subfilters
- company switch now hard-resets company-scoped state before reloading the next company context
- smoke coverage now includes a direct company-switch isolation check when the account has more than one company
- company-scoped lead/event/attachment operations now resolve explicit company context through a shared frontend helper instead of repeating broad fallback chains
- company-scoped team/service/create-lead mutations are now also aligned to the same explicit frontend company-scope helper
- storefront demo-request handoff now preserves structured onboarding data (`company_name / role / plan / billing / team / locations`) instead of hiding it only inside a free-text comment
- live verification now also covers structured creator onboarding payload through `demo-request`, including `auto_service`
- creator now has a repeatable CLI-level `platform:qa` pass for multi-company readiness, billing risk, and handoff blockers
- `platform:qa` now groups launch blockers by type and has a dedicated strict mode for final pre-payment checks
- creator UI and `platform:qa` now use one shared readiness logic instead of drifting copies
- если реального owner-лида с витрины ещё нет, creator теперь может завести `manual real lead` прямо в `/platform` и сразу отправить его в paid onboarding queue
- paid readiness is now explicitly separated from `risk clean`: a company can be structurally clean but still not yet ready for real billing
- creator now gets a direct next commercial step plus exact paid-launch blockers per company
- creator can now issue starter access directly from `/platform` for `owner / manager / master` and copy one access pack per company during launch closing
- creator can now also run launch bundles from `/platform` to push `active + billing mode + service pack + handoff close` in one operator step
- creator can now also run a fuller launch close path:
  - `launch bundle + starter access`
  - without duplicating already-existing owner / manager / master roles
- go-live control now distinguishes real working team from owner-only state:
  - owner is checked separately
  - team readiness now expects `manager` or `master`, not just any one membership
- creator/company-member RLS cleanup is now prepared in code and migrations:
  - `can_manage_company_members()` now explicitly includes `platform_admin`
  - managed profile updates are being narrowed toward company-scoped profile control instead of legacy broad profile-management policy
- live Supabase CLI access is restored on this machine with working remote DB password
- final creator/profile RLS cleanup is now applied live
- company team profile reads are now restored live for owner / manager assignment flows
- owner / manager `Назначение мастера` now shows real master names again instead of falling back to the plain role label
- smoke coverage now explicitly guards against the assignee dropdown degrading back to bare `Мастер`
- creator `Компании` no longer crashes on hidden currency formatter scope errors inside paid-close / company-card rendering
- `public-flow-check` no longer hides a broken Edge Function behind direct `submit_public_lead` RPC fallback
- `platform-paid-close` now reads `companies.is_demo` explicitly before choosing first paid-close targets
- repo now has a dedicated hardening audit for the current stage:
  - no runtime `profiles.role` regressions
  - no public-flow RPC bypass
  - no drift on helper execute grants for public company binding / public intake
- creator now has a dedicated real onboarding queue above the old single-focus card:
  - real owner-leads are grouped into `company / subscription / launch / commercial / ready`
  - creator can close the common next steps directly from one live queue instead of mentally stitching handoff + company + paid-close together
- repo now also has a dedicated CLI report for live real owner-leads:
  - `npm run platform:real-onboarding`
  - the report shows where the first real paid onboarding is stuck before money actually comes in
- payment strategy for the current stage is now fixed:
  - sell first with `manual billing / invoice / transfer`
  - do not block first client sales on Stripe or full self-serve checkout
  - add local Moldova online acquiring only after the first paid onboarding path is clean
- creator paid-onboarding layer is now more operational:
  - company cards now have an explicit `manual billing` pack
  - creator can copy a billing pack for owner contact / amount / login links
  - creator can move a company through `prepare manual / confirm paid / pause without payment`
  - `full launch + manual + access` now exists as a direct operator action
  - paid-readiness wording now pushes creator toward `manual or active billing`, not vague billing language
- creator quick-connect is now tighter for first live onboarding:
  - first-step operator fields are reduced to `company / owner / phone / owner email / niche / plan`
  - `free month` is now implicit by default instead of being one more field in the quick-connect form
  - after company creation the creator lands straight in the paid-close company context, not back into a vague handoff-only state
  - owner access is now auto-created during company creation when owner email is present, and the access pack is available immediately in the same session
  - `free month` quick launch now also promotes the company to `active` and closes the lead into the connected onboarding lane immediately
- real paid-onboarding follow-up is now more operator-ready:
  - demo-request cards can store `creator follow-up` datetime and short creator note
  - the first real onboarding hero now shows follow-up due state instead of only raw handoff fields
  - the real onboarding queue now has a dedicated `follow-up` slice for today/overdue owner leads
  - creator can mark `Связались / Квалифицировать` directly from the real onboarding queue without drilling into the full request card
- creator paid-close is now more operational from overview:
  - invoice queue now has explicit slices for `overdue / today / invoice sent / manual prepared / follow-up`
  - invoice cards now show owner email, payment channel, due date, creator note, and follow-up state together
  - creator can now do `pause after no payment`, jump back into `handoff`, or push a `+1 day / today` follow-up directly from the invoice queue
  - commercial close cards now also show amount, due date, owner contact, creator note, and direct `Pause / Handoff` actions
- companies without `company_subscriptions` no longer depend on hidden manual work:
  - creator can now bootstrap subscription directly from real onboarding hero
  - the same bootstrap action is available in real onboarding queue
  - the same bootstrap action is available in request handoff cards
  - commercial close now can raise a missing-subscription company into a real billing path from overview
- real onboarding queue is now easier to scan for first live onboarding:
  - explicit `manual`
  - explicit `storefront`
  - explicit `free month`
  - direct owner email / source / package+launch visibility inside the queue itself
- creator manual billing is now also stronger for real commercial closing:
  - yearly/manual invoice amount is shown as the real charge, not only MRR
  - invoice queue now uses the real commercial charge context more accurately
  - creator can copy a separate owner payment message and a separate internal operator billing pack
  - payment channel / due date / owner note now persist into creator-side commercial history
- creator overview now also supports fast commercial closing directly from the queue:
  - `manual`
  - `paid`
  - `pack`
  - `full manual`
- the missing `/platform` prop wiring for `full launch` is now fixed, so creator launch actions no longer depend on a hidden runtime gap
- creator now also has a dedicated `commercial close` layer above paid onboarding:
  - highlights `billing only`
  - highlights `company inactive`
  - highlights `team missing`
  - highlights companies that are already good for `manual billing`
- creator can now close the most common paid-onboarding blockers from overview without drilling into company control first:
  - `Active`
  - `Starter bundle`
  - `Manual`
  - `Full manual`
- creator now also gets an explicit `ready pack` shortcut in overview:
  - for companies whose remaining blockers are only standard launch blockers
  - `active / team / services / billing`
  - so creator can close a typical first paid onboarding path in one clearer move
- creator overview now has one explicit `first paid launch` focus card:
  - highlights the best current company to close first
  - shows blockers, billing state, contact, and direct close actions
- creator overview now also splits commercial close into blocker-specific queues:
  - billing only
  - inactive company
  - missing team
  - missing services
  - so the operator does not scan all cards manually
- manual billing flow is now explicit end-to-end inside `/platform`:
  - `manual prepared`
  - `invoice sent`
  - `payment confirmed`
  - `pause without payment`
  - with dedicated history events instead of only implicit note changes
- invoice queue inside creator overview is now actionable:
  - shows commercial stage directly
  - supports `manual / sent / paid / pack`
  - can be used as a real closing queue instead of only a passive reminder list
- paid close now is also split by commercial stage:
  - `not started`
  - `manual prepared`
  - `invoice sent`
  - `payment paused`
  - so creator can see where the money flow stalls without scanning every company card
- creator now gets one explicit recommended next operator action in paid close:
  - in overview
  - in paid focus
  - in company card
  - so the operator no longer has to guess which button should be pressed first
- live DB event history now accepts the creator commercial-close event types actually used by `/platform`:
  - `manual_prepared`
  - `invoice_sent`
  - `payment_confirmed`
  - `payment_paused`
- creator paid-close demo flow is now actually closed in live data:
  - `Detail CRM Demo Center` is `ready_for_paid`
  - `North Bay Demo Center` is `ready_for_paid`
  - both are in `manual billing`
- strict multi-company paid-onboarding QA is now green with `2 ready_for_paid / 0 blocked`
- creator now explicitly separates demo companies from future real paid onboardings:
  - `companies.is_demo` exists in live schema
  - current demo centers are marked as demo
  - creator filters and QA now distinguish `demo` vs `real`
  - strict QA now reports both total paid readiness and real-company paid readiness
- creator now also separates real storefront owner-leads from QA demo-requests:
  - overview has a dedicated `first real onboarding` focus
  - demo requests can be filtered as `real / qa / all`
  - real owner leads are no longer visually mixed with `Structured Auto Service QA` checks
- demo-request cards are now also usable as a direct creator paid-onboarding lane:
  - `manual / storefront` source split is visible in demo control
  - linked real leads can be pushed through `active / manual / sent / paid`
  - operator can copy `Pack` and `Owner msg` directly from the request card without jumping out first
- public entry layer is now hardened further before first real paid onboarding:
  - `public-request` and `demo-request` no longer use wildcard CORS
  - allowed origins are now explicit through shared edge-function CORS control
  - internal alert-style functions no longer work with an optional token path
  - `lead-alert`, `follow-up-reminder`, and `daily-digest` now fail closed without `ALERT_INTERNAL_TOKEN`
- `first real onboarding` now also exposes direct paid-close control in overview:
  - recommended next action
  - `manual`
  - `sent`
  - `paid`
  - `pack`
  - so the first real storefront lead can be pushed toward billing without jumping into company mode first
- QA/operator tooling now depends less on demo-company assumptions:
  - `public-flow-check` now prefers the first active real company and only then falls through the active company list
  - smoke no longer hardcodes `detail-crm-demo` as the public company slug
  - `platform-paid-close` now works from explicit target slugs or real companies instead of fixed demo-company slugs
- repo now also has a direct creator-side bootstrap CLI for the current stage:
  - `npm run platform:bootstrap-company -- --slug=<company-slug>`
  - creates or repairs `company_subscriptions`
  - moves the company into `manual billing ready`
  - removes one more hidden manual tail before the first real paid onboarding
- companies panel now has a dedicated `paid close` mode:
  - almost ready
  - billing only
  - ready pack
  - blocked
  - so first paid onboarding can be run from one narrower operator queue
- `paid close` mode now also has its own current-focus card:
  - shows the top company inside the active paid filter
  - exposes blocker list and direct close actions without scanning the full list first
- storefront positioning is now materially stronger for Moldova auto services:
  - detailing
  - car wash
  - tire service
  - light auto-service / auto studio
- storefront now explicitly sells guided onboarding instead of only self-serve usage
- public status page now shows a fuller customer-facing summary:
  - service
  - amount
  - payment state
  - agreed-work summary
  - photo proof
  - contact actions
- CRM status flow is now closer to a real auto-service order pipeline:
  - `new`
  - `accepted`
  - `diagnostics`
  - `approval`
  - `scheduled`
  - `in_progress`
  - `waiting_client`
  - `waiting_payment`
  - `done`
  - `paid`
  - `follow_up`
- owner dashboard now exposes a faster director-glance layer for operational control
- roadmap and competitive-insight docs now exist under `docs/`

## Done

### Core Product
- live CRM works
- live public request flow works
- live token status page works
- Telegram and automation layer are already connected
- role-aware CRM logic exists

### Storefront / Public Layer
- storefront direction is already shifted away from a simple CRM landing
- public routes for `Главная / Каталог / Тарифы / Блог` exist
- pricing / catalog / blog / owner lead capture exist
- pricing already has 3-plan packaging and owner onboarding capture flow
- public storefront copy now more clearly positions:
  - guided onboarding
  - Telegram-first loop
  - before/after proof
  - client status by link
  - Moldova-local vertical fit

### SaaS / Multi-Company Foundation
- `companies`
- `company_members`
- `company_id`
- company-aware CRM loading
- company-aware public flow
- active/paused/archived company restrictions
- second-company isolation work was already implemented and verified at the app level
- company-switch state carry-over was hardened again at the frontend level
- company-scoped frontend write paths are now less dependent on repeated `company_id || activeCompanyId` chains
- team/service/lead creation mutations now fail fast without a resolved company scope instead of silently leaning on wide fallback writes

### Creator / Platform Layer
- separate `/platform` surface exists
- creator is separated from owner / manager / detailer
- cross-company creator overview exists
- companies list exists
- billing/subscription states exist
- trial / renewal / past-due visibility exists
- MRR / revenue-at-risk overview exists
- usage overview exists
- seat-limit overview exists
- invoice queue exists
- renewal radar exists
- demo-request handling exists inside creator surface
- quick creator actions already exist for company/billing control
- creator UI was recently improved with color-coded statuses and clearer action priority
- creator now has activation queue / handoff queue logic between demo requests and company subscription control
- linked company cards can already show storefront package and billing context from the source request
- creator can now separate handoff cases by `без подписки / мимо тарифа / company inactive / не закрыта`
- demo requests and company cards now show an explicit activation checklist instead of only raw status fields
- creator overview now shows a dedicated hard-QA view for problematic companies before real paid onboarding
- one explicit hard multi-company QA pass was completed from the current live SaaS state at app/operator level
- creator overview now shows which companies are `ready / almost ready / blocked` for real paid onboarding
- creator control is now materially easier to use as an operator console for many companies, not just as a stats page
- creator launch follow-up is now easier to run as an operator discipline, not just as a billing overview
- creator can now push first company credentials from the platform layer itself instead of stopping after workspace creation
- live profile-read visibility for company teams is now repaired, so owner / manager can see actual team names in assignment controls

## Partial

### Platform / Activation Flow
- storefront lead -> selected plan -> billing period -> company activation is now partially connected in creator flow
- storefront demo-request now persists structured commercial context cleanly, but owner/team closing is still not fully automated after workspace creation
- creator control is already strong, but the onboarding/activation flow from storefront into real company provisioning is still not fully closed end-to-end
- creator can now materialize a real company from a storefront lead directly inside `/platform`, but the later owner/team onboarding is still not fully automated
- creator can now materially reduce owner/team closing by issuing starter access from `/platform`, but the later first-login confirmation is still operator-led
- creator launch close is now materially shorter because launch activation and starter access can be closed in one pass, but first-login confirmation is still operator-led
- creator can now close part of paid onboarding directly from the overview queue instead of drilling into each company card first
- creator can now also close common blocker combinations from a dedicated commercial-closing queue instead of only reading readiness cards
- the remaining gap is now less about visibility and more about final automation / hardening after the creator-side operator flow was clarified
- first paid-onboarding discipline is now visible in creator, but not yet fully automated
### Hardening / Cleanup
- some deeper DB/history cleanup around legacy `profiles.role` still remains, but current frontend company-scope carry-over risk was reduced
- some helper grant / security hardening still remains
- repeatable operator QA is now partly automated; the remaining work is the final strict pass and any DB/helper fixes it surfaces
- creator/operator QA semantics are now clearer; the remaining gap is no longer demo-company readiness, but first real paid onboarding discipline and the later security/helper cleanup
- public intake no longer falls back silently into `detail-crm-demo`; client flow now requires explicit company binding
- direct `submit_public_lead(...)` access is narrowed to `anon` only, while the Edge Function remains the structured entrypoint
- creator now separates `first real paid launch` from the demo paid bench, so the next live commercial close is visible without test-company noise
- `default_company_id_by_slug(...)` no longer falls back to `detail-crm-demo`, and its direct execute path is narrowed to `anon`
- demo-specific defaults are now reduced in QA/operator tooling too, so the next paid-close pass is less biased toward demo centers
- current helper/security cleanup is now materially tighter at the verification layer too:
  - `public:flow` verifies the real Edge Function path only
  - paid-close targeting is stricter about `demo` vs `real`
  - hardening audit can fail fast before deploy when those guardrails drift

## Next Actual Block

- prepare the first real paid onboardings from the now-green creator layer:
  - use the current `manual billing / invoice / transfer` flow on the first non-demo company
  - keep the first commercial close operator-led, not self-serve
  - record the first real invoice/payment/activation path end-to-end
- keep payment rollout staged:
  - now: manual billing / invoice / transfer
  - next: local online acquiring for Moldova
  - later: deeper self-serve payment automation if still needed
- after that:
  - remove the remaining helper/security legacy tails
  - only then decide whether to add local online acquiring

### Go-To-Market Packaging
- free-entry packaging exists
- exact free-forever policy and hard limits are not finalized
- positioning against horizontal booking tools is now reflected much better in code and docs, but still needs final GTM tightening around live pricing/billing policy

## Not Started

- no-show protection
- embedded booking widget for partner websites
- branded / white-label app layer
- fully self-serve onboarding for many companies without operator involvement

## Do Not Break

- CRM core
- `/request`
- `/status/:token`
- auth
- Supabase logic
- creator/platform separation
- company-aware foundation
- existing live URL and deploy flow

## Do Not Do Without Explicit Approval

- do not redesign storefront visuals on your own
- do not add explanatory roadmap/product-thinking blocks to public pages
- do not shift the product into a pure marketplace and lose the CRM-by-subscription direction
- do not expand into backend/auth/Supabase work unless it directly supports the current planned block

## Next Actual Block

1. Start the first real paid onboarding from the creator/manual-billing flow that is now green on demo companies.
2. Keep the first commercial close manual:
   - invoice / transfer
   - payment confirmation
   - company activation follow-through
3. Remove the remaining high-risk legacy/security tails that still matter before broader paid onboarding.
   - helper/security cleanup
   - any remaining backend references where legacy role/fallback logic still matters
4. Only after the first real paid close is clean, decide on Moldova online acquiring.

## Working Rule For Future Stages

At the end of each stage, create or refresh one active checkpoint like this before starting the next block.

Each checkpoint must answer only these questions:
- what is definitely done
- what is only partial
- what is explicitly not started
- what must not be touched
- what the next actual block is

This prevents re-doing already closed work and prevents drift between plan, memory, and live code.
