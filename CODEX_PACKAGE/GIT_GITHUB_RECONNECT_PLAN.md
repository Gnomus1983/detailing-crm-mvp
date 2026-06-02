# Git / GitHub Reconnect Plan

## Current Situation

- GitHub repository exists:
  - `Gnomus1983/detailing-crm-mvp`
- Local project folder exists:
  - `C:\Users\Iura\Documents\CRM detaling\detailing-crm-mvp-main`
- The local folder is **not** currently a git repository.
- The local folder contains the newest working project state.
- `.gitignore` already excludes:
  - `node_modules/`
  - `dist/`
  - `.env`

## Main Goal

Reconnect the current local project state to GitHub **without losing local work** and without accidentally overwriting important files.

## Safest Strategy

Use the current local folder as the new working source of truth, then carefully attach it to the existing GitHub repository.

## Recommended Step Order

### Step 1. Keep the current folder untouched as the working source

Do not delete or replace the current folder.

### Step 2. Make one extra safety copy before git work

Create a manual backup copy of:

- `C:\Users\Iura\Documents\CRM detaling\detailing-crm-mvp-main`

This is the safest pre-git checkpoint.

### Step 3. Initialize git locally

Inside the current project folder:

1. `git init`
2. `git branch -M main`

### Step 4. Add the GitHub remote

Connect to:

- `https://github.com/Gnomus1983/detailing-crm-mvp.git`

### Step 5. Inspect remote history before push/pull

Check:

1. remote URL
2. existing remote branches
3. whether the remote still contains only the original initial commit

### Step 6. Decide the safest merge path

If the remote still only has the initial version, the safest path is:

1. fetch remote
2. compare local current files vs remote
3. connect history carefully
4. commit the current local state clearly

If needed, use a merge/reconcile path instead of a destructive force-replace.

### Step 7. Make a clear local baseline commit

Create a commit that represents:

- restored current working project
- CRM MVP progress
- package docs
- Supabase-native automation direction

### Step 8. Push only after verification

Push only after:

1. `git status` is clean enough to understand
2. expected files are staged
3. `.env` is not tracked
4. `node_modules` is not tracked
5. package docs are included

## Important Rules

1. Do not use destructive git commands.
2. Do not overwrite local work with a blind pull.
3. Do not force-push unless absolutely necessary and only after verification.
4. Treat the current local folder as the most important copy.

## What We Should Do Next

1. Create a backup copy.
2. Initialize git locally.
3. Attach the GitHub remote.
4. Inspect remote state safely.
5. Reconcile local and remote history carefully.
6. Commit and push the current project state.

## After Git Is Stable

Then continue normal product work:

1. schema apply
2. public flow verification
3. edge function deploy/invoke verification
4. cleanup of legacy `n8n` leftovers
