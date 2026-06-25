drop policy if exists "Public users can read active companies" on public.companies;
create policy "Public users can read active companies"
on public.companies
for select
to anon, authenticated
using (status = 'active');;
