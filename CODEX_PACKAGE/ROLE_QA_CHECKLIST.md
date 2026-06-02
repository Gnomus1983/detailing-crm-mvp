# ROLE QA CHECKLIST

## Goal

Confirm that role-aware visibility works correctly for:
- owner
- manager
- detailer

## Required Demo Accounts

- owner account
- manager account
- detailer account

These accounts must already exist in Supabase Auth.

## Setup

1. Open Supabase SQL editor
2. Run:
   - `supabase/demo_role_setup.sql`
3. Replace the placeholder emails inside that file before running it

## Expected Result After Setup

- owner profile gets role `owner`
- manager profile gets role `manager`
- detailer profile gets role `detailer`
- one demo lead is assigned to the detailer
- one `assigned` event appears in timeline for that lead

## Owner QA

- [ ] can open `Dashboard`
- [ ] can open `Leads`
- [ ] can open `Clients`
- [ ] can open `Services`
- [ ] can open `Settings`
- [ ] can create a new lead
- [ ] can change lead status
- [ ] can change `follow_up_at`
- [ ] can add internal notes

## Manager QA

- [ ] can open `Dashboard`
- [ ] can open `Leads`
- [ ] can open `Clients`
- [ ] can open `Services`
- [ ] does not see `Settings` in navigation
- [ ] can create a new lead
- [ ] can change lead status
- [ ] can change `follow_up_at`
- [ ] can add internal notes

## Detailer QA

- [ ] can open `Dashboard`
- [ ] can open `Leads`
- [ ] does not see `Clients`
- [ ] does not see `Services`
- [ ] does not see `Settings`
- [ ] does not see `New lead` form
- [ ] sees only assigned lead(s)
- [ ] cannot change status
- [ ] cannot change `follow_up_at`
- [ ] cannot add internal notes
- [ ] can view lead timeline/history

## Demo Notes

For the cleanest demo:
- assign one believable lead to the detailer
- use a lead with realistic service and timeline history
- show owner first, then manager, then detailer

## Recommended Next Step After QA

After roles are confirmed:
1. build `public client entry form`
2. then wire first automation flows in n8n
