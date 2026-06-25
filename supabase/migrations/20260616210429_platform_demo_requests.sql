create table if not exists public.platform_demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  business_type text not null default 'detailing',
  comment text null,
  source text not null default 'landing',
  status text not null default 'new',
  company_name text null,
  employees_count integer null,
  locations_count integer null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists platform_demo_requests_created_at_idx
  on public.platform_demo_requests(created_at desc);

create index if not exists platform_demo_requests_status_idx
  on public.platform_demo_requests(status);

alter table public.platform_demo_requests enable row level security;

create policy "platform admins can read demo requests"
  on public.platform_demo_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.platform_admins
      where platform_admins.user_id = auth.uid()
        and platform_admins.is_active = true
    )
  );

create policy "platform admins can update demo requests"
  on public.platform_demo_requests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.platform_admins
      where platform_admins.user_id = auth.uid()
        and platform_admins.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.platform_admins
      where platform_admins.user_id = auth.uid()
        and platform_admins.is_active = true
    )
  );

create policy "platform admins can insert demo requests manually"
  on public.platform_demo_requests
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.platform_admins
      where platform_admins.user_id = auth.uid()
        and platform_admins.is_active = true
    )
  );
