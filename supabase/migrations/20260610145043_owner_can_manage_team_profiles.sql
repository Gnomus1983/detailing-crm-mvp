drop policy if exists "Owners can manage all profiles" on public.profiles;
create policy "Owners can manage all profiles"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles actor
    where actor.id = auth.uid()
      and actor.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.profiles actor
    where actor.id = auth.uid()
      and actor.role = 'owner'
  )
);;
