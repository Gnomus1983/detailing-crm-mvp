drop policy if exists "Public users can read active companies" on public.companies;
create policy "Public users can read active companies"
on public.companies
for select
to anon
using (status = 'active');

drop policy if exists "Company members can read own companies" on public.companies;
create policy "Company members can read own companies"
on public.companies
for select
to authenticated
using (public.is_company_member(companies.id));
