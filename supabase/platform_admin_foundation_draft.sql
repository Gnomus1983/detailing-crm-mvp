-- Draft only.
-- Do not apply blindly to production.
-- This file prepares the future creator / platform-admin layer
-- that sits above ordinary company CRM access.

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

-- Intended future direction:
-- 1. platform admins can read/update companies across the whole SaaS
-- 2. platform admins can read/write company_subscriptions
-- 3. route /platform should be gated by is_platform_admin()
