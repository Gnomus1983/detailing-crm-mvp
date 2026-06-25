drop policy if exists "Owners and managers can read rate limit events" on public.rate_limit_events;

create policy "Platform admins can read rate limit events"
on public.rate_limit_events
for select
to authenticated
using (public.is_platform_admin());
