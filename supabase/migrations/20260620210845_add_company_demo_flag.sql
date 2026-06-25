alter table public.companies
  add column if not exists is_demo boolean not null default false;

update public.companies
set is_demo = true
where slug in ('detail-crm-demo', 'north-bay-demo');
