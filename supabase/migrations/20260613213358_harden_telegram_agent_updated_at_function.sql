-- Harden helper function created for telegram_agent_states trigger
create or replace function public.set_updated_at()
returns trigger
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;;
