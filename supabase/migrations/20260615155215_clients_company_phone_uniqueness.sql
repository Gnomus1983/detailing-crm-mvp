drop index if exists public.clients_phone_unique_idx;

create unique index if not exists clients_company_phone_unique_idx
  on public.clients(company_id, phone);;
