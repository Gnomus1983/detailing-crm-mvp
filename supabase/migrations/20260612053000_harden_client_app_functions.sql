begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.get_my_leads()
returns table (
  id uuid,
  client_id uuid,
  service_id uuid,
  service_name text,
  status text,
  source text,
  address text,
  comment text,
  preferred_date date,
  preferred_time text,
  estimated_price numeric,
  assigned_to uuid,
  follow_up_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    l.id,
    l.client_id,
    l.service_id,
    s.name as service_name,
    l.status,
    l.source,
    l.address,
    l.comment,
    l.preferred_date,
    l.preferred_time,
    l.estimated_price,
    l.assigned_to,
    l.follow_up_at,
    l.last_contacted_at,
    l.created_at,
    l.updated_at
  from public.leads l
  left join public.services s on s.id = l.service_id
  where l.client_id = public.current_client_id()
  order by coalesce(l.preferred_date, l.created_at::date) desc, l.created_at desc;
$$;

create or replace function public.get_my_active_lead()
returns table (
  id uuid,
  client_id uuid,
  service_id uuid,
  service_name text,
  status text,
  source text,
  address text,
  comment text,
  preferred_date date,
  preferred_time text,
  estimated_price numeric,
  assigned_to uuid,
  follow_up_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    l.id,
    l.client_id,
    l.service_id,
    s.name as service_name,
    l.status,
    l.source,
    l.address,
    l.comment,
    l.preferred_date,
    l.preferred_time,
    l.estimated_price,
    l.assigned_to,
    l.follow_up_at,
    l.last_contacted_at,
    l.created_at,
    l.updated_at
  from public.leads l
  left join public.services s on s.id = l.service_id
  where l.client_id = public.current_client_id()
  order by
    case
      when l.status in ('new', 'Новая', 'Связались', 'В работе', 'Запланировано', 'Предложение') then 0
      when l.status in ('done', 'Готово', 'Отменено') then 1
      else 2
    end,
    coalesce(l.preferred_date, l.created_at::date) desc,
    l.created_at desc
  limit 1;
$$;

create or replace function public.get_my_lead_events(target_lead_id uuid)
returns table (
  id uuid,
  lead_id uuid,
  type text,
  note text,
  payload jsonb,
  created_by uuid,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select e.id, e.lead_id, e.type, e.note, e.payload, e.created_by, e.created_at
  from public.lead_events e
  where e.lead_id = target_lead_id
    and public.can_current_client_access_lead(target_lead_id)
  order by e.created_at desc;
$$;

create or replace function public.get_my_lead_attachments(target_lead_id uuid)
returns table (
  id uuid,
  lead_id uuid,
  file_url text,
  file_type text,
  storage_bucket text,
  storage_object_path text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select a.id, a.lead_id, a.file_url, a.file_type, a.storage_bucket, a.storage_object_path, a.created_at
  from public.attachments a
  where a.lead_id = target_lead_id
    and public.can_current_client_access_lead(target_lead_id)
  order by a.created_at desc;
$$;

revoke all on function public.is_current_user_staff() from public;
revoke all on function public.is_current_user_owner_or_manager() from public;
revoke all on function public.current_client_account_id() from public;
revoke all on function public.current_client_id() from public;
revoke all on function public.is_current_user_client() from public;
revoke all on function public.can_current_client_access_lead(uuid) from public;
revoke all on function public.can_current_client_access_attachment_object(text, text) from public;
revoke all on function public.link_my_client_account() from public;
revoke all on function public.get_my_leads() from public;
revoke all on function public.get_my_active_lead() from public;
revoke all on function public.get_my_lead_events(uuid) from public;
revoke all on function public.get_my_lead_attachments(uuid) from public;

grant execute on function public.is_current_user_staff() to authenticated;
grant execute on function public.is_current_user_owner_or_manager() to authenticated;
grant execute on function public.current_client_account_id() to authenticated;
grant execute on function public.current_client_id() to authenticated;
grant execute on function public.is_current_user_client() to authenticated;
grant execute on function public.can_current_client_access_lead(uuid) to authenticated;
grant execute on function public.can_current_client_access_attachment_object(text, text) to authenticated;
grant execute on function public.link_my_client_account() to authenticated;
grant execute on function public.get_my_leads() to authenticated;
grant execute on function public.get_my_active_lead() to authenticated;
grant execute on function public.get_my_lead_events(uuid) to authenticated;
grant execute on function public.get_my_lead_attachments(uuid) to authenticated;

commit;
