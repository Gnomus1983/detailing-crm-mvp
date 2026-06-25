create or replace function public.default_company_id_by_slug(p_slug text default null)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.companies c
  where c.slug = nullif(trim(p_slug), '')
    and c.status = 'active'
  limit 1;
$$;

revoke execute on function public.default_company_id_by_slug(text) from authenticated;
grant execute on function public.default_company_id_by_slug(text) to anon;
