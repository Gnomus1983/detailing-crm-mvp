create table if not exists public.company_subscription_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  subscription_id uuid references public.company_subscriptions(id) on delete set null,
  event_type text not null
    check (event_type in ('created', 'updated', 'status_changed', 'billing_changed', 'plan_changed')),
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists company_subscription_events_company_id_idx
  on public.company_subscription_events(company_id);

create index if not exists company_subscription_events_created_at_idx
  on public.company_subscription_events(created_at desc);

alter table public.company_subscription_events enable row level security;

drop policy if exists "Platform admins can read subscription events" on public.company_subscription_events;
create policy "Platform admins can read subscription events"
on public.company_subscription_events
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "Platform admins can insert subscription events" on public.company_subscription_events;
create policy "Platform admins can insert subscription events"
on public.company_subscription_events
for insert
to authenticated
with check (public.is_platform_admin());
