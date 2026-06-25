# Detailing CRM MVP - Status And Next Plan

## Very Short Version

We are no longer at the stage of "building a CRM from zero".

We are at the stage of:
- bringing one understandable live path to the first real paying client

That path is:
- company page -> request -> CRM -> assign master -> photo -> client status -> payment -> delivered -> review -> repeat visit

## Where We Are Now

Current project stage:
- sellable web MVP + storefront + partial SaaS foundation

Current practical focus:
- finish the public company page
- finish the review / repeat loop
- finish one clean creator-to-company onboarding path
- prove the whole path on the first real paying client

We are not currently focused on:
- another storefront redesign
- another broad product branch
- turning the project into a pure marketplace
- full self-serve payments before first live clients

## What Is Already Done

- CRM core works
- public `/request` works
- client `/status/:token` works
- role-aware CRM behavior works
- storefront already exists and sells the product direction
- creator/platform surface already exists
- multi-company foundation already started
- manual billing base already exists
- photo / status / master / partial payment path already advanced materially
- demo cleanup already done without deleting the main system logins

## Current Working Order

### 1. Clean System Check

- [ ] verify creator / owner / manager / master access
- [ ] verify clean CRM after demo cleanup
- [ ] verify no old demo requests block the current flow

### 2. One Fresh Request From Zero

- [ ] create one fresh request
- [ ] verify CRM card appears
- [ ] verify status token appears
- [ ] verify client status link opens

### 3. One Full Request Path

- [ ] new
- [ ] accepted
- [ ] inspection / agreement
- [ ] scheduled / waiting client
- [ ] in work
- [ ] ready for pickup
- [ ] delivered

### 4. Data Consistency Across Surfaces

- [ ] owner
- [ ] manager
- [ ] master
- [ ] client status page

Must match on:
- [ ] status
- [ ] master
- [ ] service
- [ ] amount
- [ ] payment
- [ ] photos

### 5. Public Company Page

- [ ] `/s/:slug` must open reliably
- [ ] company info must come from company data
- [ ] services must be visible
- [ ] CTA to request must work
- [ ] page must be usable as a real sales/demo asset

### 6. Review And Repeat Loop

- [ ] review only after completed / delivered work
- [ ] review saved from client side
- [ ] review shown on public company page
- [ ] repeat visit saved through follow-up logic

### 7. Full Demo / Sales Scenario

- [ ] company page
- [ ] request
- [ ] CRM
- [ ] assign master
- [ ] photo
- [ ] client status
- [ ] payment
- [ ] delivered
- [ ] review

### 8. First Real Paid Onboarding

- [ ] create real owner lead
- [ ] convert into company
- [ ] activate access
- [ ] send manual billing
- [ ] confirm payment
- [ ] leave company active with team/services/access ready

### 9. Payment Layer After First Paid Clients

- [ ] keep manual billing now
- [ ] after first live paid onboardings choose local Moldova acquiring path
- [ ] only then expand online payment strategy

## What Is Deliberately Postponed

- free-forever tier
- no-show protection
- embedded widget
- branded / white-label app
- broad marketplace growth layer
- another major visual redesign wave

## 1. Product Direction

We are building not a large universal CRM, but a focused, sellable mini CRM for local service businesses, starting with auto detailing.

Core positioning:
- mini CRM
- lead dispatcher
- booking + follow-up + reminders system
- detailing lead automation system
- specialized operating stack for detailing / wash / tire / STO, not a generic booking supermarket

Core stack:
- React + Vite
- Supabase
- Supabase Edge Functions
- Supabase Cron
- optional n8n only if needed later
- later: Vercel deployment
- later: mobile app on top of stable web product

Business goal:
- help small businesses stop losing leads
- centralize incoming requests
- manage follow-ups
- automate reminders and alerts
- later sell this as a paid subscription product
- win locally through specialization, onboarding, language, and Telegram-native operations

Product shape:
- internal CRM for owner / manager / later detailer
- separate public client entry form
- automation layer through Supabase-native backend logic
- storefront + catalog + CRM-by-subscription, not just a generic CRM landing

Local advantage vs horizontal tools:
- live onboarding instead of cold self-serve only
- Romanian + Russian operator experience
- understanding of Moldova market context
- Telegram-native flow from day one
- before/after photos as a strong niche feature
- niche-specific flow for auto services instead of one generic "auto repair" form
- customer status page by link as a trust layer for owners and clients
- guided setup and team training as part of the sale, not as an afterthought

Competitive analysis conclusion now locked into the plan:
- Stilio proves the value of local visibility, public profiles, portfolio, and trust-building reviews
- CARBOOK proves the value of auto-specific transparency, work stages, approval, and vehicle history
- EasyWeek proves the value of simple booking with low friction across many channels
- Detail CRM should stay simpler than CARBOOK, more auto-specific than EasyWeek, and operationally deeper than Stilio for auto orders

Current product formula:
- for the customer: `find -> book -> trust`
- for the service: `receive -> execute -> return`

Current execution rule:
- show and sell one real order path, not a tour of all CRM menus
- the demo path is: public page -> phone request -> CRM card -> master assignment -> before photo -> in-work status -> client status link -> after photo -> close -> review / repeat reminder
- the immediate product work is to make this path clean for the first real company before adding broader marketplace features
- current implementation order changed on 2026-06-22: first finish the generated public company page and review / repeat-visit loop, then return to the first real paid onboarding check

This is a narrow MVP for detailing first, with later adaptation possible for:
- cleaning
- STO / repair
- tire service
- mobile service businesses
- other local service operations

## 2. Current Project State

Project path:
- `C:\Users\Iura\Documents\CRM detaling\detailing-crm-mvp-main`

Important source files:
- `PROJECT_HANDOFF.md`
- `README.md`
- `CODEX_PACKAGE/ARCHITECTURE.md`
- `src/App.jsx`
- `src/styles.css`
- `src/crm.js`
- `supabase/schema.sql`
- `supabase/seed.sql`
- `scripts/demo-flow.mjs`

Current stage:
- internal CRM MVP is already working
- public request flow is already live
- token-based customer status page is already live
- photos for customer status are already live
- role-aware visibility is already implemented and verified
- storefront / sales vitrine is already live
- product is now at the checkpoint: sellable web MVP + storefront + SaaS foundation is already partially live
- creator/platform hardening block is now materially further closed:
  - final creator/profile RLS cleanup is applied live
  - company-team profile reads are restored live
  - owner / manager assignee dropdown now resolves real master names again
- next layer is no longer "another CRM screen", but the separate creator / platform-admin surface for subscriptions, activations, and many companies
- next product-layer additions after current SaaS hardening are:
  - free-entry packaging finalization
  - no-show protection
  - embedded booking widget for external sites
  - later white-label / branded app as an upper tier
- payment approach for the current phase is now fixed:
  - first paid clients can be onboarded through manual billing
  - local Moldova online acquiring is the next payment layer
  - full self-serve online subscription checkout is not a blocker for first sales
  - creator handoff now auto-covers starter access roles from owner lead instead of leaving manager/master as a separate manual tail right after company creation
- storefront and CRM copy are now being shifted from generic CRM language toward a stronger vertical auto-service offer

## 3. What Was Already Done

### Base MVP
- Supabase project is connected
- schema and seed were already applied
- auth / login works
- Dashboard works
- Leads works
- Clients works
- Services works
- Settings works
- data is read from Supabase

### Leads MVP Improvements
- New lead form added
- create / reuse client flow added
- lead creation writes to `lead_events`
- timeline / notes added in lead card
- manual note creation added
- `follow_up_at` field and UI added
- lead detail card expanded
- loading / empty / error states improved
- save feedback improved
- submit/actions disabled while saving
- cleaner labels and small UX polish added

### Legacy Webhook Compatibility
- legacy `VITE_N8N_WEBHOOK_URL` frontend compatibility was removed from runtime
- `lead_created` webhook event exists
- `follow_up_updated` webhook event exists
- Settings page shows automation webhook status

### Architecture Shift
- project direction was updated away from `n8n-first`
- new target architecture is:
  - Supabase
  - Edge Functions
  - Cron
- `n8n` is now optional, not the core product layer

### Supabase-Native Automation Live Status
- duplicate `clients.phone` data was cleaned in the live project
- latest schema was applied to the live Supabase project
- public intake flow was verified live
- Edge Functions were deployed live:
  - `lead-alert`
  - `follow-up-reminder`
  - `daily-digest`
- all three passed live invocation after secrets were configured
- Telegram alerts and digest were confirmed working

### Hardening Progress
- live RLS was tightened for `clients`, `services`, `leads`, `lead_events`, `attachments`, and `automation_runs`
- public intake now has a minimal anti-spam layer
- public intake was re-verified live after hardening
- deployed automation was re-verified live after hardening
- full smoke suite now passes (`8 passed, 1 skipped`)
- Romanian localization was pushed further across:
  - CRM UI
  - Telegram automation templates
  - live demo data
  - role copy for `owner / manager / detailer`

### Demo Preparation
- demo-like seed data improved
- believable lead timeline entries added
- automated live demo script added: `npm run demo:flow`
- full live flow was successfully verified on real Supabase session:
  - create lead
  - create/reuse client
  - change status
  - add note
  - set follow-up
  - verify `lead_events`
  - verify webhook events
- live demo data was cleaned from smoke / rate-limit pollution
- one clean `Public Demo Client` scenario was preserved
- topbar identity was cleaned so demo no longer shows test-only naming
- white-screen bug on `Leads` detail open was fixed live
- Google login redirect was corrected through Supabase Auth URL configuration

### Role Layer
- role-aware visibility started
- frontend now moves toward:
  - `owner`
  - `manager`
  - `detailer`
- live role QA was completed

## 4. Important Recovery Note

During role work, `src/App.jsx` became technically corrupted at the byte level and had to be reconstructed.

What was done:
- `App.jsx` was restored
- role-aware visibility was rebuilt into the restored file
- build was verified again successfully

Current status after recovery:
- project builds successfully
- `npm run build` passes

## 5. Current Functional Status

### Done
- internal CRM MVP works
- demo-ready leads flow works
- timeline / notes / follow-up work
- webhook wiring works
- demo flow was verified
- frontend role layer has been added
- public intake works live
- Supabase-native automation works live

### In Progress
- legacy `n8n` leftovers were reduced to compatibility-only references
- access control can still be strengthened further for future SaaS-grade isolation
- product is now in UI-polished, QA-closed, demo-ready state
- multi-tenant database foundation has been drafted in migrations
- next active engineering step is company-aware SaaS foundation, not a redesign of the current MVP
- production database foundation is already applied at the base level (`companies`, `company_members`, `company_id`)
- company-aware `public-request` and `lead-alert` are deployed live
- per-company client phone uniqueness is already applied in production
- first company-scoped core RLS layer is already applied in production
- frontend now derives the current role from company membership when available
- frontend main CRM loader is now scoped by `activeCompanyId`
- top bar now has the first visible company context / selector layer
- frontend helper writes now require explicit company context instead of silently falling back to global behavior
- public flow verification scripts now resolve services inside the active company, not across the whole project
- local `supabase/schema.sql` has now been synced to the company-aware SaaS foundation so new environments do not lag behind the live migrations
- smoke suite is green after the SaaS-foundation apply (`9/9 passed`)
- live public flow is green after the SaaS-foundation apply
- helper grants were tightened for non-essential `anon` exposure
- some `authenticated` helper grants were intentionally kept because current company-scoped RLS depends on them
- next hardening step is refactoring policy-helper exposure more deeply only if we want stricter SaaS isolation later
- Supabase CLI auth on this machine is restored
- remote migration history was reconciled with local files
- duplicate legacy version `20260610` was repaired in remote history
- `supabase db push --linked --include-all --dry-run` now returns `Remote database is up to date`
- the next SaaS planning surface is now explicitly split into:
  - client companies using the CRM
  - creator / platform-admin controlling activations and subscriptions
- creator / platform-admin surface is already live beyond a basic foundation:
  - cross-company overview
  - companies list
  - subscription and billing states
  - trial / renewal / past-due visibility
  - usage overview
  - MRR / revenue-at-risk visibility
  - invoice queue
  - seat-limit visibility
  - quick creator actions
  - demo-request handling
- creator surface now also has a clearer operator control layer:
  - autopilot companies
  - billing-control queue
  - onboarding queue
  - ready-to-bill queue
  - QA / hardening queue
- creator can now create a paused company + starter trial directly from a storefront demo-request and continue the handoff in `/platform`
- creator can now seed niche service presets for that company directly from `/platform`
- creator quick-connect for the first live owner is now materially compressed:
  - first step keeps only company / owner / phone / owner email / niche / plan
  - `free month` is the default launch mode instead of one more operator field
  - after company creation creator lands back in paid-close context with plan, owner contact, next step, trial visibility, and auto-created owner login when email is present
  - `free month` quick launch now also делает компанию `active` и переводит лид сразу в `connected`, чтобы не тратить ещё один ручной шаг на базовую активацию
- storefront demo-request now keeps selected package, billing period, role, team size, and location count as structured handoff data for creator operations
- live verification now checks not only public client intake but also structured owner onboarding intake via `demo-request`
- multi-company creator readiness can now be checked with a repeatable CLI pass instead of only manual inspection inside `/platform`
- creator QA automation now also groups go-live blockers by type and supports a strict pre-payment mode
- creator UI and `platform:qa` now use one shared readiness logic, so the operator sees the same blockers in UI and CLI
- paid readiness is now separated from `risk clean`, which removes the old ambiguity where strict QA could be green while `ready_for_paid` was still zero
- creator launch control now shows not only billing state but also who exactly the launch is waiting on:
  - handoff
  - owner
  - team
  - services
  - billing
  - ready
- linked company cards now provide a creator-side onboarding pack with quick links for owner/team closing
- owner / manager assignment flow now reads real detailer names instead of degrading to role-only labels

## 6. Immediate Next Block

The next actual execution block is no longer creator visibility or creator RLS.

The next block is:
- compress creator onboarding into a fast operator preset for first connections
- keep only the minimum creator fields needed to launch a company fast
- support one-click `free month` launch with owner + trial + starter services
- close the first real paid-onboarding path from `/platform`
- make `almost_ready -> ready_for_paid` more operator-clear
- then run one final strict multi-company QA pass
- then move into first real company onboarding / payment collection readiness
- linked company cards can now also create starter access for `owner / manager / master` directly from `/platform`, so launch closing no longer stops at company creation alone
- linked company cards now also support launch bundles for `active + billing + service pack + handoff close`, so creator can move a company much faster through first paid onboarding
- creator can now also close `launch + starter access` in one pass without duplicating already existing owner / manager / master roles
- paid-readiness now separates owner presence from real working-team readiness, so owner-only access no longer looks like a fully connected team
- company launch mode is now easier to operate at scale because waiting cases can be filtered directly by blocker type
- company billing and QA modes are now also easier to operate at scale because risky cases can be filtered directly by subtype
- multi-company frontend hardening improved again: company switch now clears scoped state before reload and smoke-checks that company context does not visibly leak
- multi-company frontend write paths are also stricter now because company context is resolved through a shared helper instead of being repeated ad hoc
- lead creation plus team/service mutations now use the same explicit company-scope resolution instead of leaning on broad `activeCompanyId` fallbacks
- pricing is moving toward a lower-barrier entry model with a free package and clearer annual/monthly packaging

### Not Started Yet
- multi-company onboarding flow for self-serve creation
- onboarding flow for many paying companies
- no-show protection layer
- embedded booking widget for partner sites / external landing pages
- free-forever policy decision with hard limits
- React Native / Expo app
- App Store / Play Market packaging
- branded white-label app layer for premium plans

## 5A. Platform Admin Direction

To sell this not as "one CRM for one center" but as a real shared SaaS, we need one more product surface above company CRM:

- a separate creator / platform-admin cabinet
- not mixed into owner / manager / detailer permissions
- used only by the product owner / operator

This surface now already answers at a first working level:

- which companies are active
- which companies are on trial
- which companies are paused
- which plan each company has
- who owns the company account
- when the subscription starts / ends
- how to quickly open the company context

Current remaining gap:

- creator quick-connect is still too heavy for rapid free-month launches
- first-step creator form should be reduced to only:
  - company name
  - niche
  - owner name
  - owner phone
  - owner email
  - plan
  - billing period / free month
  - team size
  - location count
- company creation should auto-generate the rest:
  - slug
  - owner login
  - trial dates
  - starter service pack
  - handoff pack
- finish the chain from storefront lead into real company activation and subscription handling
- automate more of the owner/team closing after creator already sees the right next step
- run one hard multi-company QA pass from the current live SaaS state
  - [x] creator-side QA/readiness layer added in `/platform`
  - [x] current live verification reconfirmed with `build + public flow + smoke`

Recommended technical direction:

- keep company roles inside `company_members`
- keep creator access outside company roles
- introduce a separate platform-level access model
- build the first route as `/platform`
- later move it to a dedicated admin subdomain if needed

## 6. Role Model We Are Moving Toward

### Owner
- sees everything
- full internal CRM access

### Manager
- sees leads / clients / services
- can create leads
- can change statuses
- can manage follow-up
- can add notes

### Detailer
- should only see assigned work
- should not manage the full pipeline
- in current MVP direction:
  - can view assigned leads
  - cannot create leads
  - cannot change follow-up
  - cannot add manager notes

### Client
- does not log into CRM
- later uses separate public form / status layer
- next customer-facing step should be a token-based status page, not a full cabinet

## 7. Where We Are Right Now

We are no longer at the "start building the MVP" stage.

We are now at this stage:
- internal CRM is live and usable
- public customer loop is live end to end
- storefront is live
- creator / platform-admin surface is already live as a real operator layer
- multi-company SaaS foundation is partially live
- the next real move is not another storefront pass, but:
  - sync the broader plan with the real code state
  - finish storefront lead -> plan -> activation flow
  - run a hard multi-company QA pass

In practical terms:
- the internal back-office part is already strong enough to show
- the public/customer loop is already strong enough to sell manually
- the next big value jump now comes from making the SaaS activation/control path cleaner for many companies

## 8. Strategic Direction

The product direction is:

1. Build a strong internal CRM for small service businesses
2. Add a public lead intake layer
3. Add automations and reminders inside Supabase-native backend logic
4. Build a clear public-facing site and visual product layer around it
5. Add onboarding / usage instructions
6. Add QA / testing discipline and protection work
7. Package it as a sellable system
8. Later turn it into a reusable SaaS product
9. Add a PWA-first customer shell
10. Later optionally add a mobile app

This means:
- web first
- workflow first
- automation first
- clarity first
- safety first
- token-based customer visibility before customer auth complexity
- SaaS later
- mobile later

## 9. Roadmap

| Stage | Goal | Status | Notes |
|---|---|---|---|
| 1 | Stabilize internal CRM MVP | Done | Base CRM is working |
| 2 | Add New Lead flow | Done | Create / reuse client works |
| 3 | Add timeline / notes / follow-up | Done | Lead card now has workflow history |
| 4 | Prepare initial webhook/event layer | Done | Webhook wiring exists, but is no longer the main architecture target |
| 5 | Demo polish | Done | Better UX, better demo data, live flow verified |
| 6 | Add role-aware visibility | Done | Verified through single-user live QA path |
| 7 | Build public client entry form | Done | Implemented and verified live |
| 8 | Add Supabase-native automation flows | Done | Edge Functions deployed and verified live |
| 9 | Strengthen UX / visual system | Done | CRM and public surface were redesigned and polished |
| 10 | Build public-facing site layer | Done | Request flow and login/public visual surface now feel like one product |
| 11 | Create onboarding / usage layer | Done | Instructions, roles, and usage path are documented |
| 12 | Create QA / testing discipline | Done | Manual QA plus green smoke suite are now in place |
| 13 | Keep security / protection active | Active | RLS, anti-spam, and safe operations remain a standing stream |
| 14 | Package as sellable product | Active | Demo story + offer + onboarding + visual confidence are now largely ready |
| 15 | Move toward SaaS model | Later | Multi-business structure |
| 16 | Mobile app | Later | Only after stable web CRM + stable backend automations |

## 10. Recommended Immediate Next Steps

### Step 1. Keep hardening active
- keep RLS strong
- keep anti-spam active
- maintain live automation safety
- keep safety and protection visible in the plan, not hidden in the background
- use `CODEX_PACKAGE/SECURITY_AUDIT.md` as current audit baseline
- keep `public-request` Edge Function as the active server-side throttle layer for public intake

### Step 2. Finish the SaaS operator chain
- storefront owner lead
- selected plan
- billing period
- creator follow-up queue (`follow-up / status / note`) is now in `/platform`, next is to use it on a real owner lead
- invoice / paid-close queue is now also narrowed in `/platform` with due/follow-up slices and direct `pause / handoff / follow-up` actions
- subscription bootstrap for companies without `company_subscriptions` is now also available directly from creator overview/queue
- company activation
- clean handoff into the real company context

### Step 3. Run a hard multi-company QA pass
- repeatable smoke tests now exist
- keep role verification fresh across companies
- keep company isolation verification explicit
- keep pre-deploy verification active for creator/platform changes

### Step 5. Keep customer access lightweight
- do not rush a full client cabinet before first sales
- if customer access is added next, prefer `/status/:token`
- only build full client auth after:
  - public form is simplified
  - CRM demo flow is stable
  - event/photo visibility is explicitly split into customer-safe and internal data

### Step 4. Keep architecture written down
- use `CODEX_PACKAGE/ARCHITECTURE.md` as current source of truth
- update it when core architecture changes

## 11. Suggested Execution Order

Recommended order from here:

1. Keep hardening active
2. Finish storefront lead -> activation flow
3. Run hard multi-company QA
4. Prepare first real paying-company onboarding
5. Only after that deepen product add-ons like no-show protection / widget
6. Prepare mobile app layer only after stable web + SaaS operator core

## 12. Short Plain Summary

What we are building:
- a focused CRM + automation + intake workflow product for detailing businesses

What is already true:
- the internal CRM already works
- lead workflow already works
- follow-up workflow already works
- webhook wiring already works
- demo flow already works
- public intake works live
- Telegram automations work live

What is happening now:
- the architecture is now formally documented
- QA is now formally closed
- UI polish and demo cleanup are complete
- hardening remains active in parallel
- the next step is commercial readiness, storefront freeze, and first real demo conversations
- smoke suite is green again (`9/9 passed`) after aligning QA with the current storefront + `/login` routing
- public request backend check is green, while public Edge Function rate limiting remains intentionally active

What comes next:
- cleaner SaaS operator flow from storefront lead into activation
- hard multi-company QA from the current live state
- first real paying-company onboarding
- product add-ons after SaaS flow is cleaner:
  - no-show protection
  - embedded widget
  - later branded app layer

## 14. Current Checkpoint

We are currently here:

- internal CRM is working live
- public request flow is working live
- token status page is working live
- Telegram manager notifications are working live
- customer-ready Telegram linkage foundation exists
- role layer for owner / manager / detailer is already in place
- storefront / showcase now exists as a separate live sales layer

This means the project is no longer in build-from-scratch mode.

The current real stage is:

- sellable web MVP
- polished showcase + CRM + public flow
- pre-SaaS architecture preparation

Immediate practical next move:

1. freeze the current MVP state
2. keep one clean production demo path
3. finish activation/subscription flow from storefront lead into creator control
4. run hard multi-company QA
5. only then deepen SaaS structure for first real paying companies

## 13. Resume Prompt For Future Codex Session

If continuing later on another computer, use this context:

"Open the project `detailing-crm-mvp-main`. Read `PROJECT_HANDOFF.md`, `PROJECT_STATUS_PLAN.md`, `NEXT_TASKS.md`, `CODEX_PACKAGE/PACKAGE_INDEX.md`, and `CODEX_PACKAGE/MASTER_EXECUTION_ROADMAP_2026-06-03.md`. This is a detailing CRM MVP built with React + Vite + Supabase. The architecture has shifted away from `n8n-first` toward `Supabase + Edge Functions + Cron`. Internal CRM works, public intake works live, automation works live, role QA has already been verified through a single-user path, and the next active priorities are: strengthen the UX / visual system, strengthen the public-facing product layer, build onboarding and usage documentation, make QA/testing discipline explicit, keep safety/hardening active, and finalize the sales demo layer. Keep the product narrow, sellable, and MVP-level. Do not turn it into a large universal CRM." 
