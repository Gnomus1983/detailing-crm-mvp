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
      'estimated_price', l.estimated_price,
      'payment_status', l.payment_status,
      'address', l.address,
      'comment', l.comment,
      'follow_up_at', l.follow_up_at,
      'company_id', l.company_id,
      'company_name', co.name,
      'company_slug', co.slug,
      'business_type', co.business_type,
      'service_name', s.name,
      'assigned_detailer_name', p.full_name,
      'public_status_token', l.public_status_token
    ),
    'client', jsonb_build_object(
      'name', c.name,
      'phone', c.phone,
      'telegram_connected', (c.telegram_chat_id is not null),
      'car_make', c.car_make,
      'car_model', c.car_model,
      'car_year', c.car_year,
      'car_plate', c.car_plate
    ),
    'review', (
      select jsonb_build_object(
        'id', r.id,
        'rating', r.rating,
        'comment', r.comment,
        'is_public', r.is_public,
        'created_at', r.created_at
      )
      from public.company_reviews r
      where r.lead_id = l.id
      limit 1
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
            'created_by_name', null
          )
          order by e.created_at desc
        )
        from public.lead_events e
        where e.lead_id = l.id
          and (
            e.type in ('created', 'status_changed', 'reminder_sent', 'follow_up_set')
            or (e.type = 'note_added' and coalesce(e.payload->>'origin', '') = 'public_form')
          )
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from public.leads l
  join public.clients c on c.id = l.client_id
  join public.companies co on co.id = l.company_id
  left join public.services s on s.id = l.service_id
  left join public.profiles p on p.id = l.assigned_to
  where l.public_status_token = p_token
  limit 1;

  if v_result is null then
    raise exception 'Status page not found.';
  end if;

  return v_result;
end;
$$;
