-- Voice AI reception agent support for detailing-crm-mvp
-- Adds call logging and normalized extraction storage for Vapi/Retell/Twilio style voice agents.

create table if not exists public.voice_agent_calls (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'unknown' check (provider in ('vapi', 'retell', 'twilio', 'manual', 'unknown')),
  provider_call_id text,
  call_direction text not null default 'inbound' check (call_direction in ('inbound', 'outbound', 'unknown')),
  from_phone text,
  to_phone text,
  client_name text,
  client_phone text,
  car_make text,
  car_model text,
  car_year integer,
  problem text,
  preferred_date date,
  preferred_time text,
  urgency text not null default 'normal' check (urgency in ('normal', 'urgent', 'emergency')),
  transcript text,
  recording_url text,
  summary text,
  extracted_data jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  client_id uuid references public.clients(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'received' check (status in ('received', 'lead_created', 'ignored', 'error')),
  error_message text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_voice_agent_calls_provider_call_id
  on public.voice_agent_calls (provider, provider_call_id);

create index if not exists idx_voice_agent_calls_created_at
  on public.voice_agent_calls (created_at desc);

create index if not exists idx_voice_agent_calls_lead_id
  on public.voice_agent_calls (lead_id);

create or replace function public.set_updated_at()
returns trigger
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_voice_agent_calls_updated_at on public.voice_agent_calls;
create trigger trg_voice_agent_calls_updated_at
before update on public.voice_agent_calls
for each row execute function public.set_updated_at();

alter table public.voice_agent_calls enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'voice_agent_calls'
      and policyname = 'Authenticated users can read voice agent calls'
  ) then
    create policy "Authenticated users can read voice agent calls"
    on public.voice_agent_calls
    for select
    to authenticated
    using (true);
  end if;
end $$;;
