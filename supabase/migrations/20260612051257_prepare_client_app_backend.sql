begin;

create table if not exists public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists client_accounts_one_per_client_idx
  on public.client_accounts (client_id);

create unique index if not exists client_accounts_one_per_auth_user_idx
  on public.client_accounts (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists client_accounts_email_unique_idx
  on public.client_accounts (lower(email));

create index if not exists client_accounts_status_idx
  on public.client_accounts (status);

alter table public.client_accounts enable row level security;

alter table public.attachments
  add column if not exists storage_bucket text,
  add column if not exists storage_object_path text;

create index if not exists attachments_storage_lookup_idx
  on public.attachments (storage_bucket, storage_object_path)
  where storage_bucket is not null and storage_object_path is not null;

insert into storage.buckets (id, name, public)
values ('client-lead-attachments', 'client-lead-attachments', false)
on conflict (id) do nothing;

create or replace function public.is_current_user_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('owner', 'manager', 'detailer')
  );
$$;

create or replace function public.is_current_user_owner_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('owner', 'manager')
  );
$$;

create or replace function public.current_client_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ca.id
  from public.client_accounts ca
  where ca.status <> 'disabled'
    and (
      ca.auth_user_id = auth.uid()
      or (
        ca.auth_user_id is null
        and lower(ca.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
  order by ca.created_at asc
  limit 1;
$$;

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ca.client_id
  from public.client_accounts ca
  where ca.id = public.current_client_account_id();
$$;

create or replace function public.is_current_user_client()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_client_account_id() is not null;
$$;

create or replace function public.can_current_client_access_lead(target_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leads l
    where l.id = target_lead_id
      and l.client_id = public.current_client_id()
  );
$$;

create or replace function public.can_current_client_access_attachment_object(bucket_id text, object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.attachments a
    join public.leads l on l.id = a.lead_id
    where a.storage_bucket = bucket_id
      and a.storage_object_path = object_name
      and l.client_id = public.current_client_id()
  );
$$;

create or replace function public.link_my_client_account()
returns public.client_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_account public.client_accounts;
  jwt_email text;
begin
  jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if jwt_email = '' then
    raise exception 'email claim is required';
  end if;

  update public.client_accounts ca
  set auth_user_id = auth.uid(),
      status = case when ca.status = 'disabled' then ca.status else 'active' end,
      last_login_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where lower(ca.email) = jwt_email
    and (ca.auth_user_id is null or ca.auth_user_id = auth.uid())
  returning * into linked_account;

  if linked_account.id is null then
    raise exception 'client account not provisioned for %', jwt_email;
  end if;

  return linked_account;
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
as $$
  select a.id, a.lead_id, a.file_url, a.file_type, a.storage_bucket, a.storage_object_path, a.created_at
  from public.attachments a
  where a.lead_id = target_lead_id
    and public.can_current_client_access_lead(target_lead_id)
  order by a.created_at desc;
$$;

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

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Authenticated users can delete clients" on public.clients;
drop policy if exists "Authenticated users can update clients" on public.clients;
drop policy if exists "Authenticated users can write clients" on public.clients;
drop policy if exists "Public can read clients for mvp" on public.clients;
drop policy if exists "Authenticated users can delete leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;
drop policy if exists "Authenticated users can write leads" on public.leads;
drop policy if exists "Public can read leads for mvp" on public.leads;
drop policy if exists "Authenticated users can delete lead events" on public.lead_events;
drop policy if exists "Authenticated users can update lead events" on public.lead_events;
drop policy if exists "Authenticated users can write lead events" on public.lead_events;
drop policy if exists "Public can read lead events for mvp" on public.lead_events;
drop policy if exists "Authenticated users can delete attachments" on public.attachments;
drop policy if exists "Authenticated users can update attachments" on public.attachments;
drop policy if exists "Authenticated users can write attachments" on public.attachments;
drop policy if exists "Public can read attachments for mvp" on public.attachments;
drop policy if exists "Authenticated users can read services" on public.services;
drop policy if exists "Authenticated users can update services" on public.services;
drop policy if exists "Authenticated users can write services" on public.services;
drop policy if exists "Authenticated users can delete services" on public.services;

drop policy if exists "Staff can read profiles" on public.profiles;
create policy "Staff can read profiles"
on public.profiles
for select
using (public.is_current_user_staff());

drop policy if exists "Staff can read services" on public.services;
create policy "Staff can read services"
on public.services
for select
using (public.is_current_user_staff());

drop policy if exists "Clients can read active services" on public.services;
create policy "Clients can read active services"
on public.services
for select
using (public.is_current_user_client() and is_active = true);

create policy "Owners and managers can read client accounts"
on public.client_accounts
for select
using (public.is_current_user_owner_or_manager());

create policy "Owners and managers can create client accounts"
on public.client_accounts
for insert
with check (public.is_current_user_owner_or_manager());

create policy "Owners and managers can update client accounts"
on public.client_accounts
for update
using (public.is_current_user_owner_or_manager())
with check (public.is_current_user_owner_or_manager());

create policy "Owners and managers can delete client accounts"
on public.client_accounts
for delete
using (public.is_current_user_owner_or_manager());

create policy "Clients can read own client account"
on public.client_accounts
for select
using (
  auth_user_id = auth.uid()
  or (
    auth_user_id is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "Clients can read own client" on public.clients;
create policy "Clients can read own client"
on public.clients
for select
using (id = public.current_client_id());

drop policy if exists "Clients can read own leads" on public.leads;
create policy "Clients can read own leads"
on public.leads
for select
using (client_id = public.current_client_id());

drop policy if exists "Clients can read own lead events" on public.lead_events;
create policy "Clients can read own lead events"
on public.lead_events
for select
using (public.can_current_client_access_lead(lead_id));

drop policy if exists "Clients can read own attachments" on public.attachments;
create policy "Clients can read own attachments"
on public.attachments
for select
using (public.can_current_client_access_lead(lead_id));

drop policy if exists "Owners and managers can manage client attachment objects" on storage.objects;
create policy "Owners and managers can manage client attachment objects"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'client-lead-attachments'
  and public.is_current_user_owner_or_manager()
)
with check (
  bucket_id = 'client-lead-attachments'
  and public.is_current_user_owner_or_manager()
);

drop policy if exists "Detailers can read assigned client attachment objects" on storage.objects;
create policy "Detailers can read assigned client attachment objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-lead-attachments'
  and exists (
    select 1
    from public.attachments a
    join public.leads l on l.id = a.lead_id
    where a.storage_bucket = storage.objects.bucket_id
      and a.storage_object_path = storage.objects.name
      and l.assigned_to = auth.uid()
  )
);

drop policy if exists "Clients can read own attachment objects" on storage.objects;
create policy "Clients can read own attachment objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-lead-attachments'
  and public.can_current_client_access_attachment_object(bucket_id, name)
);

drop trigger if exists set_client_accounts_updated_at on public.client_accounts;
create trigger set_client_accounts_updated_at
before update on public.client_accounts
for each row
execute function public.set_updated_at();

commit;
