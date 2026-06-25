create or replace function public.is_company_active(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.status = 'active'
  );
$$;

create or replace function public.can_write_company_data(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_company_active(p_company_id)
    and public.company_role(p_company_id) in ('owner', 'manager');
$$;

create or replace function public.can_manage_company_members(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_write_company_data(p_company_id);
$$;

drop policy if exists "Company managers can update own company" on public.companies;
create policy "Company managers can update own company"
on public.companies
for update
to authenticated
using (public.can_write_company_data(companies.id))
with check (public.can_write_company_data(companies.id));

drop policy if exists "Company managers can insert memberships" on public.company_members;
create policy "Company managers can insert memberships"
on public.company_members
for insert
to authenticated
with check (public.can_manage_company_members(company_members.company_id));

drop policy if exists "Company managers can update memberships" on public.company_members;
create policy "Company managers can update memberships"
on public.company_members
for update
to authenticated
using (public.can_manage_company_members(company_members.company_id))
with check (public.can_manage_company_members(company_members.company_id));

drop policy if exists "Company managers can delete memberships" on public.company_members;
create policy "Company managers can delete memberships"
on public.company_members
for delete
to authenticated
using (public.can_manage_company_members(company_members.company_id));

drop policy if exists "Owners and managers can create clients" on public.clients;
create policy "Owners and managers can create clients"
on public.clients
for insert
to authenticated
with check (public.can_write_company_data(clients.company_id));

drop policy if exists "Owners and managers can update clients" on public.clients;
create policy "Owners and managers can update clients"
on public.clients
for update
to authenticated
using (public.can_write_company_data(clients.company_id))
with check (public.can_write_company_data(clients.company_id));

drop policy if exists "Owners and managers can delete clients" on public.clients;
create policy "Owners and managers can delete clients"
on public.clients
for delete
to authenticated
using (public.can_write_company_data(clients.company_id));

drop policy if exists "Owners and managers can manage services" on public.services;
create policy "Owners and managers can manage services"
on public.services
for all
to authenticated
using (public.can_write_company_data(services.company_id))
with check (public.can_write_company_data(services.company_id));

drop policy if exists "Owners and managers can create leads" on public.leads;
create policy "Owners and managers can create leads"
on public.leads
for insert
to authenticated
with check (public.can_write_company_data(leads.company_id));

drop policy if exists "Owners and managers can update leads" on public.leads;
create policy "Owners and managers can update leads"
on public.leads
for update
to authenticated
using (public.can_write_company_data(leads.company_id))
with check (public.can_write_company_data(leads.company_id));

drop policy if exists "Owners and managers can delete leads" on public.leads;
create policy "Owners and managers can delete leads"
on public.leads
for delete
to authenticated
using (public.can_write_company_data(leads.company_id));

drop policy if exists "Owners and managers can create lead events" on public.lead_events;
create policy "Owners and managers can create lead events"
on public.lead_events
for insert
to authenticated
with check (public.can_write_company_data(lead_events.company_id));

drop policy if exists "Owners and managers can update lead events" on public.lead_events;
create policy "Owners and managers can update lead events"
on public.lead_events
for update
to authenticated
using (public.can_write_company_data(lead_events.company_id))
with check (public.can_write_company_data(lead_events.company_id));

drop policy if exists "Owners and managers can delete lead events" on public.lead_events;
create policy "Owners and managers can delete lead events"
on public.lead_events
for delete
to authenticated
using (public.can_write_company_data(lead_events.company_id));

drop policy if exists "Owners and managers can create attachments" on public.attachments;
create policy "Owners and managers can create attachments"
on public.attachments
for insert
to authenticated
with check (public.can_write_company_data(attachments.company_id));

drop policy if exists "Owners and managers can update attachments" on public.attachments;
create policy "Owners and managers can update attachments"
on public.attachments
for update
to authenticated
using (public.can_write_company_data(attachments.company_id))
with check (public.can_write_company_data(attachments.company_id));

drop policy if exists "Owners and managers can delete attachments" on public.attachments;
create policy "Owners and managers can delete attachments"
on public.attachments
for delete
to authenticated
using (public.can_write_company_data(attachments.company_id));

drop policy if exists "Owners and managers can create client accounts" on public.client_accounts;
create policy "Owners and managers can create client accounts"
on public.client_accounts
for insert
to authenticated
with check (public.can_write_company_data(client_accounts.company_id));

drop policy if exists "Owners and managers can update client accounts" on public.client_accounts;
create policy "Owners and managers can update client accounts"
on public.client_accounts
for update
to authenticated
using (public.can_write_company_data(client_accounts.company_id))
with check (public.can_write_company_data(client_accounts.company_id));

drop policy if exists "Owners and managers can delete client accounts" on public.client_accounts;
create policy "Owners and managers can delete client accounts"
on public.client_accounts
for delete
to authenticated
using (public.can_write_company_data(client_accounts.company_id));

drop policy if exists "Owners and managers can manage client attachment objects" on storage.objects;
create policy "Owners and managers can manage client attachment objects"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'client-lead-attachments'
  and exists (
    select 1
    from public.attachments a
    where a.storage_bucket = storage.objects.bucket_id
      and a.storage_object_path = storage.objects.name
      and public.can_write_company_data(a.company_id)
  )
)
with check (
  bucket_id = 'client-lead-attachments'
  and exists (
    select 1
    from public.attachments a
    where a.storage_bucket = storage.objects.bucket_id
      and a.storage_object_path = storage.objects.name
      and public.can_write_company_data(a.company_id)
  )
);

grant execute on function public.is_company_active(uuid) to authenticated;
grant execute on function public.can_write_company_data(uuid) to authenticated;
