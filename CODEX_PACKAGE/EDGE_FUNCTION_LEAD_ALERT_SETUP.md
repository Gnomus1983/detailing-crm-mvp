# EDGE FUNCTION LEAD ALERT SETUP

## What Exists

First Edge Function scaffold was added:

- `supabase/functions/lead-alert/index.ts`

Shared helper:

- `supabase/functions/_shared/telegram.ts`

Config file:

- `supabase/config.toml`

## Purpose

This function is the first Supabase-native replacement for `n8n` alert logic.

It receives a new lead payload and sends a Telegram message to the manager.

## Required Secrets

Set these in Supabase Edge Function secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_MANAGER_CHAT_ID`
- `ALERT_INTERNAL_TOKEN`

## Recommended Secret Notes

### `TELEGRAM_BOT_TOKEN`
- Telegram bot token from BotFather

### `TELEGRAM_MANAGER_CHAT_ID`
- chat ID where alerts should be delivered

### `ALERT_INTERNAL_TOKEN`
- custom shared secret for calling the function safely

## Expected Input

This function is built for lead-created style payloads.

It supports both:
- internal CRM lead payloads
- public form lead payloads

## Next Steps To Use It

1. create Telegram bot
2. get manager chat ID
3. add the three secrets above in Supabase
4. deploy the function
5. invoke it with a valid `x-internal-token`
6. confirm Telegram delivery

## Suggested Deploy Flow

Example commands to run later on the main machine:

```bash
supabase functions deploy lead-alert
supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_MANAGER_CHAT_ID=... ALERT_INTERNAL_TOKEN=...
```

## Suggested Invocation Style

Use an authenticated backend/internal call with header:

- `x-internal-token: <ALERT_INTERNAL_TOKEN>`

## What Comes After This

After lead alert works:
1. build follow-up reminder function
2. build daily digest function
3. route CRM automations through Edge Functions + Cron
