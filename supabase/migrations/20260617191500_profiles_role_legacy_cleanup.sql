alter table public.profiles
  alter column role drop not null,
  alter column role drop default;
