alter table public.platform_demo_requests
  add column if not exists connected_company_id uuid references public.companies(id) on delete set null,
  add column if not exists contacted_at timestamptz,
  add column if not exists qualified_at timestamptz,
  add column if not exists connected_at timestamptz,
  add column if not exists archived_at timestamptz;

create index if not exists platform_demo_requests_connected_company_idx
  on public.platform_demo_requests(connected_company_id);
