drop policy if exists "Authenticated users can read profiles" on public.profiles;

create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (
  auth.uid() = profiles.id
  or public.is_platform_admin()
  or exists (
    select 1
    from public.company_members viewer
    join public.company_members target
      on target.company_id = viewer.company_id
    where viewer.user_id = auth.uid()
      and viewer.is_active = true
      and target.user_id = profiles.id
      and target.is_active = true
  )
);
