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
- [ ] create or confirm demo users for:
  - [ ] owner
  - [ ] manager
  - [ ] detailer
- [ ] assign at least one lead to detailer
- [ ] confirm role labels display correctly in UI
- [x] confirm Romanian localization for demo services and comments
- [ ] confirm demo seed still looks believable

### 3. UX / visual system
- [ ] strengthen CRM visual hierarchy
- [ ] improve login screen presentation
- [ ] improve public request form presentation
- [ ] improve dashboard visual clarity
- [ ] improve lead list and lead detail card polish
- [ ] align UI with a simpler, more premium product look
- [ ] make CRM easier to scan for owner and manager
- [ ] make technician view feel simpler and more operational

### 4. Public-facing product layer
- [ ] make public request flow feel like a product, not only a form
- [ ] improve first impression of login / entry experience
- [ ] define cleaner visual direction for the customer-facing side
- [ ] align public layer and internal CRM into one consistent product language

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
- [ ] re-verify role behavior for `owner / manager / detailer`
- [x] translate live automation messages to Romanian
- [ ] review site / CRM security posture screen by screen
- [ ] define a small protection checklist before public rollout
- [x] create `SECURITY_AUDIT.md` for auth / RLS / IDOR audit
- [x] add server-side public request rate limiting target path
- [x] deploy and verify `public-request` Edge Function live
- [x] add server-side Zod validation on external POST endpoints we control
- [x] verify invalid payload rejection on live external POST endpoints we control

### 8. Onboarding / usage layer
- [ ] create CRM user guide
- [ ] create roles and access guide
- [ ] create short usage instructions for owner / manager / technician
- [ ] create repeatable QA checklist
- [ ] create login / access instructions
- [ ] explain automation behavior in simple Romanian
- [ ] explain what each role is allowed to do

### 9. QA / testing discipline
- [ ] create pre-demo smoke checklist
- [ ] create post-change smoke checklist
- [ ] create public flow retest checklist
- [ ] create role retest checklist
- [ ] define what must be checked before showing to a client

### 10. Strengthen sales demo
- [x] prepare 1 realistic end-to-end scenario
- [ ] incoming Instagram lead
- [ ] manager sees lead
- [ ] follow-up gets scheduled
- [ ] reminder is triggered
- [ ] lead moves toward booking

## Recommended Working Order

1. UX / visual system
2. Public-facing product layer
3. Onboarding / usage layer
4. QA / testing discipline
5. Strengthen one full sales scenario
6. Prepare mobile app only after the web + automation layer is stable

## Notes

- Keep the product narrow
- Do not turn this into a large universal CRM
- Preserve current architecture
- Do not use Supabase secret key on frontend
- Optimize for sellable MVP value, not feature count
- Move away from `n8n-first`
- Use `Supabase + Edge Functions + Cron` as the main architecture
- Treat UI clarity, site polish, onboarding, and safety as core product work
