create or replace function public.current_staff_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cm.company_id
  from public.company_members cm
  where cm.user_id = auth.uid()
    and cm.is_active = true
  order by
    case cm.role
      when 'owner' then 1
      when 'manager' then 2
      when 'detailer' then 3
      else 4
    end,
    cm.created_at asc
  limit 1;
$$;

create or replace function public.default_company_id_by_slug(p_slug text default 'detail-crm-demo')
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.companies c
  where c.slug = coalesce(nullif(trim(p_slug), ''), 'detail-crm-demo')
  limit 1;
$$;

create or replace function public.set_company_id_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is not null then
    return new;
  end if;

  if tg_table_name in ('clients', 'services') then
    new.company_id := public.current_staff_company_id();
    return new;
  end if;

  if tg_table_name = 'leads' then
    if new.client_id is not null then
      select c.company_id
      into new.company_id
      from public.clients c
      where c.id = new.client_id
      limit 1;
    end if;

    if new.company_id is null then
      new.company_id := public.current_staff_company_id();
    end if;

    return new;
  end if;

  if tg_table_name = 'lead_events' then
    select l.company_id
    into new.company_id
    from public.leads l
    where l.id = new.lead_id
    limit 1;

    return new;
  end if;

  if tg_table_name = 'attachments' then
    select l.company_id
    into new.company_id
    from public.leads l
    where l.id = new.lead_id
    limit 1;

    return new;
  end if;

  if tg_table_name = 'automation_runs' then
    if new.lead_id is not null then
      select l.company_id
      into new.company_id
      from public.leads l
      where l.id = new.lead_id
      limit 1;
    end if;

    if new.company_id is null then
      new.company_id := public.current_staff_company_id();
    end if;

    return new;
  end if;

  if tg_table_name = 'client_accounts' then
    select c.company_id
    into new.company_id
    from public.clients c
    where c.id = new.client_id
    limit 1;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists clients_set_company_id_defaults on public.clients;
create trigger clients_set_company_id_defaults
before insert on public.clients
for each row execute function public.set_company_id_defaults();

drop trigger if exists services_set_company_id_defaults on public.services;
create trigger services_set_company_id_defaults
before insert on public.services
for each row execute function public.set_company_id_defaults();

drop trigger if exists leads_set_company_id_defaults on public.leads;
create trigger leads_set_company_id_defaults
before insert on public.leads
for each row execute function public.set_company_id_defaults();

drop trigger if exists lead_events_set_company_id_defaults on public.lead_events;
create trigger lead_events_set_company_id_defaults
before insert on public.lead_events
for each row execute function public.set_company_id_defaults();

drop trigger if exists attachments_set_company_id_defaults on public.attachments;
create trigger attachments_set_company_id_defaults
before insert on public.attachments
for each row execute function public.set_company_id_defaults();

drop trigger if exists automation_runs_set_company_id_defaults on public.automation_runs;
create trigger automation_runs_set_company_id_defaults
before insert on public.automation_runs
for each row execute function public.set_company_id_defaults();

drop trigger if exists client_accounts_set_company_id_defaults on public.client_accounts;
create trigger client_accounts_set_company_id_defaults
before insert on public.client_accounts
for each row execute function public.set_company_id_defaults();

create or replace function public.submit_public_lead(
  p_client_name text,
  p_phone text,
  p_email text default null,
  p_service_id uuid default null,
  p_car_make text default null,
  p_car_model text default null,
  p_car_year integer default null,
  p_car_plate text default null,
  p_source text default 'landing',
  p_address text default null,
  p_comment text default null,
  p_preferred_date date default null,
  p_preferred_time text default null,
  p_estimated_price numeric default null,
  p_follow_up_at timestamptz default null,
  p_website text default null,
  p_company_slug text default 'detail-crm-demo'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
  v_existing_client public.clients%rowtype;
  v_lead public.leads%rowtype;
  v_reused boolean := false;
  v_company_id uuid;
begin
  if nullif(trim(coalesce(p_website, '')), '') is not null then
    raise exception 'Spam check failed.';
  end if;

  v_company_id := public.default_company_id_by_slug(p_company_slug);

  if v_company_id is null then
    raise exception 'Company not found for public request.';
  end if;

  if exists (
    select 1
    from public.leads
    join public.clients on clients.id = leads.client_id
    where clients.phone = trim(p_phone)
      and leads.company_id = v_company_id
      and leads.source = coalesce(p_source, 'landing')
      and leads.created_at >= timezone('utc', now()) - interval '10 minutes'
  ) then
    raise exception 'A request for this phone was already submitted recently. Please wait a few minutes.';
  end if;

  select *
  into v_existing_client
  from public.clients
  where phone = trim(p_phone)
    and company_id = v_company_id
  limit 1;

  if v_existing_client.id is not null then
    v_reused := true;

    update public.clients
    set
      name = trim(p_client_name),
      email = nullif(trim(coalesce(p_email, '')), ''),
      car_make = nullif(trim(coalesce(p_car_make, '')), ''),
      car_model = nullif(trim(coalesce(p_car_model, '')), ''),
      car_year = p_car_year,
      car_plate = nullif(trim(coalesce(p_car_plate, '')), ''),
      notes = coalesce(nullif(trim(coalesce(p_comment, '')), ''), public.clients.notes),
      updated_at = timezone('utc', now())
    where id = v_existing_client.id
    returning * into v_client;
  else
    insert into public.clients (
      company_id,
      name,
      phone,
      email,
      car_make,
      car_model,
      car_year,
      car_plate,
      notes
    )
    values (
      v_company_id,
      trim(p_client_name),
      trim(p_phone),
      nullif(trim(coalesce(p_email, '')), ''),
      nullif(trim(coalesce(p_car_make, '')), ''),
      nullif(trim(coalesce(p_car_model, '')), ''),
      p_car_year,
      nullif(trim(coalesce(p_car_plate, '')), ''),
      nullif(trim(coalesce(p_comment, '')), '')
    )
    returning * into v_client;
  end if;

  insert into public.leads (
    company_id,
    client_id,
    service_id,
    status,
    source,
    address,
    comment,
    preferred_date,
    preferred_time,
    estimated_price,
    follow_up_at
  )
  values (
    v_company_id,
    v_client.id,
    p_service_id,
    'new',
    coalesce(p_source, 'landing'),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_comment, '')), ''),
    p_preferred_date,
    nullif(trim(coalesce(p_preferred_time, '')), ''),
    p_estimated_price,
    p_follow_up_at
  )
  returning * into v_lead;

  insert into public.lead_events (company_id, lead_id, type, note, payload)
  values (
    v_company_id,
    v_lead.id,
    'created',
    format('Lead created from %s', coalesce(p_source, 'landing')),
    jsonb_build_object(
      'source', coalesce(p_source, 'landing'),
      'service_id', p_service_id,
      'follow_up_at', p_follow_up_at,
      'public_entry', true,
      'company_slug', coalesce(nullif(trim(p_company_slug), ''), 'detail-crm-demo')
    )
  );

  if nullif(trim(coalesce(p_comment, '')), '') is not null then
    insert into public.lead_events (company_id, lead_id, type, note, payload)
    values (
      v_company_id,
      v_lead.id,
      'note_added',
      trim(p_comment),
      jsonb_build_object('origin', 'public_form')
    );
  end if;

  return jsonb_build_object(
    'lead_id', v_lead.id,
    'client_id', v_client.id,
    'company_id', v_company_id,
    'reused_client', v_reused,
    'source', v_lead.source,
    'follow_up_at', v_lead.follow_up_at
  );
end;
$$;

revoke all on function public.current_staff_company_id() from public;
grant execute on function public.current_staff_company_id() to authenticated;

revoke all on function public.default_company_id_by_slug(text) from public;
grant execute on function public.default_company_id_by_slug(text) to anon, authenticated;

grant execute on function public.submit_public_lead(
  text, text, text, uuid, text, text, integer, text, text, text, text, date, text, numeric, timestamptz, text, text
) to anon, authenticated;;
