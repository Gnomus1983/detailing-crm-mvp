insert into public.services (name, base_price, duration_minutes)
select *
from (
  values
    ('Exterior wash', 25::numeric, 60),
    ('Interior detailing', 60::numeric, 120),
    ('Full detailing', 120::numeric, 240),
    ('Ceramic coating consultation', 0::numeric, 30)
) as seed(name, base_price, duration_minutes)
where not exists (
  select 1
  from public.services s
  where s.name = seed.name
);

insert into public.clients (name, phone, car_make, car_model, car_year, car_plate, notes)
select *
from (
  values
    ('Andrei Popa', '+37369000001', 'BMW', 'X5', 2019, 'KAA123', 'Asked for weekend slot'),
    ('Mihai Rusu', '+37369000002', 'Mercedes', 'E220', 2017, 'KBB456', 'Interested in interior detailing')
) as seed(name, phone, car_make, car_model, car_year, car_plate, notes)
where not exists (
  select 1
  from public.clients c
  where c.phone = seed.phone
);

insert into public.leads (
  client_id,
  service_id,
  status,
  source,
  address,
  comment,
  preferred_date,
  preferred_time,
  estimated_price
)
select
  c.id,
  s.id,
  seed.status,
  seed.source,
  seed.address,
  seed.comment,
  current_date + 1,
  seed.preferred_time,
  seed.estimated_price
from (
  values
    ('+37369000001', 'Exterior wash', 'new', 'instagram', 'Botanica, Chisinau', 'Needs quick exterior wash before trip', '10:00', 25::numeric),
    ('+37369000002', 'Interior detailing', 'contacted', 'landing', 'Riscani, Chisinau', 'Wants quote for interior detailing', 'After 18:00', 60::numeric)
) as seed(phone, service_name, status, source, address, comment, preferred_time, estimated_price)
join public.clients c on c.phone = seed.phone
join public.services s on s.name = seed.service_name
where not exists (
  select 1
  from public.leads l
  where l.client_id = c.id
    and l.service_id = s.id
    and l.comment = seed.comment
);
