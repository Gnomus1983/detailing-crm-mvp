# LEGACY N8N CLEANUP - 2026-06-03

## What Was Cleaned

- `Settings` copy no longer presents `n8n` as the main path
- `.env.example` now presents `VITE_N8N_WEBHOOK_URL` as optional legacy compatibility only
- `scripts/demo-flow.mjs` now favors `VITE_AUTOMATION_WEBHOOK_URL` in wording
- old `N8N_TELEGRAM_ALERT_PLAN.md` is now explicitly marked as archived historical context
- status files were updated so `n8n` cleanup is treated as completed, not as an active architecture branch

## What Was Intentionally Kept

- backward compatibility for:
  - `VITE_N8N_WEBHOOK_URL`
- webhook helpers that may still be useful for external integrations

## Why This Is The Right State

The product no longer depends on `n8n` as a core layer.

The active architecture remains:
- Supabase
- Edge Functions
- Cron

Legacy webhook compatibility stays in place only to avoid breaking older scripts or earlier demo setups.
