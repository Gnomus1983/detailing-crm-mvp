# N8N TELEGRAM ALERT PLAN

## Archived Note

This document is kept only as historical context.

The active architecture is now:
- Supabase
- Edge Functions
- Cron

`n8n` is no longer the primary automation path for this project.

## Purpose

This document defined the first practical automation idea after public lead intake:

`new lead -> n8n webhook -> Telegram alert`

## Trigger

The CRM still supports `lead_created` webhook events for compatibility, but the main production path is now Supabase-native automation.

This can come from:
- internal CRM new lead form
- public request form

## Current Event Name

- `lead_created`

## Current Webhook Source

Frontend sends automation webhook through:
- `sendAutomationWebhook(...)`

## Recommended First n8n Flow

1. Webhook node receives request
2. IF node checks:
   - `event == "lead_created"`
3. Set / Function node prepares Telegram message
4. Telegram node sends alert to manager / owner chat

## Suggested Telegram Message

```text
New detailing lead

Client: {{client name}}
Phone: {{phone}}
Service: {{service}}
Source: {{source}}
Preferred slot: {{preferred date/time}}
Comment: {{comment}}
```

## Payload Notes

Internal lead create currently sends:
- `event`
- `lead`
- `client`
- `sent_at`

Public request create currently sends:
- `event`
- `public_entry`
- `lead`
- `intake`
- `sent_at`

Because of this, the n8n flow should normalize both shapes before building the Telegram message.

## Recommended Normalization Logic

Preferred extraction order:

- client name:
  - `client.name`
  - else `intake.client_name`

- phone:
  - `client.phone`
  - else `intake.phone`

- source:
  - `lead.source`
  - else `intake.source`

- service:
  - `lead.services.name` if present
  - else `intake.service_id`

## Minimal Workflow Goal

For the first version, keep it simple:
- do not over-design formatting
- do not build branching logic yet
- just make sure every new lead sends a clear manager alert

## After This

After Telegram alert works, next workflows should be:
1. `follow_up_updated -> reminder`
2. `daily digest`
3. later `reactivation`

## Recommended Verification

1. Apply updated `schema.sql`
2. Run public form or `npm run public:flow`
3. Check that lead is created in Supabase
4. Check that `lead_created` hits n8n
5. Check that Telegram alert arrives
