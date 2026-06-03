# AI Agent Development Workflow

> **Last Updated:** 2026-04-30
> **Applies to:** All AI agents (Claude CLI, Cursor, Windsurf)
> **Status:** Authoritative for OrthodoxMetrics (`prod-current`). For cross-repo process, see `/var/www/shared/AGENT-WORKFLOW.md`.

---

## PR Discipline Restored (2026-04-30)

PR-based development is **mandatory** for all AI-agent code changes in OrthodoxMetrics. PRs were temporarily skipped during a previous fast-iteration window; that window is closed.

Every AI-agent change must follow the full lifecycle below:

1. authenticate
2. check assigned plans
3. create or use an OMAI Daily item
4. start work through the workflow system (`POST /start-work`)
5. use the generated branch
6. code
7. test
8. commit
9. push
10. signal complete (`POST /agent-complete`)
11. open a PR
12. **stop**

Agents may not skip PRs, push directly to `main`, or self-merge. Admin review is required for every change. The only deviation is an Emergency Exception explicitly authorized by the human admin in the prompt — see the "Emergency Exception" section below.

---

## 0. Enter Your Workspace

Before doing anything, navigate to your assigned OM worktree:

```bash
# Claude CLI
cd /var/www/workspaces/om/agent-claude

# Cursor
cd /var/www/workspaces/om/agent-cursor

# Windsurf
cd /var/www/workspaces/om/agent-windsurf
```

**Direct edits to `/var/www/orthodoxmetrics/prod` are forbidden** unless that path is confirmed to be the intended workspace and not the deploy/integration target. The OM worktrees above (`/var/www/workspaces/om/agent-*`) are linked git worktrees of `prod-current` — work there.

For OMAI (`/var/www/omai/`) work, see `/var/www/shared/AGENT-WORKFLOW.md` and the `omai` repo. Never work from `/var/www/omai/` directly — it is deploy-only and blocked by pre-commit hooks.

---

## 1. Authenticate (omsvc service account)

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nickeypain@gmail.com","password":"OmSvc2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
```

Token is valid for 15 minutes. Re-login if needed.

---

## 2. Check for Assigned Plans

```bash
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3001/api/prompt-plans/agent/claude_cli
```

If a plan exists, follow `next_step.prompt_text` instead of creating your own item.

---

## 3. Create OMAI Daily Work Item

```bash
curl -s -X POST http://127.0.0.1:7060/api/omai-daily/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Short description","task_type":"bugfix","status":"backlog",
       "source":"agent","agent_tool":"claude_cli","priority":"medium",
       "category":"om-frontend","description":"What and why"}'
```

- Do this proactively at the start of every task, without being asked
- Valid `task_type`: feature, enhancement, bugfix, refactor, migration, chore, spike, docs
- Valid `category`: om-frontend, om-backend, om-database, om-ocr, om-records, om-admin, om-portal, om-auth, om-devops, omai-frontend, omai-backend, omai-sdlc, omai-ai, docs
- Status must be `backlog` (not todo)

---

## 4. Start Work (creates branch, sets in_progress)

**Ensure you are in your workspace directory before calling this.**

```bash
curl -s -X POST http://127.0.0.1:7060/api/omai-daily/items/:id/start-work \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"branch_type":"bugfix","agent_tool":"claude_cli"}'
```

This creates and checks out a branch in the format `<type>/omd-<id>/<date>/<slug>`.

| branch_type                         | Branch prefix |
|-------------------------------------|---------------|
| feature / enhancement / spike       | `feature`     |
| bugfix                              | `fix`         |
| refactor / migration / chore / docs | `chore`       |

After this step, confirm you're on the right branch:

```bash
git branch --show-current
# Should show something like: fix/omd-42/2026-04-01/login-crash
```

---

## 5. Do the Work

- Make code changes, commit to the branch **from your workspace**
- For large tasks, update progress (0-100) via PATCH
- Apply changes to both `src/` and `dist/` for JS files (immediate effect)
- TS changes: edit `src/`, then rebuild

**Push your branch to the remote regularly:**

```bash
git push -u origin HEAD
```

---

## 6. Signal Agent Complete (moves to self_review)

```bash
curl -s -X POST http://127.0.0.1:7060/api/omai-daily/items/:id/agent-complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"agent_tool":"claude_cli","summary":"Brief description of what was done"}'
```

Always call this when finished. Idempotent — safe to call multiple times.

---

## 7. Create Pull Request

After agent-complete, open a PR against `main` on GitHub:

```bash
# Ensure all changes are pushed
git push origin HEAD

# Create the PR using the GitHub CLI
gh pr create \
  --base main \
  --head "$(git branch --show-current)" \
  --title "OMD-<id>: Short description of change" \
  --body "## Summary
<Brief description of what was done and why>

## OMAI Daily Item
- **Item ID:** <id>
- **Task Type:** <bugfix|feature|etc>
- **Category:** <category>

## Changes
- <bullet list of key changes>

## Testing
- <how this was tested>

## Agent
- **Tool:** claude_cli
- **Workspace:** /var/www/workspaces/omai/agent-claude" \
  --label "agent-pr"
```

**PR Rules:**
- One PR per work item — matches the one-branch-per-item rule
- PR title must include the OMD item ID
- Never self-merge — admin review is required
- If `main` has diverged, rebase your branch before creating the PR:
  ```bash
  git fetch origin main
  git rebase origin/main
  git push --force-with-lease
  ```

---

## 8. Deploy (if applicable)

```bash
/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh       # full
/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh be    # backend only
/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh fe    # frontend only
```

Never manually build/copy/restart. Always use the deploy script.

---

## 9. (Admin step) Review & Merge

These are admin-owned steps — agents cannot self-approve:

1. **Review** → Admin reviews the PR on GitHub (auto-set by PR opened webhook)
2. **Staging** → Admin approves the PR (auto-set by PR approved webhook)
3. **Done** → Admin merges the PR (auto-set by PR merged webhook)

The merge uses `--ff-only` via the deploy script. If the PR can't fast-forward, the agent will be asked to rebase.

---

## SDLC Status Flow (Canonical 9-Status Model)

```
draft → backlog → in_progress → self_review → review → staging → done
                                      ↑ agent stops here (calls agent-complete)
blocked (from any active status)
cancelled (from any status)
```

> `draft` is the structured intake holding pen. Items are shaped here before backlog promotion.
> Agents create items at `backlog` (skipping draft). The full intake flow is for UI-created items.

---

## Workspace Rules

OrthodoxMetrics (`prod-current`) worktrees:

| Directory | Purpose | Who writes |
|---|---|---|
| `/var/www/orthodoxmetrics/prod/` | Primary checkout, deploy/integration target | Admin / deploy script |
| `/var/www/workspaces/om/agent-claude/` | Claude CLI worktree | Claude |
| `/var/www/workspaces/om/agent-cursor/` | Cursor worktree | Cursor |
| `/var/www/workspaces/om/agent-windsurf/` | Windsurf worktree | Windsurf |

OMAI (`omai`) worktrees:

| Directory | Purpose | Who writes |
|---|---|---|
| `/var/www/omai/` | Production deploy target | Deploy script only |
| `/var/www/workspaces/omai/agent-claude/` | Claude CLI worktree | Claude |
| `/var/www/workspaces/omai/agent-cursor/` | Cursor worktree | Cursor |
| `/var/www/workspaces/omai/agent-windsurf/` | Windsurf worktree | Windsurf |

- Agents **must not** make changes directly in `/var/www/orthodoxmetrics/prod/` or `/var/www/omai/` (deploy targets)
- Agents **must not** check out `main` in their worktree
- Agents **must not** commit to another agent's branch
- These rules are enforced by git hooks (see `omai-workspace-guard.sh`)

---

## Agent Stop Conditions

An agent must stop and report — without forcing through — in any of these cases:

- **After PR creation.** Once `gh pr create` succeeds, the agent's job is done. Do not deploy, do not merge, do not start follow-up work without a new prompt.
- **Auth fails.** If `/api/auth/login` returns no token or a non-2xx response, stop and report. Do not retry indefinitely.
- **OMAI Daily item cannot be created or located.** If `POST /api/omai-daily/items` fails or the assigned item ID cannot be confirmed, stop. Working without a tracked item is not allowed.
- **Branch creation fails.** If `POST /start-work` returns an error or the resulting branch is not present locally, stop. Do not manually create a branch as a substitute.
- **Working tree is dirty with unrelated changes.** If the workspace has modifications that don't belong to this task and aren't stashed/committed, stop. Do not bundle unrelated changes into this PR.
- **Push fails.** If `git push` rejects, fails authentication, or hits a hook block, stop and report — do not force-push around it.
- **PR creation fails.** If `gh pr create` fails (auth, label not found, missing remote, etc.), stop and report. Do not improvise an alternate review channel.

In every case: leave the workspace in a recoverable state, write a short status summary to the OMAI Daily item, and surface the error to the user.

---

## Emergency Exception

PR-skipping or direct-to-main work is forbidden by default. The **only** valid override is:

1. **Human admin** explicitly authorizes the exception **in the prompt that the agent is acting on**. (Memory, prior conversations, or implicit trust do not count.)
2. The agent **records the exception in the OMAI Daily item description** with the exact authorization text.
3. The agent **records the exception in the final report** at `_report/<change-set>-<date>.md`.
4. The work still ends with a commit. Even an emergency direct-to-main change must produce a commit and a written deployment/change report. No silent edits.

Agents must **never** invoke this exception on their own initiative. If unsure whether a request qualifies, default to the standard PR workflow and ask.

---

## Key Rules

- Agents own: `in_progress`, `self_review`
- Admins own: `backlog`, `review`, `staging`, `done`
- `blocked` and `cancelled` — any actor
- Agents pass `actor_type: "agent"` in status calls
- One branch per item, one PR per branch
- **Never self-merge** — admin review is required for every PR
- **Never deploy** unless the human admin explicitly requests it in the prompt; deploy via `/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh` (run as `next`, not `sudo`)
- `complete-work` uses `git merge --ff-only` — rebase if main has diverged
- Clean working tree required before complete-work
- If abandoned, set status `"cancelled"` with reason
- Backend enforces transition matrix — invalid transitions are rejected
