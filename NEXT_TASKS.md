# NEXT TASKS

## Where We Are Now

Current stage:
- sellable web MVP + storefront + partial SaaS foundation

Current real focus:
- prove one clean end-to-end path before the first real paying client
- not another redesign, not another wide feature branch

Current target path:
- public company page -> request -> CRM -> assign master -> photo -> client status -> payment -> delivered -> review -> repeat visit

## What Is Already Closed

- CRM core is live
- public `/request` is live
- client `/status/:token` is live
- storefront is live
- creator/platform surface already exists
- multi-company foundation is already started
- manual billing base already exists
- owner / manager / master flows are already materially assembled
- photo / master / status / partial payment path has already been largely fixed
- demo cleanup was already done without deleting the core profiles/logins

## Step-By-Step Working Order

### Block 1. Clean Verification After Demo Cleanup

- [ ] Verify clean base after demo cleanup
- [ ] Verify creator login works
- [ ] Verify owner login works
- [ ] Verify manager login works
- [ ] Verify master login works
- [ ] Verify old demo requests are gone
- [ ] Verify old demo clients are gone
- [ ] Verify CRM opens empty/clean where it should

### Block 2. Fresh Request From Zero

- [ ] Create one new clean test request
- [ ] Verify lead is created
- [ ] Verify client is created
- [ ] Verify request card is created in CRM
- [ ] Verify status token is created
- [ ] Verify client status link opens correctly

### Block 3. Full Working Path Of One Request

- [ ] Verify `new`
- [ ] Verify `accepted`
- [ ] Verify `inspection / agreement`
- [ ] Verify `scheduled / waiting client`
- [ ] Verify `in work`
- [ ] Verify `ready for pickup`
- [ ] Verify `delivered`

### Block 4. Cross-Surface Consistency

- [ ] Verify owner card matches real request data
- [ ] Verify manager card matches real request data
- [ ] Verify master card matches real request data
- [ ] Verify `/status/:token` matches the same request data
- [ ] Verify status wording is identical across all surfaces
- [ ] Verify selected request stays selected after refresh

### Block 5. Operational Data On The Request

- [ ] Verify master assignment works and is visible to client
- [ ] Verify service is visible everywhere it should be
- [ ] Verify amount is visible everywhere it should be
- [ ] Verify payment save works reliably
- [ ] Verify remaining balance updates correctly
- [ ] Verify before/after photos save correctly
- [ ] Verify photos appear on client status page

### Block 6. Public Company Page

- [ ] Finish `/s/:slug` route as a real company page
- [ ] Verify slug route opens without 404
- [ ] Show company name, niche and active status
- [ ] Show services from CRM company data
- [ ] Show prices in lightweight public format
- [ ] Show main CTA to create request
- [ ] Show basic visual proof / gallery block

### Block 7. Reviews After Completed Work

- [ ] Show review block only after completed / delivered work
- [ ] Save review from client status page
- [ ] Bind saved review to the right company
- [ ] Render saved review on public company page
- [ ] Keep review flow out of unfinished requests

### Block 8. Repeat Visit Loop

- [ ] Verify `follow_up_at` is set correctly
- [ ] Verify quick buttons `30 / 60 / 90 days`
- [ ] Verify repeat visit reminder is visible in CRM
- [ ] Verify closed request can move into repeat-visit logic

### Block 9. Full Demo / Sales Scenario

- [ ] Run full sales path: company page -> request -> CRM -> assign master
- [ ] Run photo flow
- [ ] Run status page flow
- [ ] Run payment flow
- [ ] Run delivered flow
- [ ] Run review flow
- [ ] Run repeat-visit flow

### Block 10. First Real Paid Onboarding

- [ ] Create one real owner lead through creator/platform
- [ ] Convert lead into company
- [ ] Activate company
- [ ] Prepare starter access
- [ ] Send manual billing
- [ ] Confirm payment
- [ ] Confirm active company with working team/services/access
- [ ] Fix any real-world friction discovered on the way

### Block 11. Payments After First Clients

- [ ] Keep manual billing as current working model
- [ ] After first live paid clients, choose local Moldova acquiring path
- [ ] Only after that decide on broader online payment rollout

## What We Are Not Doing Now

- [ ] broad marketplace expansion
- [ ] free-forever tier launch
- [ ] no-show protection
- [ ] embedded widget for external sites
- [ ] branded / white-label app
- [ ] big premium redesign wave
- [ ] deep new product branches not needed for first sales

## Current Focus

Freeze the first sellable web MVP, keep the showcase polished on one live URL, then move into SaaS foundation work without breaking the existing CRM.

## Strategic Direction

Keep the first go-to-market focused on detailing, but prepare the architecture so the product can later work as a shared SaaS platform for many companies across auto-service niches.

### Competitive Analysis Translation Into Product Work
- [ ] current active block before first real onboarding: automatic company page + real-review trust loop
  - [ ] add `/s/:companySlug` public page generated from the company slug
  - [ ] keep links domain-safe through the current origin, not hard-coded to the here.now slug
  - [ ] show active services with `from` pricing on the company page
  - [ ] request reviews only from completed token status pages
  - [ ] show public reviews on the company page
  - [ ] use existing `follow_up_at` as the first repeat-visit reminder layer
- [x] lock the new product formula for sales and planning:
  - [x] customer side: `find -> book -> trust`
  - [x] service side: `receive -> execute -> return`
- [x] keep the product framed as `storefront + request + CRM + client status + repeat visit`, not as "just CRM"
- [ ] turn the sales demo into one clear order story:
  - [ ] open the public business page
  - [ ] submit a request from phone
  - [ ] show the request inside CRM
  - [ ] assign manager / master
  - [ ] add before-work photo
  - [ ] move the order into `in work`
  - [ ] open the client status link
  - [ ] add after-work photo and close the order
  - [ ] prepare review / repeat-visit follow-up
- [ ] strengthen the business public page layer before broad selling:
  - [ ] show service list with `from` pricing
  - [ ] show address / city / district
  - [ ] show portfolio / before-after proof
  - [ ] show direct request CTA
  - [ ] prepare QR / direct link usage for Instagram, Google profile, and reception desk
- [ ] add source tracking for every lead:
  - [ ] public website
  - [ ] Instagram
  - [ ] Google
  - [ ] Telegram / WhatsApp
  - [ ] manual / phone
  - [ ] creator / owner handoff
- [ ] add post-completion trust loop:
  - [ ] request review only after a completed order
  - [ ] keep reviews tied to real completed work
  - [ ] plan repeat-visit reminder after completion
- [ ] keep the first sales promise honest:
  - [x] do not promise guaranteed new-client traffic before catalog demand exists
  - [x] sell order control, client trust, photo proof, and repeat visits first
  - [ ] use the catalog as a later growth layer after enough real companies are connected
- [ ] keep auto-services as the active sales vertical:
  - [x] detailing
  - [x] car wash
  - [x] tire service
  - [x] light auto-service / auto studio
  - [ ] do not open beauty / broad marketplace positioning in the current phase

### Product Surfaces To Maintain
- [x] keep 3 distinct product surfaces:
  - [x] marketing site / showcase
  - [x] internal CRM
  - [x] customer-facing request + status flow
- [x] make the marketing site the sales entrypoint for owners of detailing shops, car washes, and tire services
- [x] keep the CRM as the operational system, not the public sales website
- [x] keep `/request` and `/status/:token` as customer workflow pages, not the main product showcase

### Platform Direction To Lock Early
- [ ] keep the product core universal for `auto services`, not hard-coded only for one detailing center
- [ ] keep the first sales packaging narrow: `detailing CRM first`
- [x] prepare the backend for future `multi-tenant SaaS`
- [ ] keep a separate `platform admin` surface for the creator, not mixed into client CRM
  - [x] creator login is already separated from owner / manager / master demo accounts
  - [x] first `/platform` surface is already live
  - [x] platform-admin RLS is extended for cross-company reads needed by creator metrics
- [ ] prepare the domain model for future business modes:
  - [ ] `detailing`
  - [ ] `car_wash`
  - [ ] `tire_service`
- [ ] keep niche-specific logic configurable instead of baking it deeply into the core schema

### Marketing Site Direction
- [x] build a dedicated marketing / pricing website for product sales
- [x] position the product around business outcomes, not just CRM features
- [ ] clearly position the product against horizontal booking tools:
  - [x] local onboarding instead of pure self-serve
  - [x] Romanian + Russian operator experience
  - [x] auto-service specialization instead of a generic "all businesses" flow
  - [x] Telegram-first operating loop
  - [x] photo before/after as a core differentiator
- [ ] do a full visual redesign pass toward a premium US-style look:
  - [ ] simpler and more expensive visual language
  - [ ] cleaner spacing and stronger typography
  - [ ] more confidence and less "local utility" feel
  - [ ] premium screenshots / mockups instead of text-first sections
  - [ ] keep it restrained, but make it look expensive
  - [x] lock external visual reference direction for redesign
    - [x] dark premium mobile-first presentation
    - [x] one bright mint / turquoise accent color
    - [x] large confident headlines
    - [x] app-like navigation feel
    - [x] simple but expensive block composition
    - [x] take style cues only, not beauty-marketplace product logic
- [x] prepare pages:
  - [x] `/`
  - [x] `/features`
  - [x] `/pricing`
  - [x] `/demo`
  - [x] `/login`
- [ ] show screens for:
  - [x] director dashboard
  - [x] manager workflow
  - [x] master workflow
  - [x] customer status page
- [ ] present vertical fit for:
  - [x] detailing
  - [x] car wash
  - [x] tire service
  - [x] light auto-service / auto studio framing
- [x] include product pricing / subscription packaging
- [x] include demo CTA and lead capture for owners
- [ ] keep a low-barrier acquisition layer in pricing:
  - [x] first free entry package is already live on storefront
  - [ ] decide whether this becomes a true `free forever` tier with hard monthly limits
  - [ ] define exact cap for free entry (`requests`, `users`, `features`)

### What Must Be Universal From Day One
- [ ] companies / workspaces
- [ ] users and role membership per company
- [ ] platform-level admins
- [ ] company activation state
- [ ] company subscriptions / plans
- [ ] clients
- [ ] vehicles
- [ ] services
- [ ] leads / work orders
- [ ] statuses
- [ ] payments
- [ ] notifications
- [ ] reporting foundations

### Payment Rollout For Current Stage
- [x] do not block first sales on full online checkout
- [x] use `manual billing / invoice / transfer` for the first real clients
- [x] add clear creator-side manual billing flow for first paid companies:
  - [x] issue invoice / payment instructions
  - [x] mark subscription as paid in `/platform`
  - [x] activate company after payment confirmation
  - [x] expose the same paid-close controls directly in the `Real onboarding` focus block for the first real storefront lead
  - [x] remove demo-company hardcoding from the main paid-close / public-flow QA tooling so the next commercial pass targets live companies more cleanly
  - [x] add a dedicated real-onboarding queue so live owner-leads are visible as one operational pipeline instead of one focus card only
  - [x] add a separate CLI report for real owner-leads (`platform:real-onboarding`)
  - [x] auto-create starter access coverage from owner lead when company is created from creator handoff
- [ ] after first paid onboardings are stable, evaluate local Moldova online acquiring
- [ ] do not make Stripe a blocker for the first client visits

### What Must Stay Configurable Per Niche
- [ ] service presets
- [ ] status pipelines
- [ ] intake form fields
- [ ] vehicle inspection fields
- [ ] master checklist steps
- [ ] dashboard widgets
- [ ] finance labels and report slices
- [ ] customer-facing wording and flows

### Layer-1 Product Additions To Plan
- [ ] add `no-show protection` for booked slots:
  - [ ] deposit / prepayment-ready architecture
  - [ ] reminder + confirmation flow before appointment
  - [ ] operator-visible no-show / confirmed status
- [ ] add `embedded booking widget` for studios with an existing site:
  - [ ] embeddable booking button / widget
  - [ ] keep booking on the studio surface instead of forcing a marketplace-only flow
  - [ ] support Instagram / site / landing usage as a sales argument
- [ ] later add `branded app / white-label app` as a higher-tier SaaS feature:
  - [ ] not current phase
  - [ ] future premium / enterprise layer
  - [ ] separate roadmap from the current web MVP and SaaS hardening

### Immediate Architecture Prep For SaaS
- [x] add first foundation migration for `companies`, `company_members`, and nullable `company_id`
- [x] add backfill migration for the first live company and current users/data
- [x] add migration for per-company client phone uniqueness
- [x] add first company-scoped core RLS migration draft
- [x] audit the prepared multi-tenant foundation in repo and confirm the next execution order
- [x] prepare transitional company-aware public flow migration draft
- [x] apply `companies`
- [x] apply `company_members`
- [x] apply `company_id` through the main CRM tables in live
- [x] backfill current live company, users, services, and CRM data
- [ ] migrate away from global `profiles.role` toward role-per-company
  - [x] frontend session role is already resolved from `company_members`
  - [x] team-role edits no longer write company role back into local `profile.role` state
  - [x] `profiles.role` is downgraded to legacy/non-required schema field
  - [x] active Edge Functions no longer authorize via `profiles.role`
  - [~] remove remaining backend / legacy references where `profiles.role` still acts as a fallback
    - [x] creator/company-member RLS cleanup is prepared locally in migrations and app flow
    - [x] apply the final cleanup migration live through Supabase CLI
    - [x] restore `profiles` select policy for company-team reads so owner/manager assignee controls show real master names
- [x] remove globally unique client phone assumption and move to per-company uniqueness
- [x] make public intake company-aware
- [x] apply transitional company-aware public flow layer in live
- [x] prepare local code for company-aware `public-request` and `lead-alert`
- [x] deploy updated Edge Functions (`public-request`, `lead-alert`) to production Supabase
- [x] make Telegram/integrations company-aware
- [x] introduce `business_type` at company level for future vertical modes
- [x] introduce `activeCompanyId` in frontend session flow
- [x] sync local `supabase/schema.sql` with the live company-aware migrations
- [x] filter CRM reads/writes by `company_id` in frontend helpers
  - [x] company-scoped CRM reads in main frontend loader
  - [x] active company visible/selectable in top bar
  - [x] active company is persisted locally between sessions
  - [x] owner company settings screen is live
  - [x] finish explicit company-scoped updates for all mutable frontend actions
  - [x] remove helper-level fallback writes without active company context
  - [x] make public flow checks use company-scoped service selection
- [x] make lead creation helpers company-aware
- [x] make `/request` company-aware via `company_slug` or equivalent
- [x] allow public request flow only for active companies
- [x] allow anonymous public service list only for active companies
- [x] block company-link self-registration for paused / archived companies in login UI
- [x] make paused / archived company read-only inside CRM for company-scoped mutations
- [x] enforce paused / archived read-only at database RLS level for company-scoped writes
- [x] verify live schema vs prepared multi-tenant migrations before first apply
- [x] prepare safe production apply order for multi-tenant foundation
- [ ] harden exposed `SECURITY DEFINER` helper functions with tighter `EXECUTE` grants
  - [x] revoke unnecessary helper grants from `anon`
  - [x] keep policy-critical helper grants for `authenticated` where live RLS depends on them
  - [x] remove hardcoded demo-company fallback from public intake runtime and require explicit `company_slug`
  - [x] restrict direct `submit_public_lead(...)` execute to `anon` only instead of broad authenticated access
  - [x] remove `detail-crm-demo` fallback from `default_company_id_by_slug(...)` and narrow its execute grant to `anon`
  - [x] remove direct `submit_public_lead` RPC fallback from `public-flow-check`
  - [x] add repo-level hardening audit for helper grants and runtime legacy regressions
  - [ ] later refactor remaining helper functions if we want to remove authenticated exposure entirely
- [x] review company-scoped RLS after the next explicit multi-company test
- [x] close one platform-wide RLS leak:
  - [x] `rate_limit_events` is now readable only by `platform_admin`
- [x] verify live multi-company isolation with a second company in production
  - [x] create second live test company
  - [x] seed one service + one client + one lead inside the second company
  - [x] verify owner can see both companies
  - [x] verify manager only sees the assigned company
  - [x] verify detailer only sees the assigned company
  - [x] verify `/request` can create a lead in the second company by `company_slug`
  - [x] scope `companies` select policy so authenticated users do not see all active companies
- [x] reconcile remote Supabase migration history with the local repo before the next broad `db push`
  - [x] restore working CLI auth + project link on this machine
  - [x] fetch remote migration files and remove duplicate local history files
  - [x] repair legacy duplicate remote version `20260610`
  - [x] confirm `supabase db push --linked --include-all --dry-run` returns `Remote database is up to date`
- [x] prepare the creator / platform-admin foundation:
  - [x] define separate platform-admin access model
  - [x] define company subscription model
  - [x] define company activation / pause flow
  - [x] define what the creator sees:
    - [x] companies list
    - [x] plan / billing status
    - [x] activation state
    - [x] trial / paid dates
    - [x] quick open into company context:
      - [x] company login deep link
      - [x] public request deep link
    - [x] owner contact
    - [x] date of connection
  - [x] prepare separate route/surface for the creator panel

## Current Priority Plan

### 0. Prepare the sales layer
- [x] finalize the structure of the marketing site
- [x] define the homepage offer and messaging
- [x] define pricing packages for subscriptions
- [x] define demo CTA flow for owners
- [x] collect product screenshots for the showcase
- [x] build the first modern site-vitrine
- [x] connect it cleanly to CRM login and demo routes
- [x] polish the live storefront navigation, contacts block, pricing blocks, and demo sections
- [x] freeze the storefront and move focus back to SaaS foundation
- [ ] keep sales packaging aligned with real GTM:
  - [ ] free entry
  - [x] guided onboarding
  - [x] niche-specialized messaging for detailing / wash / tire / STO
- [ ] schedule a dedicated premium redesign pass for the storefront after SaaS hardening
  - [x] lock the redesign intent: `simpler, more expensive, more US-style`
  - [x] record a separate redesign gate checklist in `CODEX_PACKAGE/PREMIUM_REDESIGN_GATE_2026-06-17.md`
  - [x] do not start the full redesign before the gate checklist is green

### 0A. Prepare the creator control panel
- [x] create a separate creator / platform-admin cabinet
- [x] do not mix creator controls into owner / manager / detailer CRM
- [ ] keep this surface on its own route first:
  - [x] creator surface now has a clearer operator control model:
    - [x] autopilot companies
    - [x] billing-control queue
    - [x] onboarding queue
    - [x] ready-to-bill queue
    - [x] QA / hardening queue
  - [x] companies panel now supports dedicated `billing` and `autopilot` views
  - [x] company card now shows creator-facing next-step control state
  - [x] demo-request can now create a paused company + trial directly into creator handoff
  - [x] creator can now load niche service presets for a company directly from `/platform`
  - [x] creator launch pipeline now explicitly splits waiting cases into `handoff / owner / team / services / billing / ready`
  - [x] company card now has a copyable onboarding/handoff pack for owner-team closing
  - [x] companies launch mode now supports direct subfilters by blocker type
  - [x] companies billing mode now supports direct subfilters by billing risk type
  - [x] companies QA mode now supports direct subfilters by issue type
  - [x] company switch now hard-resets company-scoped state before reload
  - [x] smoke suite now covers company switch isolation when multi-company access exists
  - [x] company-scoped frontend write paths now resolve explicit company context through one shared helper
  - [x] company-scoped lead/team/service mutations now fail fast without a resolved company scope
  - [x] storefront demo-request now preserves structured plan/billing/role/team handoff for creator flow
  - [x] public flow verification now also checks structured demo-request onboarding payload
  - [x] creator now has a repeatable `platform:qa` script for multi-company readiness checks
  - [x] creator now has `platform:qa:strict` and blocker-group reporting for final paid-onboarding checks
  - [x] creator UI and `platform:qa` now use aligned readiness semantics so `risk clean` is not confused with `ready for paid`
  - [x] paid onboarding now exposes exact blockers + next commercial step per company
  - [x] paid close is now also split by commercial stage (`not started / manual prepared / invoice sent / payment paused`)
  - [x] paid close now also surfaces one primary operator action instead of only a long button list
  - [x] creator can now generate starter access packs for `owner / manager / master` directly from company control in `/platform`
  - [x] creator can now run launch bundles from company control for `active + billing + service pack + connected handoff`
  - [x] creator can now close `launch + starter access` in one pass without duplicating existing roles
  - [x] paid-readiness now separates owner from real working team, so owner-only access no longer passes as team-ready
  - [x] owner / manager lead assignment now reads real detailer profile names again instead of role-only fallback labels
  - [x] `/platform`
  - [ ] later optional separate subdomain such as `admin.detailcrm...`
- [ ] first version should include:
  - [x] companies table
  - [x] activation status
  - [x] subscription plan
  - [x] trial / paid dates
  - [x] company owner contact

### 0B. What Is Actually Next Now
- [x] close the demo paid-onboarding operating path from creator
  - [x] push `almost_ready` companies into `ready_for_paid`
  - [x] remove the remaining demo-company ambiguity around `billing mode / active status / team presence`
  - [x] verify strict multi-company paid readiness goes green on live demo companies
- [ ] use the now-green creator/manual-billing flow on the first real non-demo company
  - [ ] add a fast `free month onboarding` preset inside creator:
    - [ ] keep only the minimum operator fields in the quick-connect form:
      - [x] company name
      - [x] niche
      - [x] owner full name
      - [x] owner phone
      - [x] owner email
      - [x] plan
      - [x] `free month` is now the default launch mode instead of a required operator field
    - [ ] remove non-critical fields from the first-step creator form:
      - [x] long comment as a required operator field
      - [x] duplicate service-choice controls in the first step
      - [x] team size / locations / billing selector removed from the first quick-connect step
      - [x] anything that can be derived after company creation
    - [ ] auto-create from one creator action:
      - [x] company
      - [x] slug
      - [x] owner login
      - [x] trial subscription
      - [x] starter service pack by niche
      - [x] creator handoff pack
    - [ ] make the company immediately visible in creator with:
      - [x] trial end date
      - [x] plan
      - [x] owner contact
      - [x] next step
  - [ ] take one real owner from storefront/demo-request into `manual billing`
  - [x] separate real paid-close focus from demo bench inside `/platform`, so the first live commercial close is not mixed with test companies
  - [ ] confirm invoice / transfer flow operationally
  - [ ] confirm company activation follow-through after payment confirmation
  - [x] separate demo companies from real paid-onboarding flow in schema, creator filters, and QA
  - [x] separate real storefront owner-leads from QA demo-requests in creator focus and demo queues
- [ ] only after the first real paid close, add online payment integration as a separate commercial layer, not as a blocker to sales
  - [x] quick jump into company context
  - [x] cross-company aggregate counts for creator cards
- [ ] later add:
  - [x] billing actions
  - [x] invoice history
  - [x] seat limits
  - [x] usage overview
  - [x] creator-side analytics / MRR overview
  - [x] invoice / renewal control queue
  - [x] trial / past-due / pause visibility
  - [x] demo-request handling inside creator surface
  - [x] color-coded status visibility for creator workflow
  - [x] activation / handoff filtering by stage
  - [x] activation checklist inside demo requests and company control
  - [ ] next add company onboarding control:
    - [x] selected plan from storefront
    - [x] billing period visibility
    - [x] transition from storefront lead into company activation
    - [x] explicit creator-side owner/team closing pack after workspace creation

### 0B. Current actual next block
- [x] sync broader plan docs with the real current code state
- [x] run a hard multi-company QA pass from the current live SaaS state
- [ ] start the first real paid onboarding chain:
  - [x] creator quick-connect form is reduced to minimum launch fields
  - [x] creator can launch one company into `free month` in 2-3 minutes
  - [ ] storefront owner lead
  - [ ] selected plan
  - [x] billing period
  - [x] creator follow-up tooling is now visible directly in real onboarding queue (`follow-up / status / note`)
  - [x] company activation path
  - [x] creator paid-close queue is now narrowed with due/follow-up filters and direct `pause / handoff / follow-up` actions
  - [x] missing `company_subscriptions` can now be bootstrapped directly from creator overview/queue instead of blocking paid-close invisibly
  - [ ] invoice / transfer / payment confirmation on a real company
- [x] run a hard multi-company QA pass from the current live SaaS state
- [ ] only after that prepare the system for first real paying companies
  - [x] creator now shows a go-live / paid-onboarding view
  - [x] remove platform-admin email fallback from app code
  - [x] remove hardcoded smoke credential fallbacks
  - [x] remove legacy `VITE_N8N_WEBHOOK_URL` fallback from frontend runtime
  - [x] stop backfilling current company role into `profile` object
  - [x] stop hiding broken public intake behind direct RPC fallback in QA tooling
  - [x] fix `platform:paid-close` target selection so `demo` vs `real` does not depend on missing `is_demo`
  - [x] remove `public-flow-check` automatic first-company fallback and require explicit `VITE_PUBLIC_COMPANY_SLUG`
  - [ ] remove remaining legacy/fallback risks before broader paid onboarding

### 1. Close the final live MVP checks
- [x] manual owner-check for `Settings`
- [x] final live customer flow:
  - [x] `/request` backend flow is green after wizard
  - [x] live lead creation is green after wizard
  - [x] open lead in CRM
  - [x] resolve fresh `public_status_token`
  - [x] open `/status/:token`
  - [x] verify visible photos on a fresh lead after upload
- [x] update the main project status note after full green check
- [x] do one explicit production walkthrough after storefront polish:
  - [x] homepage
  - [x] `/features`
  - [x] `/pricing`
  - [x] `/demo`
  - [x] `/login`
  - [x] `/request`
  - [x] `/status/:token`
  - [x] `/platform`
  - [x] contacts jump
  - [x] refresh owner demo credentials for stable smoke verification of:
    - [x] `/settings`
    - [x] `/status/:token` owner-assisted smoke
- [x] smoke suite is fully green (`13/13 passed`)
- [x] platform-admin access migration applied to live Supabase
- [x] post-migration smoke suite is green again (`12/12 passed`)

### 1A. Lock the creator-panel plan before UI work
- [x] freeze the first creator-panel scope
- [x] freeze the access model:
  - [x] `platform_admin`
  - [x] separate from `company_members.role`
- [x] freeze the first tables needed for this panel
- [ ] only after that start the first UI implementation
- [x] keep creator login fully isolated from owner / manager / detailer demo logins
- [x] smoke-check creator routing and company login context

### 2. Keep one clean Russian live UI
- [x] remove white-screen bug on `Leads`
- [x] remove most broken English / mixed labels from live UI
- [x] one more quick pass on live leftovers screen by screen:
  - [x] auth
  - [x] dashboard
  - [x] leads
  - [x] clients
  - [x] settings
  - [x] `/request`
  - [x] `/status/:token`

### 2A. Premium redesign gate
- [x] close `CODEX_PACKAGE/PREMIUM_REDESIGN_GATE_2026-06-17.md`

### 3. After current SaaS hardening
- [ ] free-entry tier finalization
- [ ] no-show protection
- [ ] embedded widget for external websites
- [ ] only later:
  - [ ] branded white-label app
- [ ] keep redesign separate from live-stability fixes
- [x] collect real product visuals before redesign implementation

### 3. Lock one clean live demo version
- [x] keep one live URL as the main demo entry
- [x] ensure `/` is product showcase entry
- [x] ensure `/login` is the team login entry
- [x] ensure `/request` is public customer form
- [x] ensure `/status/:token` is customer status page
- [x] keep future deploys only on the same main live demo URL

### 4. Turn the public request form into a step-by-step wizard
- [x] step 1: service
- [x] step 2: car
- [x] step 3: preferred date / time
- [x] step 4: contact + submit
- [x] keep backend payload and existing submit flow unchanged
- [x] retest submit success on smoke path
- [x] do one manual live submit through the new wizard

### 5. Re-run full first-client demo flow after wizard
- [x] customer submits request
- [x] lead appears in CRM
- [x] manager opens lead
- [x] customer token link opens
- [x] status page still works
- [x] Telegram reminder/automation is verified again

### 6. Keep the right customer-facing direction
- [ ] do not prioritize a full client cabinet before first real sales
- [ ] keep the next customer-facing layer as a token-based `/status/:token` page
- [ ] when returning to customer access later, separate `customer-visible` and `internal` lead events
- [ ] when returning to customer photos later, separate customer-safe photos from internal attachments
- [ ] never auto-link a client account to an existing CRM client by email alone without an explicit safe flow

### 7. Client-app backend status
- [x] prepare Supabase backend layer for a future client app without breaking current CRM
- [x] add secure `client_accounts` linkage model for invite-based client auth
- [x] add client-safe RPC layer for leads, events, and attachments
- [x] add private storage bucket for customer-visible lead photos
- [x] keep this backend compatibility layer ready, but do not move product focus away from the lighter `/status/:token` experience before first sales
- [ ] if full client auth is resumed later, expose only customer-safe events and customer-safe photos in UI

## Not Doing Now

- [x] photo before/after flow is already built
- [x] client status page is already built as `/status/:token`
- [ ] do not build client cabinet yet
- [ ] do not force full client auth before the public form, CRM UX, and first sales are stable
- [ ] do not deepen analytics/reporting beyond demo-ready level
- [ ] do not expand into universal CRM features

## Immediate Checklist

### 0. Keep the plan explicit
- [ ] keep work aligned to `MASTER_EXECUTION_ROADMAP_2026-06-03.md`
- [x] create real architecture source of truth in `CODEX_PACKAGE/ARCHITECTURE.md`
- [ ] do not start AI assistant before UX, onboarding, QA, and protection layers are stronger
- [ ] treat visual system, site clarity, onboarding, and security as first-class workstreams

### 1. Finish role QA
- [x] verify `owner` navigation and access
- [x] verify `manager` navigation and access
- [x] verify `detailer` navigation and access
- [x] prepare at least one assigned lead for `detailer`
- [x] confirm `detailer` only sees assigned work
- [x] confirm `detailer` cannot create leads, change follow-up, or add manager notes
- [x] polish role labels and role explanations in UI
- [x] translate technician-facing UI copy to Romanian
- [x] prepare single-user role QA path for live project

### 2. Prepare demo users / demo data
- [x] create or confirm demo users for:
  - [x] owner
  - [x] manager
  - [x] detailer
- [x] assign at least one lead to detailer
- [x] confirm role labels display correctly in UI
- [x] confirm Romanian localization for demo services and comments
- [x] confirm demo seed still looks believable
- [x] clean smoke / rate-limit test data from live demo view
- [x] keep one believable `Public Demo Client` for public intake scenario

### 3. UX / visual system
- [x] strengthen CRM visual hierarchy
- [x] improve login screen presentation
- [x] improve public request form presentation
- [x] improve dashboard visual clarity
- [x] improve lead list and lead detail card polish
- [x] align UI with a simpler, more premium product look
- [x] make CRM easier to scan for owner and manager
- [x] make technician view feel simpler and more operational

### 4. Public-facing product layer
- [x] make public request flow feel like a product, not only a form
- [x] improve first impression of login / entry experience
- [x] define cleaner visual direction for the customer-facing side
- [x] align public layer and internal CRM into one consistent product language

### 5. Build public client entry form
- [x] create separate public form page
- [x] no CRM login required
- [x] submit form into Supabase as a new lead
- [x] map source/channel into lead
- [x] keep form simple and landing-page friendly
- [x] add success state after submit
- [x] apply updated `supabase/schema.sql`
- [x] verify live route `/request`
- [x] verify `npm run public:flow`

### 6. Add first automation workflows
- [x] `new lead -> Edge Function alert`
- [x] `follow_up_at -> reminder via Cron`
- [x] `daily digest via Cron`
- [x] keep payloads simple and stable
- [x] define product-native automation contract

### 7. Cleanup and hardening
- [x] remove legacy `n8n` leftovers from UI, scripts, and docs
- [x] strengthen access control / RLS
- [x] add minimal anti-spam protection to public form
- [x] re-verify role behavior for `owner / manager / detailer`
- [x] translate live automation messages to Romanian
- [x] review site / CRM security posture screen by screen
- [x] define a small protection checklist before public rollout
- [x] create `SECURITY_AUDIT.md` for auth / RLS / IDOR audit
- [x] add server-side public request rate limiting target path
- [x] deploy and verify `public-request` Edge Function live
- [x] add server-side Zod validation on external POST endpoints we control
- [x] verify invalid payload rejection on live external POST endpoints we control

### 8. Onboarding / usage layer
- [x] create CRM user guide
- [x] create roles and access guide
- [x] create short usage instructions for owner / manager / technician
- [x] create repeatable QA checklist
- [x] create login / access instructions
- [x] explain automation behavior in simple Romanian
- [x] explain what each role is allowed to do

### 9. QA / testing discipline
- [x] create pre-demo smoke checklist
- [x] create post-change smoke checklist
- [x] create public flow retest checklist
- [x] create role retest checklist
- [x] define what must be checked before showing to a client
- [x] implement Playwright smoke suite
- [x] make smoke suite fully green
- [x] confirm login/dashboard smoke path with test account

### 10. Strengthen sales demo
- [x] prepare 1 realistic end-to-end scenario
- [x] incoming Instagram lead
- [x] manager sees lead
- [x] follow-up gets scheduled
- [x] reminder is triggered
- [x] lead moves toward booking
- [x] clean live demo data for customer-facing walkthrough

### 11. Current active move
- [x] close the very last photo-visibility check on a fresh lead
- [x] turn `/request` into a wizard
- [x] re-run smoke
- [x] re-run final live customer flow
- [x] add the first PWA shell:
  - [x] manifest
  - [x] icons
  - [x] service worker
  - [x] installable start on `/request`
- [x] freeze the MVP checkpoint

### 12. After MVP freeze
- [ ] capture final marketing screenshots from the real product
- [ ] tighten the demo story for owner / manager / master / customer
- [x] prepare SaaS foundation checklist for `companies`, `company_members`, and `company_id`
- [ ] make `business_type` configurable at company level
- [ ] keep auto-service positioning broad, while sales stay `detailing first`

## Recommended Working Order

1. freeze the MVP checkpoint
2. verify install flow on phone
3. polish standalone mobile shell if needed
4. only then decide whether a separate React Native app is still needed
5. keep deeper mobile work customer-facing first

## Notes

- Keep the product narrow
- Do not turn this into a large universal CRM
- Preserve current architecture
- Competitor pattern confirms that the next useful customer step is an app-like booking wizard plus token status page, not a heavy customer portal
- If a customer app is built later, `lead_events` and `attachments` must have customer-visible filtering from day one
- Moldova-ready customer auth should stay lightweight first; email magic link is acceptable for MVP, full auth expansion later
- Do not use Supabase secret key on frontend
- Optimize for sellable MVP value, not feature count
- Move away from `n8n-first`
- Use `Supabase + Edge Functions + Cron` as the main architecture
- Treat UI clarity, site polish, onboarding, and safety as core product work
