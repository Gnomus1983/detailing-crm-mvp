create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create table if not exists public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_code text not null default 'starter',
  billing_status text not null default 'trial'
    check (billing_status in ('trial', 'active', 'past_due', 'paused', 'canceled', 'manual')),
  currency text not null default 'EUR',
  price_monthly numeric(10, 2),
  seats_limit integer,
  starts_at timestamptz,
  trial_ends_at timestamptz,
  renews_at timestamptz,
  ends_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id)
);

create index if not exists platform_admins_user_id_idx
  on public.platform_admins(user_id);

create index if not exists company_subscriptions_company_id_idx
  on public.company_subscriptions(company_id);

create index if not exists company_subscriptions_billing_status_idx
  on public.company_subscriptions(billing_status);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.is_active = true
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

alter table public.platform_admins enable row level security;
alter table public.company_subscriptions enable row level security;

drop policy if exists "Platform admins can read self row" on public.platform_admins;
create policy "Platform admins can read self row"
on public.platform_admins
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Platform admins can read all companies" on public.companies;
create policy "Platform admins can read all companies"
on public.companies
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "Platform admins can read subscriptions" on public.company_subscriptions;
create policy "Platform admins can read subscriptions"
on public.company_subscriptions
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "Platform admins can insert subscriptions" on public.company_subscriptions;
create policy "Platform admins can insert subscriptions"
on public.company_subscriptions
for insert
to authenticated
with check (public.is_platform_admin());

drop policy if exists "Platform admins can update subscriptions" on public.company_subscriptions;
create policy "Platform admins can update subscriptions"
on public.company_subscriptions
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

do $$
declare
  v_creator_id uuid;
begin
  select u.id
  into v_creator_id
  from auth.users u
  where lower(u.email) = lower('arkhangel2016@gmail.com')
  limit 1;

  if v_creator_id is not null then
    insert into public.platform_admins (
      user_id,
      is_active,
      note
    )
    values (
      v_creator_id,
      true,
      'Seeded platform creator access'
    )
    on conflict (user_id) do update
    set
      is_active = true,
      note = excluded.note;
  end if;
end
$$;
