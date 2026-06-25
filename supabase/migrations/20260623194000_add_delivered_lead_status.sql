alter table public.leads
  drop constraint if exists leads_status_check;

alter table public.leads
  add constraint leads_status_check
  check (status in ('new', 'contacted', 'quoted', 'scheduled', 'in_progress', 'done', 'delivered', 'lost'));

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

  if v_lead.status not in ('done', 'paid', 'delivered') then
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
