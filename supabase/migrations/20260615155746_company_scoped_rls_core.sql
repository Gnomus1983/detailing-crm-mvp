create or replace function public.current_client_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.company_id
  from public.client_accounts ca
  join public.clients c on c.id = ca.client_id
  where ca.id = public.current_client_account_id()
  limit 1;
$$;

drop policy if exists "Owners and managers can read all clients" on public.clients;
drop policy if exists "Detailers can read assigned clients" on public.clients;
drop policy if exists "Owners and managers can create clients" on public.clients;
drop policy if exists "Owners and managers can update clients" on public.clients;
drop policy if exists "Owners and managers can delete clients" on public.clients;

create policy "Owners and managers can read all clients"
on public.clients
for select
to authenticated
using (
  public.company_role(clients.company_id) in ('owner', 'manager')
);

create policy "Detailers can read assigned clients"
on public.clients
for select
to authenticated
using (
  public.company_role(clients.company_id) = 'detailer'
  and exists (
    select 1
    from public.leads
    where leads.client_id = clients.id
      and leads.company_id = clients.company_id
      and leads.assigned_to = auth.uid()
  )
);

create policy "Owners and managers can create clients"
on public.clients
for insert
to authenticated
with check (
  public.company_role(clients.company_id) in ('owner', 'manager')
);

create policy "Owners and managers can update clients"
on public.clients
for update
to authenticated
using (
  public.company_role(clients.company_id) in ('owner', 'manager')
)
with check (
  public.company_role(clients.company_id) in ('owner', 'manager')
);

create policy "Owners and managers can delete clients"
on public.clients
for delete
to authenticated
using (
  public.company_role(clients.company_id) in ('owner', 'manager')
);

drop policy if exists "Owners and managers can manage services" on public.services;
drop policy if exists "Staff can read services" on public.services;
drop policy if exists "Authenticated users can read services" on public.services;
drop policy if exists "Clients can read active services" on public.services;
drop policy if exists "Public users can read active services" on public.services;

create policy "Staff can read services"
on public.services
for select
to authenticated
using (
  public.is_company_member(services.company_id)
);

create policy "Owners and managers can manage services"
on public.services
for all
to authenticated
using (
  public.company_role(services.company_id) in ('owner', 'manager')
)
with check (
  public.company_role(services.company_id) in ('owner', 'manager')
);

create policy "Clients can read active services"
on public.services
for select
to authenticated
using (
  is_active = true
  and services.company_id = public.current_client_company_id()
);

create policy "Public users can read active services"
on public.services
for select
to anon
using (is_active = true);

drop policy if exists "Owners and managers can read all leads" on public.leads;
drop policy if exists "Detailers can read assigned leads" on public.leads;
drop policy if exists "Owners and managers can create leads" on public.leads;
drop policy if exists "Owners and managers can update leads" on public.leads;
drop policy if exists "Owners and managers can delete leads" on public.leads;

create policy "Owners and managers can read all leads"
on public.leads
for select
to authenticated
using (
  public.company_role(leads.company_id) in ('owner', 'manager')
);

create policy "Detailers can read assigned leads"
on public.leads
for select
to authenticated
using (
  public.company_role(leads.company_id) = 'detailer'
  and leads.assigned_to = auth.uid()
);

create policy "Owners and managers can create leads"
on public.leads
for insert
to authenticated
with check (
  public.company_role(leads.company_id) in ('owner', 'manager')
);

create policy "Owners and managers can update leads"
on public.leads
for update
to authenticated
using (
  public.company_role(leads.company_id) in ('owner', 'manager')
)
with check (
  public.company_role(leads.company_id) in ('owner', 'manager')
);

create policy "Owners and managers can delete leads"
on public.leads
for delete
to authenticated
using (
  public.company_role(leads.company_id) in ('owner', 'manager')
);

drop policy if exists "Owners and managers can read all lead events" on public.lead_events;
drop policy if exists "Detailers can read assigned lead events" on public.lead_events;
drop policy if exists "Owners and managers can create lead events" on public.lead_events;
drop policy if exists "Owners and managers can update lead events" on public.lead_events;
drop policy if exists "Owners and managers can delete lead events" on public.lead_events;

create policy "Owners and managers can read all lead events"
on public.lead_events
for select
to authenticated
using (
  public.company_role(lead_events.company_id) in ('owner', 'manager')
);

create policy "Detailers can read assigned lead events"
on public.lead_events
for select
to authenticated
using (
  public.company_role(lead_events.company_id) = 'detailer'
  and exists (
    select 1
    from public.leads
    where leads.id = lead_events.lead_id
      and leads.company_id = lead_events.company_id
      and leads.assigned_to = auth.uid()
  )
);

create policy "Owners and managers can create lead events"
on public.lead_events
for insert
to authenticated
with check (
  public.company_role(lead_events.company_id) in ('owner', 'manager')
);

create policy "Owners and managers can update lead events"
on public.lead_events
for update
to authenticated
using (
  public.company_role(lead_events.company_id) in ('owner', 'manager')
)
with check (
  public.company_role(lead_events.company_id) in ('owner', 'manager')
);

create policy "Owners and managers can delete lead events"
on public.lead_events
for delete
to authenticated
using (
  public.company_role(lead_events.company_id) in ('owner', 'manager')
);

drop policy if exists "Owners and managers can read all attachments" on public.attachments;
drop policy if exists "Detailers can read assigned attachments" on public.attachments;
drop policy if exists "Owners and managers can create attachments" on public.attachments;
drop policy if exists "Owners and managers can update attachments" on public.attachments;
drop policy if exists "Owners and managers can delete attachments" on public.attachments;

create policy "Owners and managers can read all attachments"
on public.attachments
for select
to authenticated
using (
  public.company_role(attachments.company_id) in ('owner', 'manager')
);

create policy "Detailers can read assigned attachments"
on public.attachments
for select
to authenticated
using (
  public.company_role(attachments.company_id) = 'detailer'
  and exists (
    select 1
    from public.leads
    where leads.id = attachments.lead_id
      and leads.company_id = attachments.company_id
      and leads.assigned_to = auth.uid()
  )
);

create policy "Owners and managers can create attachments"
on public.attachments
for insert
to authenticated
with check (
  public.company_role(attachments.company_id) in ('owner', 'manager')
);

create policy "Owners and managers can update attachments"
on public.attachments
for update
to authenticated
using (
  public.company_role(attachments.company_id) in ('owner', 'manager')
)
with check (
  public.company_role(attachments.company_id) in ('owner', 'manager')
);

create policy "Owners and managers can delete attachments"
on public.attachments
for delete
to authenticated
using (
  public.company_role(attachments.company_id) in ('owner', 'manager')
);

drop policy if exists "Owners and managers can read automation runs" on public.automation_runs;

create policy "Owners and managers can read automation runs"
on public.automation_runs
for select
to authenticated
using (
  public.company_role(automation_runs.company_id) in ('owner', 'manager')
);

drop policy if exists "Owners and managers can read client accounts" on public.client_accounts;
drop policy if exists "Owners and managers can create client accounts" on public.client_accounts;
drop policy if exists "Owners and managers can update client accounts" on public.client_accounts;
drop policy if exists "Owners and managers can delete client accounts" on public.client_accounts;

create policy "Owners and managers can read client accounts"
on public.client_accounts
for select
to authenticated
using (
  public.company_role(client_accounts.company_id) in ('owner', 'manager')
);

create policy "Owners and managers can create client accounts"
on public.client_accounts
for insert
to authenticated
with check (
  public.company_role(client_accounts.company_id) in ('owner', 'manager')
);

create policy "Owners and managers can update client accounts"
on public.client_accounts
for update
to authenticated
using (
  public.company_role(client_accounts.company_id) in ('owner', 'manager')
)
with check (
  public.company_role(client_accounts.company_id) in ('owner', 'manager')
);

create policy "Owners and managers can delete client accounts"
on public.client_accounts
for delete
to authenticated
using (
  public.company_role(client_accounts.company_id) in ('owner', 'manager')
);;
