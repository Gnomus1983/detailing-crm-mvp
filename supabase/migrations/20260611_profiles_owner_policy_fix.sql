create or replace function public.is_current_user_owner()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
  );
$$;

grant execute on function public.is_current_user_owner() to authenticated;

drop policy if exists "Owners can manage all profiles" on public.profiles;
create policy "Owners can manage all profiles"
on public.profiles
for all
to authenticated
using (public.is_current_user_owner())
with check (public.is_current_user_owner());
