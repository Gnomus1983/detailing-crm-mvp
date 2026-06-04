# MASTER RESUME PROMPT

Use this prompt when resuming work in Codex or with another agent on another computer.

---

Open the project `detailing-crm-mvp-main`.

First read these files in this order:

1. `CODEX_PACKAGE/PACKAGE_INDEX.md`
2. `CODEX_PACKAGE/MASTER_EXECUTION_ROADMAP_2026-06-03.md`
3. `CODEX_PACKAGE/ARCHITECTURE_SHIFT_PLAN.md`
4. `CODEX_PACKAGE/ACTION_PLAN_SUPABASE_NATIVE.md`
5. `PROJECT_STATUS_PLAN.md`
6. `NEXT_TASKS.md`
7. `CODEX_PACKAGE/RISK_TABLE_AND_GUARDRAILS.md`
8. `CODEX_PACKAGE/EDGE_FUNCTIONS_BACKLOG.md`

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
- public intake works live
- Supabase-native automations work live:
  - `lead-alert`
  - `follow-up-reminder`
  - `daily-digest`
- `automation_runs` was added as a system automation log table
- Romanian localization is the main user-facing language
- single-user role QA path was prepared and verified live
- demo/sales walkthrough already exists

Main product direction:

- first build stable CRM core
- then build stable backend automations
- then strengthen UX / visual system
- then strengthen public-facing site / request layer
- then create onboarding / usage instructions
- then make QA / testing discipline explicit
- then finalize the sales/demo layer
- only after that move toward AI assistant
- only later consider AI autopilot, SaaS expansion, and mobile

Important rules:

- do not turn this into a huge universal CRM
- do not move back to `n8n-first`
- do not use Supabase secret key on frontend
- preserve current architecture
- keep everything documented inside `CODEX_PACKAGE`
- when creating new project-status / roadmap / handoff files, save them in `CODEX_PACKAGE`

Current likely next steps:

1. strengthen UX / visual system
2. strengthen the public-facing product layer
3. create onboarding / usage documents
4. create QA / testing documents and discipline
5. keep safety / hardening active in parallel
6. strengthen the sales demo path
7. only later prepare AI assistant layer

When continuing:

- explain clearly where the project currently stands
- say what step you are doing next
- then continue implementation

---
