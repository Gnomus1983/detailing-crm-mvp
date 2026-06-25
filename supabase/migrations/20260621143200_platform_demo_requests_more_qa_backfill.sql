update public.platform_demo_requests
set
  is_demo = true,
  source = case when source = 'landing' then 'qa' else source end,
  meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object('qa_demo', true)
where
  lower(coalesce(name, '')) like '%creator handoff qa%'
  or lower(coalesce(company_name, '')) like '%qa structured center%'
  or lower(coalesce(comment, '')) like '%structured handoff check%';
