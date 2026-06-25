alter table public.leads
add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'partial', 'paid'));

alter table public.leads
add column if not exists payment_method text
  check (payment_method in ('cash', 'card', 'transfer', 'other'));

alter table public.leads
add column if not exists paid_amount numeric(10, 2);

alter table public.leads
add column if not exists paid_at timestamptz;;
