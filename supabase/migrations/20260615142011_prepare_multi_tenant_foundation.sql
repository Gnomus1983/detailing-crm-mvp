create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
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

create or replace trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.company_members enable row level security;

drop policy if exists "Users can read member companies" on public.companies;
create policy "Users can read member companies"
on public.companies
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = companies.id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  )
);

drop policy if exists "Users can read own company memberships" on public.company_members;
create policy "Users can read own company memberships"
on public.company_members
for select
to authenticated
using (user_id = auth.uid());

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

alter table public.clients
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.services
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.leads
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.lead_events
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.attachments
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.automation_runs
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table if exists public.client_accounts
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

create index if not exists companies_slug_idx
  on public.companies(slug);

create index if not exists company_members_company_id_idx
  on public.company_members(company_id);

create index if not exists company_members_user_id_idx
  on public.company_members(user_id);

create index if not exists clients_company_id_idx
  on public.clients(company_id);

create index if not exists services_company_id_idx
  on public.services(company_id);

create index if not exists leads_company_id_idx
  on public.leads(company_id);

create index if not exists lead_events_company_id_idx
  on public.lead_events(company_id);

create index if not exists attachments_company_id_idx
  on public.attachments(company_id);

create index if not exists automation_runs_company_id_idx
  on public.automation_runs(company_id);

create index if not exists client_accounts_company_id_idx
  on public.client_accounts(company_id);;
