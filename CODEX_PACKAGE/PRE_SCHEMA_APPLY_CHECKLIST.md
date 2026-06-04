# Pre-Schema Apply Checklist

## Goal

Safely prepare the live Supabase project before applying the latest `supabase/schema.sql`.

This step is important because the latest schema adds stronger assumptions, especially:

- unique phone constraint for `clients.phone`
- repeatable policy recreation
- public RPC flow for `submit_public_lead(...)`
- `automation_runs` system logging

## Step 1. Confirm Current Live Data Risk

Before applying schema, check whether the live database already contains duplicate phone values in `clients`.

Run:

```sql
select
  phone,
  count(*) as duplicate_count
from public.clients
where phone is not null
  and btrim(phone) <> ''
group by phone
having count(*) > 1
order by duplicate_count desc, phone asc;
```

## Step 2. If No Rows Are Returned

That means no duplicate phone values were found.

Then it is safe to continue to schema apply.

## Step 3. If Duplicate Rows Are Returned

Do **not** apply schema yet.

First inspect the duplicate records:

```sql
select
  id,
  name,
  phone,
  email,
  car_make,
  car_model,
  car_year,
  car_plate,
  created_at,
  updated_at
from public.clients
where phone in (
  select phone
  from public.clients
  where phone is not null
    and btrim(phone) <> ''
  group by phone
  having count(*) > 1
)
order by phone, created_at asc;
```

## Step 4. Duplicate Resolution Strategy

For each duplicate phone group:

1. choose one canonical client row to keep
2. move all related `leads.client_id` to that canonical client
3. only after reassignment, delete the duplicate client rows

## Step 5. Safe Reassignment Pattern

Example workflow:

### 5.1 Find affected leads

```sql
select id, client_id, status, created_at
from public.leads
where client_id in (
  'DUPLICATE_CLIENT_ID_1',
  'DUPLICATE_CLIENT_ID_2'
)
order by created_at asc;
```

### 5.2 Reassign leads to the chosen canonical client

```sql
update public.leads
set client_id = 'CANONICAL_CLIENT_ID'
where client_id in (
  'DUPLICATE_CLIENT_ID_1',
  'DUPLICATE_CLIENT_ID_2'
);
```

### 5.3 Delete duplicate client rows after reassignment

```sql
delete from public.clients
where id in (
  'DUPLICATE_CLIENT_ID_1',
  'DUPLICATE_CLIENT_ID_2'
);
```

## Step 6. Re-Run the Duplicate Check

After cleanup, run the duplicate query again:

```sql
select
  phone,
  count(*) as duplicate_count
from public.clients
where phone is not null
  and btrim(phone) <> ''
group by phone
having count(*) > 1
order by duplicate_count desc, phone asc;
```

Proceed only when this query returns no rows.

## Step 7. Apply Latest Schema

Then apply:

- `supabase/schema.sql`

## Step 8. Post-Apply Verification

After schema apply, verify:

1. `automation_runs` exists
2. `submit_public_lead(...)` exists
3. public service read works
4. unique index on `clients.phone` exists

Useful verification SQL:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'clients';
```

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'submit_public_lead';
```

```sql
select to_regclass('public.automation_runs');
```

## Step 9. Then Continue Product Verification

Only after schema apply is confirmed:

1. verify public request flow
2. verify `npm run public:flow`
3. deploy and test Edge Functions

## Important Rule

Do not rush schema apply if duplicate client phones exist.

The unique phone index is good for the product foundation, but only after the existing live data is clean enough to support it.
