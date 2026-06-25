alter table public.leads
  add column if not exists public_status_token uuid default gen_random_uuid();

update public.leads
set public_status_token = gen_random_uuid()
where public_status_token is null;

create unique index if not exists leads_public_status_token_idx
  on public.leads(public_status_token);

create or replace function public.get_public_lead_status(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'lead', jsonb_build_object(
      'id', l.id,
      'status', l.status,
      'created_at', l.created_at,
      'preferred_date', l.preferred_date,
      'preferred_time', l.preferred_time,
      'service_name', s.name,
      'public_status_token', l.public_status_token
    ),
    'client', jsonb_build_object(
      'name', c.name,
      'car_make', c.car_make,
      'car_model', c.car_model,
      'car_year', c.car_year,
      'car_plate', c.car_plate
    ),
    'events', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'type', e.type,
            'note', e.note,
            'payload', e.payload,
            'created_at', e.created_at,
            'created_by_name', null
          )
          order by e.created_at desc
        )
        from public.lead_events e
        where e.lead_id = l.id
          and (
            e.type in ('created', 'status_changed', 'reminder_sent')
            or (e.type = 'note_added' and coalesce(e.payload->>'origin', '') = 'public_form')
          )
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from public.leads l
  join public.clients c on c.id = l.client_id
  left join public.services s on s.id = l.service_id
  where l.public_status_token = p_token
  limit 1;

  if v_result is null then
    raise exception 'Status page not found.';
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_public_lead_status(uuid) from public;
grant execute on function public.get_public_lead_status(uuid) to anon, authenticated;;
