# MOBILE APP DIRECTION

## Purpose

This document defines the mobile app direction for the CRM product.

Important:
- mobile is not the first product layer
- mobile comes after stable web CRM + stable backend automations

## Main Rule

Do not build mobile first.

First stabilize:
- CRM core
- public intake
- Edge Functions
- reminders
- digest
- role model

Then mobile can become a clean extension of the product.

## Why Mobile Matters Later

For small service businesses, mobile is valuable because:
- owners check alerts on the go
- managers need quick lead access
- detailers may need assigned job visibility
- follow-up actions often happen from phone

## First Mobile Use Cases

### Owner
- dashboard snapshot
- overdue follow-ups
- daily digest view

### Manager
- new lead alerts
- lead list
- lead detail
- update status
- update follow-up
- add note

### Detailer
- assigned jobs only
- client contact details
- service/job notes
- status visibility

## What Mobile Should Not Be At First

- not a huge all-in-one app
- not a full desktop replacement
- not an AI autopilot app
- not a giant chat-driven control center

## Recommended Mobile MVP

Phase 1 mobile should focus on:
- auth
- lead list
- lead detail
- status update
- follow-up visibility
- note creation
- assigned jobs view for detailer

## Architecture Recommendation

Mobile should reuse the same backend:
- Supabase Auth
- Supabase DB
- Edge Functions
- same role model
- same automation model

This means:
- do not build separate product logic for mobile
- mobile should be a client of the same system

## Recommended Timing

Build mobile only after:

1. web CRM is stable
2. public request flow is stable
3. Edge Functions alert flow works
4. follow-up reminders work
5. daily digest works

## Product Strategy

Web first:
- faster to build
- easier to validate
- easier to sell initially

Mobile second:
- improves adoption
- improves operational convenience
- helps retention for paid customers

## Future Mobile Potential

Later mobile can include:
- push notifications
- quick action cards
- AI reply draft suggestions
- voice notes
- simple check-in / check-out workflow for service staff
