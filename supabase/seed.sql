insert into public.services (name, base_price, duration_minutes)
select *
from (
  values
    ('Spalare exterioara', 25::numeric, 60),
    ('Detailing interior', 60::numeric, 120),
    ('Detailing complet', 120::numeric, 240),
    ('Consultatie pentru coating ceramic', 0::numeric, 30)
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
    ('Andrei Popa', '+37369000001', 'BMW', 'X5', 2019, 'KAA123', 'A cerut un interval disponibil pentru weekend'),
    ('Mihai Rusu', '+37369000002', 'Mercedes', 'E220', 2017, 'KBB456', 'Interesat de detailing interior'),
    ('Victor Sandu', '+37369000003', 'Audi', 'Q7', 2020, 'KCC777', 'Solicitare calda din Instagram, deschis la un pachet premium')
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
    ('+37369000001', 'Spalare exterioara', 'new', 'instagram', 'Botanica, Chisinau', 'Are nevoie de o spalare exterioara rapida inainte de plecare', '10:00', 25::numeric, null::timestamptz),
    ('+37369000002', 'Detailing interior', 'contacted', 'landing', 'Riscani, Chisinau', 'A cerut o oferta pentru detailing interior', 'Dupa 18:00', 60::numeric, timezone('utc', now()) + interval '1 day'),
    ('+37369000003', 'Detailing complet', 'quoted', 'instagram', 'Ciocana, Chisinau', 'A cerut un pachet premium inainte de drumul din weekend', '09:30', 120::numeric, timezone('utc', now()) + interval '18 hours')
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
    ('A cerut un pachet premium inainte de drumul din weekend', 'created', 'Solicitare creata din sursa Instagram', '{"source":"instagram"}'),
    ('A cerut un pachet premium inainte de drumul din weekend', 'status_changed', 'Status schimbat din nou in ofertat', '{"from":"new","to":"quoted"}'),
    ('A cerut un pachet premium inainte de drumul din weekend', 'note_added', 'Oferta a fost trimisa pentru pachetul complet de reconditionare exterioara.', '{}'),
    ('A cerut un pachet premium inainte de drumul din weekend', 'follow_up_set', 'Follow-up programat pentru maine dupa-amiaza.', '{}')
) as seed(comment, type, note, payload)
join public.leads l on l.comment = seed.comment
where not exists (
  select 1
  from public.lead_events e
  where e.lead_id = l.id
    and e.type = seed.type
    and e.note = seed.note
);
