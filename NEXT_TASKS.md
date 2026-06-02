# NEXT TASKS

## Current Focus

Bring the detailing CRM MVP from demo-ready internal CRM to a more sellable workflow product.

## Immediate Checklist

### 1. Finish role QA
- [ ] verify `owner` navigation and access
- [ ] verify `manager` navigation and access
- [ ] verify `detailer` navigation and access
- [ ] prepare at least one assigned lead for `detailer`
- [ ] confirm `detailer` only sees assigned work
- [ ] confirm `detailer` cannot create leads, change follow-up, or add manager notes

### 2. Prepare demo users / demo data
- [ ] create or confirm demo users for:
  - [ ] owner
  - [ ] manager
  - [ ] detailer
- [ ] assign at least one lead to detailer
- [ ] confirm role labels display correctly in UI
- [ ] confirm demo seed still looks believable

### 3. Build public client entry form
- [x] create separate public form page
- [x] no CRM login required
- [x] submit form into Supabase as a new lead
- [x] map source/channel into lead
- [x] keep form simple and landing-page friendly
- [x] add success state after submit
- [ ] apply updated `supabase/schema.sql`
- [ ] verify live route `/request`
- [ ] verify `npm run public:flow`

### 4. Add first automation workflows
- [ ] `new lead -> Edge Function alert`
- [ ] `follow_up_at -> reminder via Cron`
- [ ] `daily digest via Cron`
- [x] keep payloads simple and stable
- [ ] define product-native automation contract

### 5. Strengthen sales demo
- [ ] prepare 1 realistic end-to-end scenario
- [ ] incoming Instagram lead
- [ ] manager sees lead
- [ ] follow-up gets scheduled
- [ ] reminder is triggered
- [ ] lead moves toward booking

## Recommended Working Order

1. Finish role QA
2. Prepare demo users and assigned leads
3. Build public client entry form
4. Add Edge Function alert flow
5. Add follow-up reminder flow
6. Add daily digest
7. Polish demo story
8. Prepare mobile app only after the web + automation layer is stable

## Notes

- Keep the product narrow
- Do not turn this into a large universal CRM
- Preserve current architecture
- Do not use Supabase secret key on frontend
- Optimize for sellable MVP value, not feature count
- Move away from `n8n-first`
- Use `Supabase + Edge Functions + Cron` as the main architecture
