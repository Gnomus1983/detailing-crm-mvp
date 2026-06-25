drop policy if exists "Authenticated users can manage clients" on public.clients;
drop policy if exists "Authenticated users can manage services" on public.services;
drop policy if exists "Authenticated users can manage leads" on public.leads;
drop policy if exists "Authenticated users can manage lead events" on public.lead_events;
drop policy if exists "Authenticated users can manage attachments" on public.attachments;

create policy "Public can read clients for mvp"
on public.clients
for select
to anon, authenticated
using (true);

create policy "Authenticated users can write clients"
on public.clients
for insert
to authenticated
with check (true);

create policy "Authenticated users can update clients"
on public.clients
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete clients"
on public.clients
for delete
to authenticated
using (true);

create policy "Public can read services for mvp"
on public.services
for select
to anon, authenticated
using (true);

create policy "Authenticated users can write services"
on public.services
for insert
to authenticated
with check (true);

create policy "Authenticated users can update services"
on public.services
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete services"
on public.services
for delete
to authenticated
using (true);

create policy "Public can read leads for mvp"
on public.leads
for select
to anon, authenticated
using (true);

create policy "Authenticated users can write leads"
on public.leads
for insert
to authenticated
with check (true);

create policy "Authenticated users can update leads"
on public.leads
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete leads"
on public.leads
for delete
to authenticated
using (true);

create policy "Public can read lead events for mvp"
on public.lead_events
for select
to anon, authenticated
using (true);

create policy "Authenticated users can write lead events"
on public.lead_events
for insert
to authenticated
with check (true);

create policy "Authenticated users can update lead events"
on public.lead_events
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete lead events"
on public.lead_events
for delete
to authenticated
using (true);

create policy "Public can read attachments for mvp"
on public.attachments
for select
to anon, authenticated
using (true);

create policy "Authenticated users can write attachments"
on public.attachments
for insert
to authenticated
with check (true);

create policy "Authenticated users can update attachments"
on public.attachments
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete attachments"
on public.attachments
for delete
to authenticated
using (true);;
