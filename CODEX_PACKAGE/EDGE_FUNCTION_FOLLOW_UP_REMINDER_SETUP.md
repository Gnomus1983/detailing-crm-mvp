# EDGE FUNCTION FOLLOW-UP REMINDER SETUP

## What Exists

Second Edge Function scaffold was added:

- `supabase/functions/follow-up-reminder/index.ts`

It is intended for due follow-up reminders.

## Purpose

This function:
- checks for leads with due `follow_up_at`
- filters to active pipeline statuses
- sends Telegram reminder to manager
- avoids duplicate reminders on the same day
- logs `reminder_sent` event into `lead_events`

## Required Secrets

Uses the same secrets as `lead-alert`:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_MANAGER_CHAT_ID`
- `ALERT_INTERNAL_TOKEN`

## Invocation Style

This function is intended to be called:
- manually first for testing
- later by Cron / scheduled job

Use header:

- `x-internal-token: <ALERT_INTERNAL_TOKEN>`

## Duplicate Protection

The function checks existing `lead_events` and skips leads that already have:

- `type = reminder_sent`
- payload:
  - `trigger = follow_up_due`
  - `day = YYYY-MM-DD`

This prevents repeated reminders for the same lead on the same day.

## Recommended Test Flow

1. make sure one lead has `follow_up_at <= now`
2. deploy the function
3. invoke it once manually
4. confirm Telegram message arrives
5. confirm `lead_events` contains a `reminder_sent` event
6. invoke it again on the same day
7. confirm the same lead is skipped

## Later Cron Plan

Run this function on a schedule such as:
- every 15 minutes
- or every 30 minutes

Exact cadence can be chosen later.

## Suggested Next Automation After This

After lead alert and follow-up reminder:
1. build daily digest
2. build reactivation flow
3. build post-service follow-up
