create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  action_key text not null,
  identifier_hash text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists rate_limit_events_action_idx on public.rate_limit_events(action_key);
create index if not exists rate_limit_events_identifier_idx on public.rate_limit_events(identifier_hash);
create index if not exists rate_limit_events_created_at_idx on public.rate_limit_events(created_at);

alter table public.rate_limit_events enable row level security;

drop policy if exists "Owners and managers can read rate limit events" on public.rate_limit_events;
create policy "Owners and managers can read rate limit events"
on public.rate_limit_events
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('owner', 'manager')
  )
);;
