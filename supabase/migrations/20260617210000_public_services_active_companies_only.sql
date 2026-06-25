drop policy if exists "Public users can read active services" on public.services;

create policy "Public users can read active services"
on public.services
for select
to anon
using (
  is_active = true
  and exists (
    select 1
    from public.companies c
    where c.id = services.company_id
      and c.status = 'active'
  )
);
