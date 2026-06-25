create or replace function public.can_manage_company_members(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.company_role(p_company_id) in ('owner', 'manager');
$$;

drop policy if exists "Users can read own company memberships" on public.company_members;
create policy "Company members can read memberships in own company"
on public.company_members
for select
to authenticated
using (
  public.is_company_member(company_members.company_id)
);

drop policy if exists "Company managers can insert memberships" on public.company_members;
create policy "Company managers can insert memberships"
on public.company_members
for insert
to authenticated
with check (
  public.can_manage_company_members(company_members.company_id)
);

drop policy if exists "Company managers can update memberships" on public.company_members;
create policy "Company managers can update memberships"
on public.company_members
for update
to authenticated
using (
  public.can_manage_company_members(company_members.company_id)
)
with check (
  public.can_manage_company_members(company_members.company_id)
);

drop policy if exists "Company managers can delete memberships" on public.company_members;
create policy "Company managers can delete memberships"
on public.company_members
for delete
to authenticated
using (
  public.can_manage_company_members(company_members.company_id)
);;
