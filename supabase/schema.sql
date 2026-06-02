-- Detailing CRM MVP schema
-- Safe to run on a fresh Supabase project.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'manager'
    check (role in ('owner', 'manager', 'detailer')),
  telegram_chat_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  car_make text,
  car_model text,
  car_year integer,
  car_plate text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_price numeric(10, 2) not null default 0,
  duration_minutes integer not null default 60,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  service_id uuid references public.services(id) on delete set null,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'quoted', 'scheduled', 'in_progress', 'done', 'lost')),
  source text not null default 'manual'
    check (source in ('manual', 'landing', 'instagram', 'telegram', 'whatsapp', 'phone', 'facebook', 'other')),
  address text,
  comment text,
  preferred_date date,
  preferred_time text,
  estimated_price numeric(10, 2),
  assigned_to uuid references public.profiles(id) on delete set null,
  follow_up_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null
    check (type in ('created', 'status_changed', 'note_added', 'follow_up_set', 'assigned', 'price_updated', 'reminder_sent')),
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  file_url text not null,
  file_type text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_key text not null,
  status text not null
    check (status in ('started', 'success', 'error', 'skipped')),
  scope_key text,
  lead_id uuid references public.leads(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists clients_phone_idx on public.clients(phone);
create unique index if not exists clients_phone_unique_idx on public.clients(phone);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_source_idx on public.leads(source);
create index if not exists leads_follow_up_at_idx on public.leads(follow_up_at);
create index if not exists leads_client_id_idx on public.leads(client_id);
create index if not exists lead_events_lead_id_idx on public.lead_events(lead_id);
create index if not exists automation_runs_key_idx on public.automation_runs(automation_key);
create index if not exists automation_runs_scope_idx on public.automation_runs(scope_key);
create index if not exists automation_runs_lead_id_idx on public.automation_runs(lead_id);

create or replace trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create or replace trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create or replace trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.attachments enable row level security;
alter table public.automation_runs enable row level security;

create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Authenticated users can manage clients"
on public.clients
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage services"
on public.services
for all
to authenticated
using (true)
with check (true);

create policy "Public users can read active services"
on public.services
for select
to anon
using (is_active = true);

create policy "Authenticated users can manage leads"
on public.leads
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage lead events"
on public.lead_events
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage attachments"
on public.attachments
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read automation runs"
on public.automation_runs
for select
to authenticated
using (true);

create or replace function public.submit_public_lead(
  p_client_name text,
  p_phone text,
  p_email text default null,
  p_service_id uuid default null,
  p_car_make text default null,
  p_car_model text default null,
  p_car_year integer default null,
  p_car_plate text default null,
  p_source text default 'landing',
  p_address text default null,
  p_comment text default null,
  p_preferred_date date default null,
  p_preferred_time text default null,
  p_estimated_price numeric default null,
  p_follow_up_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
  v_existing_client public.clients%rowtype;
  v_lead public.leads%rowtype;
  v_reused boolean := false;
begin
  select *
  into v_existing_client
  from public.clients
  where phone = trim(p_phone)
  limit 1;

  if v_existing_client.id is not null then
    update public.clients
    set
      name = trim(p_client_name),
      email = nullif(trim(coalesce(p_email, '')), ''),
      car_make = nullif(trim(coalesce(p_car_make, '')), ''),
      car_model = nullif(trim(coalesce(p_car_model, '')), ''),
      car_year = p_car_year,
      car_plate = nullif(trim(coalesce(p_car_plate, '')), ''),
      notes = coalesce(nullif(trim(coalesce(p_comment, '')), ''), v_existing_client.notes),
      updated_at = timezone('utc', now())
    where id = v_existing_client.id
    returning * into v_client;

    v_reused := true;
  else
    insert into public.clients (
      name,
      phone,
      email,
      car_make,
      car_model,
      car_year,
      car_plate,
      notes
    )
    values (
      trim(p_client_name),
      trim(p_phone),
      nullif(trim(coalesce(p_email, '')), ''),
      nullif(trim(coalesce(p_car_make, '')), ''),
      nullif(trim(coalesce(p_car_model, '')), ''),
      p_car_year,
      nullif(trim(coalesce(p_car_plate, '')), ''),
      nullif(trim(coalesce(p_comment, '')), '')
    )
    returning * into v_client;
  end if;

  insert into public.leads (
    client_id,
    service_id,
    status,
    source,
    address,
    comment,
    preferred_date,
    preferred_time,
    estimated_price,
    follow_up_at
  )
  values (
    v_client.id,
    p_service_id,
    'new',
    coalesce(p_source, 'landing'),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_comment, '')), ''),
    p_preferred_date,
    nullif(trim(coalesce(p_preferred_time, '')), ''),
    p_estimated_price,
    p_follow_up_at
  )
  returning * into v_lead;

  insert into public.lead_events (lead_id, type, note, payload)
  values (
    v_lead.id,
    'created',
    format('Lead created from %s', coalesce(p_source, 'landing')),
    jsonb_build_object(
      'source', coalesce(p_source, 'landing'),
      'service_id', p_service_id,
      'follow_up_at', p_follow_up_at,
      'public_entry', true
    )
  );

  if nullif(trim(coalesce(p_comment, '')), '') is not null then
    insert into public.lead_events (lead_id, type, note, payload)
    values (
      v_lead.id,
      'note_added',
      trim(p_comment),
      jsonb_build_object('origin', 'public_form')
    );
  end if;

  return jsonb_build_object(
    'lead_id', v_lead.id,
    'client_id', v_client.id,
    'reused_client', v_reused,
    'source', v_lead.source,
    'follow_up_at', v_lead.follow_up_at
  );
end;
$$;

grant execute on function public.submit_public_lead(
  text, text, text, uuid, text, text, integer, text, text, text, text, date, text, numeric, timestamptz
) to anon, authenticated;

-- Creates a profile row automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
