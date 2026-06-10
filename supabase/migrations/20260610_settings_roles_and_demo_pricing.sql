alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'manager', 'detailer'));

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Owners can manage all profiles" on public.profiles;
create policy "Owners can manage all profiles"
on public.profiles
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles owner_profile
    where owner_profile.id = auth.uid()
      and owner_profile.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.profiles owner_profile
    where owner_profile.id = auth.uid()
      and owner_profile.role = 'owner'
  )
);

insert into public.services (name, base_price, duration_minutes, is_active)
values
  ('Spalare exterioara', 600, 60, true),
  ('Curatare salon', 1200, 180, true),
  ('Spalare detaliata', 800, 90, true),
  ('Detailing interior', 1800, 180, true),
  ('Polizare completa', 2800, 300, true),
  ('Detailing complet', 4200, 360, true),
  ('Ceramica', 4500, 360, true),
  ('Polizare + Ceramica', 6000, 480, true),
  ('Consultatie coating ceramic', 300, 30, true)
on conflict do nothing;

update public.services
set
  base_price = source.base_price,
  duration_minutes = source.duration_minutes,
  is_active = true
from (
  values
    ('Spalare exterioara', 600::numeric, 60),
    ('Curatare salon', 1200::numeric, 180),
    ('Spalare detaliata', 800::numeric, 90),
    ('Detailing interior', 1800::numeric, 180),
    ('Polizare completa', 2800::numeric, 300),
    ('Detailing complet', 4200::numeric, 360),
    ('Ceramica', 4500::numeric, 360),
    ('Polizare + Ceramica', 6000::numeric, 480),
    ('Consultatie coating ceramic', 300::numeric, 30)
) as source(name, base_price, duration_minutes)
where public.services.name = source.name;
