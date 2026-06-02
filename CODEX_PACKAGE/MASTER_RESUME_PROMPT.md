# MASTER RESUME PROMPT

Use this prompt when resuming work in Codex or with another agent on another computer.

---

Open the project `detailing-crm-mvp-main`.

First read these files in this order:

1. `CODEX_PACKAGE/PACKAGE_INDEX.md`
2. `CODEX_PACKAGE/ARCHITECTURE_SHIFT_PLAN.md`
3. `CODEX_PACKAGE/ACTION_PLAN_SUPABASE_NATIVE.md`
4. `PROJECT_STATUS_PLAN.md`
5. `NEXT_TASKS.md`
6. `CODEX_PACKAGE/RISK_TABLE_AND_GUARDRAILS.md`
7. `CODEX_PACKAGE/EDGE_FUNCTIONS_BACKLOG.md`

Project context:

- This is a focused CRM MVP for detailing and later local service businesses
- Stack direction is now:
  - React + Vite
  - Supabase
  - Edge Functions
  - Cron
- `n8n` is no longer the core architecture
- Keep the product narrow, sellable, and suitable for later subscription SaaS

What is already done:

- auth works
- Dashboard / Leads / Clients / Services / Settings work
- new lead form works
- timeline / notes work
- follow_up_at works
- role-aware visibility has been added
- public request form exists at `/request`
- initial Supabase-native automation scaffolds already exist:
  - `lead-alert`
  - `follow-up-reminder`
  - `daily-digest`
- `automation_runs` was added as a system automation log table

Main product direction:

- first build stable CRM core
- then build stable backend automations
- then add AI assistant
- only later consider AI autopilot

Important rules:

- do not turn this into a huge universal CRM
- do not move back to `n8n-first`
- do not use Supabase secret key on frontend
- preserve current architecture
- keep everything documented inside `CODEX_PACKAGE`
- when creating new project-status / roadmap / handoff files, save them in `CODEX_PACKAGE`

Current likely next steps:

1. apply latest `supabase/schema.sql`
2. verify public flow
3. prepare deploy/invoke flow for Edge Functions
4. continue product-native automation setup
5. later prepare AI assistant layer

When continuing:

- explain clearly where the project currently stands
- say what step you are doing next
- then continue implementation

---
