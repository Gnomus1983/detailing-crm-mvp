# NEXT TASKS

## Current Focus

Bring the detailing CRM MVP from a working internal CRM to a clear, secure, visually strong, sellable workflow product.

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
- [ ] commit and push the fully polished demo-ready checkpoint
- [ ] rehearse one final live sales demo with the cleaned scenario
- [ ] decide whether to start automation deepening or go to first real demo/sale

## Recommended Working Order

1. commit the current checkpoint
2. rehearse one final live sales scenario
3. do the first real demo / client conversation
4. deepen automation only after live feedback
5. prepare mobile app only after the web + automation layer is stable

## Notes

- Keep the product narrow
- Do not turn this into a large universal CRM
- Preserve current architecture
- Do not use Supabase secret key on frontend
- Optimize for sellable MVP value, not feature count
- Move away from `n8n-first`
- Use `Supabase + Edge Functions + Cron` as the main architecture
- Treat UI clarity, site polish, onboarding, and safety as core product work
