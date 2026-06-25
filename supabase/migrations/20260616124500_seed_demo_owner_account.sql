do $$
declare
  v_user_id uuid;
  v_company_id uuid;
begin
  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower('owner.demo.20260616@gmail.com')
  limit 1;

  if v_user_id is null then
    raise notice 'demo owner auth user not found, skip membership seed';
    return;
  end if;

  v_company_id := public.default_company_id_by_slug('detail-crm-demo');

  insert into public.profiles (
    id,
    email,
    full_name,
    role
  )
  values (
    v_user_id,
    'owner.demo.20260616@gmail.com',
    'Demo Owner',
    'owner'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = timezone('utc', now());

  insert into public.company_members (
    company_id,
    user_id,
    role,
    is_active
  )
  values (
    v_company_id,
    v_user_id,
    'owner',
    true
  )
  on conflict (company_id, user_id) do update
  set
    role = excluded.role,
    is_active = true;
end
$$;
