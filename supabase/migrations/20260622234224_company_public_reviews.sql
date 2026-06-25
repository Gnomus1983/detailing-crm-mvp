create table if not exists public.company_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (lead_id)
);

create index if not exists company_reviews_company_id_idx on public.company_reviews(company_id);
create index if not exists company_reviews_lead_id_idx on public.company_reviews(lead_id);

drop trigger if exists company_reviews_set_updated_at on public.company_reviews;
create trigger company_reviews_set_updated_at
before update on public.company_reviews
for each row execute function public.set_updated_at();

alter table public.company_reviews enable row level security;

drop policy if exists "Public users can read public company reviews" on public.company_reviews;
create policy "Public users can read public company reviews"
on public.company_reviews
for select
to anon, authenticated
using (
  is_public = true
  and exists (
    select 1
    from public.companies c
    where c.id = company_reviews.company_id
      and c.status = 'active'
  )
);

drop policy if exists "Company staff can read own reviews" on public.company_reviews;
create policy "Company staff can read own reviews"
on public.company_reviews
for select
to authenticated
using (
  public.is_company_member(company_reviews.company_id)
  or public.is_platform_admin()
);

drop policy if exists "Company managers can moderate own reviews" on public.company_reviews;
create policy "Company managers can moderate own reviews"
on public.company_reviews
for update
to authenticated
using (public.can_write_company_data(company_reviews.company_id) or public.is_platform_admin())
with check (public.can_write_company_data(company_reviews.company_id) or public.is_platform_admin());

create or replace function public.submit_public_review(p_token uuid, p_rating integer, p_comment text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead record;
  v_review public.company_reviews%rowtype;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Оценка должна быть от 1 до 5.';
  end if;

  select l.id, l.company_id, l.client_id, l.status, c.status as company_status
  into v_lead
  from public.leads l
  join public.companies c on c.id = l.company_id
  where l.public_status_token = p_token
  limit 1;

  if v_lead.id is null then
    raise exception 'Заявка не найдена.';
  end if;

  if v_lead.company_status <> 'active' then
    raise exception 'Компания сейчас недоступна.';
  end if;

  if v_lead.status not in ('done', 'paid') then
    raise exception 'Отзыв можно оставить после завершения работы.';
  end if;

  insert into public.company_reviews (
    company_id,
    lead_id,
    client_id,
    rating,
    comment,
    is_public
  )
  values (
    v_lead.company_id,
    v_lead.id,
    v_lead.client_id,
    p_rating,
    nullif(trim(coalesce(p_comment, '')), ''),
    true
  )
  on conflict (lead_id) do update
    set rating = excluded.rating,
        comment = excluded.comment,
        is_public = true,
        updated_at = timezone('utc', now())
  returning * into v_review;

  return jsonb_build_object(
    'id', v_review.id,
    'rating', v_review.rating,
    'comment', v_review.comment,
    'created_at', v_review.created_at
  );
end;
$$;

revoke all on function public.submit_public_review(uuid, integer, text) from public;
grant execute on function public.submit_public_review(uuid, integer, text) to anon, authenticated;

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
  where l.public_status_token = p_token
  limit 1;

  if v_result is null then
    raise exception 'Status page not found.';
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_public_lead_status(uuid) from public;
grant execute on function public.get_public_lead_status(uuid) to anon, authenticated;
