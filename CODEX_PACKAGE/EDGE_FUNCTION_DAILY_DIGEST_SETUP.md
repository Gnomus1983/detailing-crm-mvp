# EDGE FUNCTION DAILY DIGEST SETUP

## What Exists

Third Edge Function scaffold was added:

- `supabase/functions/daily-digest/index.ts`

## Purpose

This function sends a Telegram summary with:
- new leads today
- overdue follow-ups
- active leads
- done today

## Required Secrets

Uses the same secrets as the other alert functions:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_MANAGER_CHAT_ID`
- `ALERT_INTERNAL_TOKEN`

## Current Logging Model

This scaffold now uses:

- `automation_runs`

Reason:
- daily digest is a system-level summary, not a lead-specific event
- `lead_events` is reserved for lead-specific history

## Invocation Style

This function should be:
- tested manually first
- then scheduled through Cron

Use header:

- `x-internal-token: <ALERT_INTERNAL_TOKEN>`

## Suggested Schedule Later

Run once daily, for example:
- every morning
- or every evening

Final time can be chosen later.

## Suggested Next Improvement

After this scaffold:
1. add duplicate-protection for digest sends
2. connect to Cron
