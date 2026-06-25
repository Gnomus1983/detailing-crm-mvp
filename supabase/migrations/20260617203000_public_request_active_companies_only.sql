create or replace function public.default_company_id_by_slug(p_slug text default 'detail-crm-demo')
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.companies c
  where c.slug = coalesce(nullif(trim(p_slug), ''), 'detail-crm-demo')
    and c.status = 'active'
  limit 1;
$$;
