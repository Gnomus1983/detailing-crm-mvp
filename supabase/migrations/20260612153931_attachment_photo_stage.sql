alter table public.attachments
  add column if not exists photo_stage text not null default 'after'
    check (photo_stage in ('before', 'after'));

create or replace function public.get_public_lead_status(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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
    'attachments', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'file_url', a.file_url,
            'file_type', a.file_type,
            'photo_stage', a.photo_stage,
            'created_at', a.created_at
          )
          order by a.created_at desc
        )
        from public.attachments a
        where a.lead_id = l.id
          and a.is_customer_visible = true
          and coalesce(a.file_url, '') <> ''
      ),
      '[]'::jsonb
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
            'created_by_name', p.full_name
          )
          order by e.created_at desc
        )
        from public.lead_events e
        left join public.profiles p on p.id = e.created_by
        where e.lead_id = l.id
          and (
            e.type in ('created', 'status_changed', 'reminder_sent')
            or (e.type = 'note_added' and coalesce(e.payload->>'origin', '') = 'public_form')
          )
      ),
      '[]'::jsonb
    )
  )
  from public.leads l
  left join public.clients c on c.id = l.client_id
  left join public.services s on s.id = l.service_id
  where l.public_status_token = p_token
  limit 1;
$$;;
