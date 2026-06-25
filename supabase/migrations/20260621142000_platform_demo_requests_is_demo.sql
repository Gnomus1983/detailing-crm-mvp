alter table public.platform_demo_requests
  add column if not exists is_demo boolean not null default false;

update public.platform_demo_requests
set
  is_demo = true,
  source = case when source = 'landing' then 'qa' else source end,
  meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object('qa_demo', true)
where
  lower(coalesce(name, '')) like '%structured demo check%'
  or lower(coalesce(company_name, '')) like '%structured auto service qa%'
  or lower(coalesce(comment, '')) like '%[qa-check]%'
  or lower(coalesce(comment, '')) like '%structured demo-request check%'
  or lower(coalesce(name, '')) like '%creator handoff qa%'
  or lower(coalesce(company_name, '')) like '%qa structured center%'
  or lower(coalesce(comment, '')) like '%structured handoff check%';

create index if not exists platform_demo_requests_is_demo_idx
  on public.platform_demo_requests(is_demo);
