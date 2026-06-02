# RISK TABLE AND GUARDRAILS

## Purpose

This file explains the main risks of building the CRM product and how to reduce them early.

The goal is not to avoid building.

The goal is to build in a way that remains stable, maintainable, and sellable.

## Core Principle

Do not build this as:
- one giant AI experiment
- one giant automation spaghetti system
- one giant universal CRM

Build it as:
- simple CRM core
- clear backend automations
- AI assistant later as a separate layer

## Main Risks

| Risk | What can go wrong | Why it happens | Guardrail |
|---|---|---|---|
| Product becomes too broad | Too many features, unclear offer, messy UX | Trying to build a CRM for everyone | Keep it narrow: detailing first, local service businesses later |
| Automation logic becomes chaotic | Hard to maintain reminders/alerts | Logic spread across too many places | Keep automations inside Supabase-native backend where possible |
| AI becomes the foundation too early | Unpredictable behavior, weak reliability | Trying to automate sales conversation too early | First build automation, then AI assistant, then optional autopilot |
| System depends too much on chat context | Hard to continue later | Logic exists only in conversation, not files | Keep plans, setup docs, and architecture docs inside `CODEX_PACKAGE` |
| Data model becomes unstable | Bugs and broken flows | Uncontrolled schema changes | Use schema files and explicit SQL changes |
| Permissions become unsafe | Wrong users see or change wrong data | No role separation | Keep role-aware visibility and data rules simple and explicit |
| Reminders duplicate or fail silently | Bad user trust | No automation logging | Use `automation_runs` and lead-specific event logging |
| External platform dependency becomes too expensive | Margins collapse | Heavy dependence on paid workflow tools | Prefer Supabase-native backend over `n8n-first` |
| Scaling later becomes painful | Hard to move to subscription SaaS | No separation between CRM core and business-specific logic | Keep core reusable, keep niche copy/config adaptable |
| AI assistant gives bad advice | Poor business results | No bounded use-case | Start AI with summaries, drafting, and recommendations only |

## Reliability Rules

### Rule 1
CRM data must remain the source of truth.

### Rule 2
Automations must be logged.

### Rule 3
AI should assist before it controls.

### Rule 4
Every new automation should be:
- understandable
- testable
- observable

### Rule 5
Do not make product logic depend on a temporary SaaS tool if that tool hurts margins later.

## Safe Growth Path

### Stage 1
Stable CRM core

### Stage 2
Stable backend automations

### Stage 3
AI assistant

### Stage 4
Selective AI autopilot

## Final Reminder

The system will not stay stable if it is built as pure improvisation.

It can stay stable if:
- architecture stays simple
- docs stay updated
- logs exist
- changes are layered
- AI is used as an accelerator, not as hidden magic
