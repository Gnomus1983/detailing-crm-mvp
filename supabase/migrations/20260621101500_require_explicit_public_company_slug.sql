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
  p_company_slug text default null
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

  if nullif(trim(coalesce(p_company_slug, '')), '') is null then
    raise exception 'Company slug is required for public request.';
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
      'public_entry', true
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
    'reused_client', v_reused,
    'source', v_lead.source,
    'follow_up_at', v_lead.follow_up_at
  );
end;
$$;

revoke execute on function public.submit_public_lead(
  text, text, text, uuid, text, text, integer, text, text, text, text, date, text, numeric, timestamptz, text, text
) from authenticated;

grant execute on function public.submit_public_lead(
  text, text, text, uuid, text, text, integer, text, text, text, text, date, text, numeric, timestamptz, text, text
) to anon;
