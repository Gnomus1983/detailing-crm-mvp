-- Demo role setup for Detailing CRM MVP
-- Run this manually after auth users already exist in Supabase.
-- Purpose:
-- 1. assign demo roles to existing profiles by email
-- 2. assign one existing lead to the detailer
-- 3. create an "assigned" timeline event for demo visibility

-- Replace the emails below with the real demo accounts you want to use.

update public.profiles
set role = 'owner'
where email = 'owner@example.com';

update public.profiles
set role = 'manager'
where email = 'manager@example.com';

update public.profiles
set role = 'detailer'
where email = 'detailer@example.com';

with detailer_profile as (
  select id
  from public.profiles
  where email = 'detailer@example.com'
  limit 1
),
target_lead as (
  select l.id
  from public.leads l
  join public.clients c on c.id = l.client_id
  where c.phone = '+37369000003'
  order by l.created_at desc
  limit 1
)
update public.leads
set assigned_to = (select id from detailer_profile)
where id = (select id from target_lead);

insert into public.lead_events (lead_id, type, note, payload, created_by)
select
  l.id,
  'assigned',
  'Lead assigned to detailer for service execution.',
  jsonb_build_object(
    'assigned_to', p.id,
    'assigned_role', p.role,
    'assigned_email', p.email
  ),
  null
from public.leads l
join public.clients c on c.id = l.client_id
join public.profiles p on p.email = 'detailer@example.com'
where c.phone = '+37369000003'
  and not exists (
    select 1
    from public.lead_events e
    where e.lead_id = l.id
      and e.type = 'assigned'
      and e.note = 'Lead assigned to detailer for service execution.'
  );
