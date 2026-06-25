drop policy if exists "Authenticated users can create companies" on public.companies;
create policy "Authenticated users can create companies"
on public.companies
for insert
to authenticated
with check (true);

drop policy if exists "Company managers can update own company" on public.companies;
create policy "Company managers can update own company"
on public.companies
for update
to authenticated
using (
  public.company_role(companies.id) in ('owner', 'manager')
)
with check (
  public.company_role(companies.id) in ('owner', 'manager')
);;
