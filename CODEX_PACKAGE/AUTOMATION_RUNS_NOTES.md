# AUTOMATION RUNS NOTES

## New System Table

Added:

- `public.automation_runs`

Purpose:
- store system-level automation execution logs
- track started / success / skipped / error states
- avoid overloading `lead_events` with non-lead system behavior

## Why This Was Needed

`lead_events` is lead-specific and requires `lead_id`.

That works for:
- notes
- status changes
- follow-up actions

But it does not fit well for:
- batch reminders
- daily digests
- system-level automation runs

## Table Responsibilities

`automation_runs` should be used for:
- edge function execution logs
- batch automation logs
- system alerts
- skipped duplicate runs
- error capture for automation debugging

## Current Functions Using It

- `lead-alert`
- `follow-up-reminder`
- `daily-digest`

## Current Status Model

- `started`
- `success`
- `error`
- `skipped`

## Practical Benefit

This gives the project a more product-grade backend trail for:
- automation debugging
- future admin visibility
- future SaaS observability
