# EDGE FUNCTIONS BACKLOG

## Goal

Replace external automation dependency with Supabase-native backend workflows.

## Priority 1. New Lead Alert Function

Status:
- scaffold added

### Purpose
Send Telegram alert when a new lead is created.

### Inputs
- public request lead
- internal CRM lead

### Responsibilities
- normalize lead payload
- resolve service/client details
- build Telegram message
- send alert
- log delivery result

## Priority 2. Follow-Up Reminder Function

Status:
- scaffold added

### Purpose
Send reminder when `follow_up_at` becomes due.

### Trigger style
- Cron schedule

### Responsibilities
- find leads where `follow_up_at <= now`
- skip completed/lost leads
- avoid duplicate reminders
- send alert to manager/owner
- write reminder event if needed

## Priority 3. Daily Digest Function

Status:
- scaffold added

### Purpose
Send daily CRM summary.

### Trigger style
- Cron schedule

### Digest content
- new leads
- overdue follow-ups
- active leads
- done leads

## Priority 4. Reactivation Function

### Purpose
Find cold leads and prepare reactivation prompts.

## Priority 5. Post-Service Follow-Up Function

### Purpose
After service completion:
- ask for review
- request repeat booking
- trigger retention flow

## Recommended Build Order

1. new lead alert
2. follow-up reminder
3. daily digest
4. reactivation
5. post-service follow-up
