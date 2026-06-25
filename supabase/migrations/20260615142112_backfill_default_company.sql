do $$
declare
  v_company_id uuid;
begin
  insert into public.companies (
    name,
    slug,
    status,
    business_type,
    timezone,
    plan_code
  )
  values (
    'Detail CRM Demo Center',
    'detail-crm-demo',
    'active',
    'detailing',
    'Europe/Chisinau',
    'starter'
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    business_type = excluded.business_type,
    timezone = excluded.timezone,
    plan_code = excluded.plan_code,
    updated_at = timezone('utc', now())
  returning id into v_company_id;

  if v_company_id is null then
    select id
    into v_company_id
    from public.companies
    where slug = 'detail-crm-demo'
    limit 1;
  end if;

  insert into public.company_members (
    company_id,
    user_id,
    role,
    is_active
  )
  select
    v_company_id,
    p.id,
    p.role,
    true
  from public.profiles p
  on conflict (company_id, user_id) do update
  set
    role = excluded.role,
    is_active = true;

  update public.clients
  set company_id = v_company_id
  where company_id is null;

  update public.services
  set company_id = v_company_id
  where company_id is null;

  update public.leads
  set company_id = v_company_id
  where company_id is null;

  update public.lead_events e
  set company_id = l.company_id
  from public.leads l
  where e.lead_id = l.id
    and e.company_id is null;

  update public.attachments a
  set company_id = l.company_id
  from public.leads l
  where a.lead_id = l.id
    and a.company_id is null;

  update public.automation_runs ar
  set company_id = l.company_id
  from public.leads l
  where ar.lead_id = l.id
    and ar.company_id is null;

  update public.client_accounts ca
  set company_id = c.company_id
  from public.clients c
  where ca.client_id = c.id
    and ca.company_id is null;
end
$$;;
