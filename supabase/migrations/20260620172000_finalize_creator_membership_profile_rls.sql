create or replace function public.can_manage_company_members(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or public.can_write_company_data(p_company_id);
$$;

drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Owners can manage all profiles" on public.profiles;
drop policy if exists "Company managers can manage member profiles" on public.profiles;

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
  or exists (
    select 1
    from public.company_members cm
    where cm.user_id = profiles.id
      and public.can_manage_company_members(cm.company_id)
  )
);

create policy "Company managers can manage member profiles"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = profiles.id
      and public.can_manage_company_members(cm.company_id)
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = profiles.id
      and public.can_manage_company_members(cm.company_id)
  )
);

grant execute on function public.can_manage_company_members(uuid) to authenticated;
