-- Detailing CRM MVP schema
-- Safe to run on a fresh Supabase project.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text
    check (role in ('owner', 'manager', 'detailer')),
  telegram_chat_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_demo boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  business_type text not null default 'detailing'
    check (business_type in ('detailing', 'car_wash', 'tire_service')),
  contact_phone text,
  contact_email text,
  timezone text not null default 'Europe/Chisinau',
  plan_code text not null default 'starter',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'detailer')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, user_id)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  telegram_chat_id text,
  telegram_connected_at timestamptz,
  car_make text,
  car_model text,
  car_year integer,
  car_plate text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  base_price numeric(10, 2) not null default 0,
  duration_minutes integer not null default 60,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  service_id uuid references public.services(id) on delete set null,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'quoted', 'scheduled', 'in_progress', 'done', 'delivered', 'lost')),
  source text not null default 'manual'
    check (source in ('manual', 'landing', 'instagram', 'telegram', 'whatsapp', 'phone', 'facebook', 'other')),
  address text,
  comment text,
  preferred_date date,
  preferred_time text,
  estimated_price numeric(10, 2),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partial', 'paid')),
  payment_method text
    check (payment_method in ('cash', 'card', 'transfer', 'other')),
  paid_amount numeric(10, 2),
  paid_at timestamptz,
  assigned_to uuid references public.profiles(id) on delete set null,
  follow_up_at timestamptz,
  last_contacted_at timestamptz,
  public_status_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null
    check (type in ('created', 'status_changed', 'note_added', 'follow_up_set', 'assigned', 'price_updated', 'payment_updated', 'reminder_sent')),
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  file_url text not null,
  file_type text,
  storage_bucket text,
  storage_object_path text,
  photo_stage text not null default 'after'
    check (photo_stage in ('before', 'after')),
  is_customer_visible boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

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

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  automation_key text not null,
  status text not null
    check (status in ('started', 'success', 'error', 'skipped')),
  scope_key text,
  lead_id uuid references public.leads(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  action_key text not null,
  identifier_hash text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists clients_phone_idx on public.clients(phone);
create unique index if not exists clients_company_phone_unique_idx on public.clients(company_id, phone);
create index if not exists companies_slug_idx on public.companies(slug);
create index if not exists company_members_company_id_idx on public.company_members(company_id);
create index if not exists company_members_user_id_idx on public.company_members(user_id);
create index if not exists clients_company_id_idx on public.clients(company_id);
create index if not exists services_company_id_idx on public.services(company_id);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_source_idx on public.leads(source);
create index if not exists leads_follow_up_at_idx on public.leads(follow_up_at);
create index if not exists leads_client_id_idx on public.leads(client_id);
create index if not exists leads_company_id_idx on public.leads(company_id);
create unique index if not exists leads_public_status_token_idx on public.leads(public_status_token);
create index if not exists company_reviews_company_id_idx on public.company_reviews(company_id);
create index if not exists company_reviews_lead_id_idx on public.company_reviews(lead_id);
create index if not exists lead_events_lead_id_idx on public.lead_events(lead_id);
create index if not exists lead_events_company_id_idx on public.lead_events(company_id);
create index if not exists attachments_company_id_idx on public.attachments(company_id);
create index if not exists automation_runs_key_idx on public.automation_runs(automation_key);
create index if not exists automation_runs_scope_idx on public.automation_runs(scope_key);
create index if not exists automation_runs_lead_id_idx on public.automation_runs(lead_id);
create index if not exists automation_runs_company_id_idx on public.automation_runs(company_id);
create index if not exists rate_limit_events_action_idx on public.rate_limit_events(action_key);
create index if not exists rate_limit_events_identifier_idx on public.rate_limit_events(identifier_hash);
create index if not exists rate_limit_events_created_at_idx on public.rate_limit_events(created_at);
create unique index if not exists client_accounts_one_per_client_idx on public.client_accounts(client_id);
create unique index if not exists client_accounts_one_per_auth_user_idx
  on public.client_accounts(auth_user_id)
  where auth_user_id is not null;
create unique index if not exists client_accounts_email_unique_idx on public.client_accounts(lower(email));
create index if not exists client_accounts_status_idx on public.client_accounts(status);
create index if not exists client_accounts_company_id_idx on public.client_accounts(company_id);
create index if not exists attachments_storage_lookup_idx
  on public.attachments(storage_bucket, storage_object_path)
  where storage_bucket is not null and storage_object_path is not null;

create or replace trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create or replace trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create or replace trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create or replace trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create or replace trigger company_reviews_set_updated_at
before update on public.company_reviews
for each row execute function public.set_updated_at();

create or replace trigger set_client_accounts_updated_at
before update on public.client_accounts
for each row execute function public.set_updated_at();

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  );
$$;

create or replace function public.company_role(p_company_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select cm.role
  from public.company_members cm
  where cm.company_id = p_company_id
    and cm.user_id = auth.uid()
    and cm.is_active = true
  limit 1;
$$;

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

create or replace function public.current_client_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.company_id
  from public.client_accounts ca
  join public.clients c on c.id = ca.client_id
  where ca.id = public.current_client_account_id()
  limit 1;
$$;

create or replace function public.is_company_active(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.status = 'active'
  );
$$;

create or replace function public.can_write_company_data(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_company_active(p_company_id)
    and public.company_role(p_company_id) in ('owner', 'manager');
$$;

create or replace function public.can_manage_company_members(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or public.can_write_company_data(p_company_id);
$$;

drop policy if exists "Public users can read active companies" on public.companies;
create policy "Public users can read active companies"
on public.companies
for select
to anon
using (status = 'active');

drop policy if exists "Company members can read own companies" on public.companies;
create policy "Company members can read own companies"
on public.companies
for select
to authenticated
using (public.is_company_member(companies.id));

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

create or replace function public.default_company_id_by_slug(p_slug text default null)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.companies c
  where c.slug = nullif(trim(p_slug), '')
    and c.status = 'active'
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

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.attachments enable row level security;
alter table public.company_reviews enable row level security;
alter table public.automation_runs enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.client_accounts enable row level security;

drop policy if exists "Staff can read profiles" on public.profiles;
drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (
  auth.uid() = profiles.id
  or public.is_platform_admin()
  or exists (
    select 1
    from public.company_members viewer
    join public.company_members target
      on target.company_id = viewer.company_id
    where viewer.user_id = auth.uid()
      and viewer.is_active = true
      and target.user_id = profiles.id
      and target.is_active = true
  )
);

drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Owners can manage all profiles" on public.profiles;
drop policy if exists "Company managers can manage member profiles" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
  or exists (
    select 1
    from public.company_members cm
    where cm.user_id = profiles.id
      and public.can_manage_company_members(cm.company_id)
  )
);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Company managers can manage member profiles"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = profiles.id
      and public.can_manage_company_members(cm.company_id)
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = profiles.id
      and public.can_manage_company_members(cm.company_id)
  )
);

drop policy if exists "Users can read member companies" on public.companies;
create policy "Users can read member companies"
on public.companies
for select
to authenticated
using (public.is_company_member(companies.id));

drop policy if exists "Public users can read active companies" on public.companies;
create policy "Public users can read active companies"
on public.companies
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Authenticated users can create companies" on public.companies;
create policy "Authenticated users can create companies"
on public.companies
for insert
to authenticated
with check (true);

drop policy if exists "Company managers can update own company" on public.companies;
create policy "Company managers can update own company"
on public.companies
for update
to authenticated
using (public.can_write_company_data(companies.id))
with check (public.can_write_company_data(companies.id));

drop policy if exists "Platform admins can update all companies" on public.companies;
create policy "Platform admins can update all companies"
on public.companies
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists "Users can read own company memberships" on public.company_members;
drop policy if exists "Company members can read memberships in own company" on public.company_members;
create policy "Company members can read memberships in own company"
on public.company_members
for select
to authenticated
using (
  public.is_company_member(company_members.company_id)
);

drop policy if exists "Platform admins can read all memberships" on public.company_members;
create policy "Platform admins can read all memberships"
on public.company_members
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "Company managers can insert memberships" on public.company_members;
create policy "Company managers can insert memberships"
on public.company_members
for insert
to authenticated
with check (
  public.can_manage_company_members(company_members.company_id)
);

drop policy if exists "Company managers can update memberships" on public.company_members;
create policy "Company managers can update memberships"
on public.company_members
for update
to authenticated
using (
  public.can_manage_company_members(company_members.company_id)
)
with check (
  public.can_manage_company_members(company_members.company_id)
);

drop policy if exists "Company managers can delete memberships" on public.company_members;
create policy "Company managers can delete memberships"
on public.company_members
for delete
to authenticated
using (
  public.can_manage_company_members(company_members.company_id)
);

drop policy if exists "Authenticated users can manage clients" on public.clients;
drop policy if exists "Owners and managers can read all clients" on public.clients;
drop policy if exists "Detailers can read assigned clients" on public.clients;
drop policy if exists "Owners and managers can create clients" on public.clients;
drop policy if exists "Owners and managers can update clients" on public.clients;
drop policy if exists "Owners and managers can delete clients" on public.clients;
drop policy if exists "Clients can read own client" on public.clients;

create policy "Owners and managers can read all clients"
on public.clients
for select
to authenticated
using (
  public.company_role(clients.company_id) in ('owner', 'manager')
);

drop policy if exists "Platform admins can read all clients" on public.clients;
create policy "Platform admins can read all clients"
on public.clients
for select
to authenticated
using (public.is_platform_admin());

create policy "Detailers can read assigned clients"
on public.clients
for select
to authenticated
using (
  public.company_role(clients.company_id) = 'detailer'
  and exists (
    select 1
    from public.leads
    where leads.client_id = clients.id
      and leads.company_id = clients.company_id
      and leads.assigned_to = auth.uid()
  )
);

create policy "Owners and managers can create clients"
on public.clients
for insert
to authenticated
with check (public.can_write_company_data(clients.company_id));

create policy "Owners and managers can update clients"
on public.clients
for update
to authenticated
using (public.can_write_company_data(clients.company_id))
with check (public.can_write_company_data(clients.company_id));

create policy "Owners and managers can delete clients"
on public.clients
for delete
to authenticated
using (public.can_write_company_data(clients.company_id));

create policy "Clients can read own client"
on public.clients
for select
to authenticated
using (id = public.current_client_id());

drop policy if exists "Authenticated users can manage services" on public.services;
drop policy if exists "Authenticated users can read services" on public.services;
drop policy if exists "Owners and managers can manage services" on public.services;
drop policy if exists "Staff can read services" on public.services;
drop policy if exists "Clients can read active services" on public.services;
drop policy if exists "Public users can read active services" on public.services;

create policy "Staff can read services"
on public.services
for select
to authenticated
using (
  public.is_company_member(services.company_id)
);

drop policy if exists "Platform admins can read all services" on public.services;
create policy "Platform admins can read all services"
on public.services
for select
to authenticated
using (public.is_platform_admin());

create policy "Owners and managers can manage services"
on public.services
for all
to authenticated
using (public.can_write_company_data(services.company_id))
with check (public.can_write_company_data(services.company_id));

create policy "Clients can read active services"
on public.services
for select
to authenticated
using (
  is_active = true
  and services.company_id = public.current_client_company_id()
);

create policy "Public users can read active services"
on public.services
for select
to anon
using (
  is_active = true
  and exists (
    select 1
    from public.companies c
    where c.id = services.company_id
      and c.status = 'active'
  )
);

drop policy if exists "Authenticated users can manage leads" on public.leads;
drop policy if exists "Owners and managers can read all leads" on public.leads;
drop policy if exists "Detailers can read assigned leads" on public.leads;
drop policy if exists "Owners and managers can create leads" on public.leads;
drop policy if exists "Owners and managers can update leads" on public.leads;
drop policy if exists "Owners and managers can delete leads" on public.leads;
drop policy if exists "Clients can read own leads" on public.leads;

create policy "Owners and managers can read all leads"
on public.leads
for select
to authenticated
using (
  public.company_role(leads.company_id) in ('owner', 'manager')
);

drop policy if exists "Platform admins can read all leads" on public.leads;
create policy "Platform admins can read all leads"
on public.leads
for select
to authenticated
using (public.is_platform_admin());

create policy "Detailers can read assigned leads"
on public.leads
for select
to authenticated
using (
  public.company_role(leads.company_id) = 'detailer'
  and leads.assigned_to = auth.uid()
);

create policy "Owners and managers can create leads"
on public.leads
for insert
to authenticated
with check (public.can_write_company_data(leads.company_id));

create policy "Owners and managers can update leads"
on public.leads
for update
to authenticated
using (public.can_write_company_data(leads.company_id))
with check (public.can_write_company_data(leads.company_id));

create policy "Owners and managers can delete leads"
on public.leads
for delete
to authenticated
using (public.can_write_company_data(leads.company_id));

create policy "Clients can read own leads"
on public.leads
for select
to authenticated
using (client_id = public.current_client_id());

drop policy if exists "Authenticated users can manage lead events" on public.lead_events;
drop policy if exists "Owners and managers can read all lead events" on public.lead_events;
drop policy if exists "Detailers can read assigned lead events" on public.lead_events;
drop policy if exists "Owners and managers can create lead events" on public.lead_events;
drop policy if exists "Owners and managers can update lead events" on public.lead_events;
drop policy if exists "Owners and managers can delete lead events" on public.lead_events;
drop policy if exists "Clients can read own lead events" on public.lead_events;

create policy "Owners and managers can read all lead events"
on public.lead_events
for select
to authenticated
using (
  public.company_role(lead_events.company_id) in ('owner', 'manager')
);

create policy "Detailers can read assigned lead events"
on public.lead_events
for select
to authenticated
using (
  public.company_role(lead_events.company_id) = 'detailer'
  and exists (
    select 1
    from public.leads
    where leads.id = lead_events.lead_id
      and leads.company_id = lead_events.company_id
      and leads.assigned_to = auth.uid()
  )
);

create policy "Owners and managers can create lead events"
on public.lead_events
for insert
to authenticated
with check (public.can_write_company_data(lead_events.company_id));

create policy "Owners and managers can update lead events"
on public.lead_events
for update
to authenticated
using (public.can_write_company_data(lead_events.company_id))
with check (public.can_write_company_data(lead_events.company_id));

create policy "Owners and managers can delete lead events"
on public.lead_events
for delete
to authenticated
using (public.can_write_company_data(lead_events.company_id));

create policy "Clients can read own lead events"
on public.lead_events
for select
to authenticated
using (public.can_current_client_access_lead(lead_id));

drop policy if exists "Authenticated users can manage attachments" on public.attachments;
drop policy if exists "Owners and managers can read all attachments" on public.attachments;
drop policy if exists "Detailers can read assigned attachments" on public.attachments;
drop policy if exists "Owners and managers can create attachments" on public.attachments;
drop policy if exists "Owners and managers can update attachments" on public.attachments;
drop policy if exists "Owners and managers can delete attachments" on public.attachments;
drop policy if exists "Clients can read own attachments" on public.attachments;

create policy "Owners and managers can read all attachments"
on public.attachments
for select
to authenticated
using (
  public.company_role(attachments.company_id) in ('owner', 'manager')
);

create policy "Detailers can read assigned attachments"
on public.attachments
for select
to authenticated
using (
  public.company_role(attachments.company_id) = 'detailer'
  and exists (
    select 1
    from public.leads
    where leads.id = attachments.lead_id
      and leads.company_id = attachments.company_id
      and leads.assigned_to = auth.uid()
  )
);

create policy "Owners and managers can create attachments"
on public.attachments
for insert
to authenticated
with check (public.can_write_company_data(attachments.company_id));

create policy "Owners and managers can update attachments"
on public.attachments
for update
to authenticated
using (public.can_write_company_data(attachments.company_id))
with check (public.can_write_company_data(attachments.company_id));

create policy "Owners and managers can delete attachments"
on public.attachments
for delete
to authenticated
using (public.can_write_company_data(attachments.company_id));

create policy "Clients can read own attachments"
on public.attachments
for select
to authenticated
using (public.can_current_client_access_lead(lead_id));

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

drop policy if exists "Authenticated users can read automation runs" on public.automation_runs;
drop policy if exists "Owners and managers can read automation runs" on public.automation_runs;

create policy "Owners and managers can read automation runs"
on public.automation_runs
for select
to authenticated
using (
  public.company_role(automation_runs.company_id) in ('owner', 'manager')
);

drop policy if exists "Owners and managers can read rate limit events" on public.rate_limit_events;
drop policy if exists "Platform admins can read rate limit events" on public.rate_limit_events;
create policy "Platform admins can read rate limit events"
on public.rate_limit_events
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "Owners and managers can read client accounts" on public.client_accounts;
drop policy if exists "Owners and managers can create client accounts" on public.client_accounts;
drop policy if exists "Owners and managers can update client accounts" on public.client_accounts;
drop policy if exists "Owners and managers can delete client accounts" on public.client_accounts;
drop policy if exists "Clients can read own client account" on public.client_accounts;

create policy "Owners and managers can read client accounts"
on public.client_accounts
for select
to authenticated
using (
  public.company_role(client_accounts.company_id) in ('owner', 'manager')
);

create policy "Owners and managers can create client accounts"
on public.client_accounts
for insert
to authenticated
with check (public.can_write_company_data(client_accounts.company_id));

create policy "Owners and managers can update client accounts"
on public.client_accounts
for update
to authenticated
using (public.can_write_company_data(client_accounts.company_id))
with check (public.can_write_company_data(client_accounts.company_id));

create policy "Owners and managers can delete client accounts"
on public.client_accounts
for delete
to authenticated
using (public.can_write_company_data(client_accounts.company_id));

create policy "Clients can read own client account"
on public.client_accounts
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or (
    auth_user_id is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

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

grant execute on function public.submit_public_lead(
  text, text, text, uuid, text, text, integer, text, text, text, text, date, text, numeric, timestamptz, text, text
) to anon;

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

revoke all on function public.get_public_lead_status(uuid) from public;
grant execute on function public.get_public_lead_status(uuid) to anon, authenticated;

-- Creates a profile row automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('client-lead-attachments', 'client-lead-attachments', false)
on conflict (id) do nothing;

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

revoke all on function public.is_company_member(uuid) from public;
revoke all on function public.company_role(uuid) from public;
revoke all on function public.current_staff_company_id() from public;
revoke all on function public.current_client_account_id() from public;
revoke all on function public.current_client_id() from public;
revoke all on function public.current_client_company_id() from public;
revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_company_active(uuid) from public;
revoke all on function public.can_write_company_data(uuid) from public;
revoke all on function public.can_manage_company_members(uuid) from public;
revoke all on function public.can_current_client_access_lead(uuid) from public;
revoke all on function public.can_current_client_access_attachment_object(text, text) from public;
revoke all on function public.default_company_id_by_slug(text) from public;
revoke all on function public.set_company_id_defaults() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.link_my_client_account() from public;
revoke all on function public.get_my_leads() from public;
revoke all on function public.get_my_active_lead() from public;
revoke all on function public.get_my_lead_events(uuid) from public;
revoke all on function public.get_my_lead_attachments(uuid) from public;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.company_role(uuid) to authenticated;
grant execute on function public.current_staff_company_id() to authenticated;
grant execute on function public.current_client_account_id() to authenticated;
grant execute on function public.current_client_id() to authenticated;
grant execute on function public.current_client_company_id() to authenticated;
grant execute on function public.is_company_active(uuid) to authenticated;
grant execute on function public.can_write_company_data(uuid) to authenticated;
grant execute on function public.can_manage_company_members(uuid) to authenticated;
grant execute on function public.can_current_client_access_lead(uuid) to authenticated;
grant execute on function public.can_current_client_access_attachment_object(text, text) to authenticated;
grant execute on function public.default_company_id_by_slug(text) to anon;
grant execute on function public.link_my_client_account() to authenticated;
grant execute on function public.get_my_leads() to authenticated;
grant execute on function public.get_my_active_lead() to authenticated;
grant execute on function public.get_my_lead_events(uuid) to authenticated;
grant execute on function public.get_my_lead_attachments(uuid) to authenticated;

drop policy if exists "Owners and managers can manage client attachment objects" on storage.objects;
create policy "Owners and managers can manage client attachment objects"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'client-lead-attachments'
  and exists (
    select 1
    from public.attachments a
    where a.storage_bucket = storage.objects.bucket_id
      and a.storage_object_path = storage.objects.name
      and public.can_write_company_data(a.company_id)
  )
)
with check (
  bucket_id = 'client-lead-attachments'
  and exists (
    select 1
    from public.attachments a
    where a.storage_bucket = storage.objects.bucket_id
      and a.storage_object_path = storage.objects.name
      and public.can_write_company_data(a.company_id)
  )
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
      and a.company_id = l.company_id
      and public.company_role(a.company_id) = 'detailer'
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
