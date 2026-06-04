-- Single-user role QA helper for Detailing CRM MVP
-- Use this when only one real auth account exists in Supabase Auth.
-- Replace the email below if needed, then run ONE block at a time.

-- Active account used for role QA:
-- arkhangel2016@gmail.com

-- Shared demo lead target:
-- phone = +37369000003

-- =========================================================
-- 1. Switch current account to OWNER
-- =========================================================
update public.profiles
set role = 'owner'
where email = 'arkhangel2016@gmail.com';

update public.leads
set assigned_to = null
where assigned_to = (
  select id from public.profiles where email = 'arkhangel2016@gmail.com'
);

-- =========================================================
-- 2. Switch current account to MANAGER
-- =========================================================
-- update public.profiles
-- set role = 'manager'
-- where email = 'arkhangel2016@gmail.com';
--
-- update public.leads
-- set assigned_to = null
-- where assigned_to = (
--   select id from public.profiles where email = 'arkhangel2016@gmail.com'
-- );

-- =========================================================
-- 3. Switch current account to DETAILER
-- =========================================================
-- update public.profiles
-- set role = 'detailer'
-- where email = 'arkhangel2016@gmail.com';
--
-- with current_profile as (
--   select id
--   from public.profiles
--   where email = 'arkhangel2016@gmail.com'
--   limit 1
-- ),
-- target_lead as (
--   select l.id
--   from public.leads l
--   join public.clients c on c.id = l.client_id
--   where c.phone = '+37369000003'
--   order by l.created_at desc
--   limit 1
-- )
-- update public.leads
-- set assigned_to = (select id from current_profile)
-- where id = (select id from target_lead);
--
-- insert into public.lead_events (lead_id, type, note, payload, created_by)
-- select
--   l.id,
--   'assigned',
--   'Solicitare asignata tehnicianului pentru executie.',
--   jsonb_build_object(
--     'assigned_to', p.id,
--     'assigned_role', p.role,
--     'assigned_email', p.email
--   ),
--   null
-- from public.leads l
-- join public.clients c on c.id = l.client_id
-- join public.profiles p on p.email = 'arkhangel2016@gmail.com'
-- where c.phone = '+37369000003'
--   and not exists (
--     select 1
--     from public.lead_events e
--     where e.lead_id = l.id
--       and e.type = 'assigned'
--       and e.note = 'Solicitare asignata tehnicianului pentru executie.'
--   );

-- =========================================================
-- 4. Restore current account back to OWNER
-- =========================================================
-- update public.profiles
-- set role = 'owner'
-- where email = 'arkhangel2016@gmail.com';
--
-- update public.leads
-- set assigned_to = null
-- where assigned_to = (
--   select id from public.profiles where email = 'arkhangel2016@gmail.com'
-- );
