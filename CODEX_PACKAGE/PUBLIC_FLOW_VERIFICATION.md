# PUBLIC FLOW VERIFICATION

## Goal

Verify that the new public request flow works end-to-end:

1. public page opens
2. active services load
3. public request creates lead in Supabase
4. `lead_events` are created
5. `lead_created` webhook can be used for next automation step

## Step 1. Apply database changes

Open Supabase SQL editor and apply the latest:

- `supabase/schema.sql`

This is required because public request submission depends on:
- anon read access for active services
- `submit_public_lead(...)` RPC function

Without schema update:
- `/request` may load incorrectly
- public submit will fail

## Step 2. Start app locally

Run:

```bash
npm run dev
```

## Step 3. Open the public route

Open:

- `http://127.0.0.1:4173/request`

Expected result:
- page opens without login
- form is visible
- active services are available in dropdown

## Step 4. Manual browser test

Fill a realistic request:

- Full name
- Phone
- Service
- Car make / model
- Preferred date / time
- Comment

Submit the form.

Expected result:
- success message appears
- no auth is required

## Step 5. Verify Supabase records

Check that:

### In `clients`
- a new client was created
- or existing client was reused by phone

### In `leads`
- a new lead was created
- `source` is correct
- status is `new`

### In `lead_events`
- `created` event exists
- if comment was entered, `note_added` event exists

## Step 6. Script-based verification

Run:

```bash
npm run public:flow
```

Expected result:
- script returns JSON with `ok: true`
- output includes:
  - `lead_id`
  - `client_id`
  - `reused_client`

## Step 7. Ready state after success

Once both manual and script checks pass:

- public intake is confirmed working
- next product step becomes:
  - `new lead -> Telegram alert`

## Common failure reasons

### Services do not load
- schema changes not applied
- no active services in DB

### Submit fails
- `submit_public_lead(...)` function not created yet
- schema not applied
- invalid Supabase env values

### Script fails
- no active service found
- schema not applied
- publishable key / URL mismatch

## Next Step After This

After public flow is verified:

1. build `n8n -> Telegram alert`
2. then build `follow_up_at -> reminder`
3. then build `daily digest`
