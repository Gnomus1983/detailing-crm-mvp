drop policy if exists "Platform admins can update all companies" on public.companies;
create policy "Platform admins can update all companies"
on public.companies
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists "Platform admins can read all memberships" on public.company_members;
create policy "Platform admins can read all memberships"
on public.company_members
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "Platform admins can read all clients" on public.clients;
create policy "Platform admins can read all clients"
on public.clients
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "Platform admins can read all leads" on public.leads;
create policy "Platform admins can read all leads"
on public.leads
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "Platform admins can read all services" on public.services;
create policy "Platform admins can read all services"
on public.services
for select
to authenticated
using (public.is_platform_admin());
