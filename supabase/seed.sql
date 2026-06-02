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
    ('Mihai Rusu', '+37369000002', 'Mercedes', 'E220', 2017, 'KBB456', 'Interested in interior detailing'),
    ('Victor Sandu', '+37369000003', 'Audi', 'Q7', 2020, 'KCC777', 'Warm Instagram lead, open to premium package')
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
  estimated_price,
  follow_up_at
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
  seed.estimated_price,
  seed.follow_up_at
from (
  values
    ('+37369000001', 'Exterior wash', 'new', 'instagram', 'Botanica, Chisinau', 'Needs quick exterior wash before trip', '10:00', 25::numeric, null::timestamptz),
    ('+37369000002', 'Interior detailing', 'contacted', 'landing', 'Riscani, Chisinau', 'Wants quote for interior detailing', 'After 18:00', 60::numeric, timezone('utc', now()) + interval '1 day'),
    ('+37369000003', 'Full detailing', 'quoted', 'instagram', 'Ciocana, Chisinau', 'Requested premium wash before weekend road trip', '09:30', 120::numeric, timezone('utc', now()) + interval '18 hours')
) as seed(phone, service_name, status, source, address, comment, preferred_time, estimated_price, follow_up_at)
join public.clients c on c.phone = seed.phone
join public.services s on s.name = seed.service_name
where not exists (
  select 1
  from public.leads l
  where l.client_id = c.id
    and l.service_id = s.id
    and l.comment = seed.comment
);

insert into public.lead_events (lead_id, type, note, payload)
select
  l.id,
  seed.type,
  seed.note,
  seed.payload::jsonb
from (
  values
    ('Requested premium wash before weekend road trip', 'created', 'Lead created from instagram', '{"source":"instagram"}'),
    ('Requested premium wash before weekend road trip', 'status_changed', 'Status changed from new to quoted', '{"from":"new","to":"quoted"}'),
    ('Requested premium wash before weekend road trip', 'note_added', 'Quote sent for full exterior refresh package.', '{}'),
    ('Requested premium wash before weekend road trip', 'follow_up_set', 'Follow-up scheduled for tomorrow afternoon.', '{}')
) as seed(comment, type, note, payload)
join public.leads l on l.comment = seed.comment
where not exists (
  select 1
  from public.lead_events e
  where e.lead_id = l.id
    and e.type = seed.type
    and e.note = seed.note
);
