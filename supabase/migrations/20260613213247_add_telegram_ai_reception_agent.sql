-- Telegram AI reception agent support tables
-- Safe additive migration: does not modify existing CRM tables except reading/writing through app code.

create table if not exists public.telegram_agent_states (
  telegram_chat_id text primary key,
  collected_data jsonb not null default '{}'::jsonb,
  last_user_message text,
  last_agent_reply text,
  urgency text not null default 'normal' check (urgency in ('normal', 'urgent', 'emergency')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.telegram_agent_messages (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id text not null,
  direction text not null check (direction in ('in', 'out', 'system')),
  text text not null,
  payload jsonb not null default '{}'::jsonb,
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_telegram_agent_messages_chat_id_created_at
  on public.telegram_agent_messages (telegram_chat_id, created_at desc);

create index if not exists idx_telegram_agent_messages_lead_id
  on public.telegram_agent_messages (lead_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_telegram_agent_states_updated_at on public.telegram_agent_states;
create trigger trg_telegram_agent_states_updated_at
before update on public.telegram_agent_states
for each row execute function public.set_updated_at();

alter table public.telegram_agent_states enable row level security;
alter table public.telegram_agent_messages enable row level security;

-- Policies for authenticated CRM users to inspect agent conversations.
-- Service role can bypass RLS for the server-side Telegram webhook.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'telegram_agent_states'
      and policyname = 'Authenticated users can read telegram agent states'
  ) then
    create policy "Authenticated users can read telegram agent states"
    on public.telegram_agent_states
    for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'telegram_agent_messages'
      and policyname = 'Authenticated users can read telegram agent messages'
  ) then
    create policy "Authenticated users can read telegram agent messages"
    on public.telegram_agent_messages
    for select
    to authenticated
    using (true);
  end if;
end $$;;
