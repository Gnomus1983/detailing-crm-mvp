# Post-Schema Verification

## Goal

Verify that the latest `supabase/schema.sql` was applied correctly before moving into public flow and Edge Function testing.

## Step 1. Verify `automation_runs` Table Exists

```sql
select to_regclass('public.automation_runs') as automation_runs_table;
```

Expected:

- `public.automation_runs`

## Step 2. Verify `submit_public_lead(...)` Exists

```sql
select
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'submit_public_lead';
```

Expected:

- one row for `submit_public_lead`

## Step 3. Verify `clients.phone` Unique Index Exists

```sql
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'clients'
order by indexname;
```

Expected:

- normal phone index
- unique phone index

Look specifically for:

- `clients_phone_idx`
- `clients_phone_unique_idx`

## Step 4. Verify Public Service Read Assumption

This is mainly validated by the actual public flow test, but schema-side confirm that active services still exist:

```sql
select id, name, is_active
from public.services
where is_active = true
order by name asc;
```

Expected:

- at least one active service row

## Step 5. Verify `profiles.role` Supports `detailer`

Quick data check:

```sql
select id, email, role
from public.profiles
order by created_at asc
limit 20;
```

Expected:

- current rows still readable
- `role` column intact

## Step 6. Verify Public RPC Works

After schema is applied, run:

- `npm run public:flow`

Expected:

- command succeeds
- new lead created
- reused/new client behavior works

## Step 7. Verify Created Public Data

After `public:flow`, inspect:

```sql
select
  id,
  client_id,
  source,
  status,
  follow_up_at,
  created_at
from public.leads
order by created_at desc
limit 5;
```

```sql
select
  id,
  lead_id,
  type,
  note,
  created_at
from public.lead_events
order by created_at desc
limit 10;
```

Expected:

- a fresh lead from public flow
- `source = 'landing'` or chosen source
- `created` event present
- optional `note_added` event present if comment was included

## Step 8. Verify App Still Builds

Run:

- `npm run build`

Expected:

- successful production build

## Step 9. Only Then Move Forward

After post-schema verification passes:

1. verify route `"/request"` manually
2. deploy Edge Functions
3. test `lead-alert`
4. test `follow-up-reminder`
5. test `daily-digest`

## If Something Fails

If any verification fails:

1. stop before deploying more layers
2. record the exact failing query/command
3. fix schema/data mismatch first
4. then re-run the checklist
