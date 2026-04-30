# OM AI-Agent PR Workflow — Current State Audit

> **Date:** 2026-04-30
> **Prompt ID:** OM-DEV-WORKFLOW-PR-RESTORE-V1
> **Work Item:** OMD-1342
> **Change Set:** OM-PR-GUARDRAILS-V1
> **Branch:** `chore/1342-restore-om-ai-agent-pr-workflow-guardrails`
> **Auditor:** Claude CLI (claude_cli)

This report captures the workflow state **before** edits so the PR diff is reviewable in context.

---

## 1. Working Tree Status (at audit start)

### `/var/www/om-workspaces/agent-claude` (this workspace, OM agent worktree)

- Branch on entry: `chore/omd-1324/2026-04-22/remove-om-librarian` (stale, already merged to main as squash commit `daaa1038`)
- Working tree: clean
- After `start-work` and manual relocation: now on `chore/1342-restore-om-ai-agent-pr-workflow-guardrails` (clean)

### `/var/www/orthodoxmetrics/prod` (main repo checkout, deploy-target adjacent)

- Branch on entry: `main`
- Pre-existing dirty files (unrelated to OMD-1342, owner unknown):
  - `server/src/routes/build.js`
  - `server/src/routes/social/chat.js`
- Restored to `main` with the pre-existing mods preserved after relocating the OMD-1342 branch into the agent worktree.

### Worktree layout (verified via `git worktree list`)

```
/var/www/orthodoxmetrics/prod          [main]                          ← primary checkout
/var/www/om-workspaces/agent-claude    [chore/1342-...]                ← Claude CLI worktree
/var/www/om-workspaces/agent-cursor    [workspace/cursor]              ← Cursor worktree
/var/www/om-workspaces/agent-windsurf  [fix/maintenance-file-cleanup]  ← Windsurf worktree
```

All four directories share `/var/www/orthodoxmetrics/prod/.git` — they are **linked git worktrees**, not independent clones.

---

## 2. Authoritative AI-Agent Workflow Doc

### Actual location

`/var/www/orthodoxmetrics/prod/ai-agent-workflow.md` (repo root, not under `docs/`).

- File exists, last updated 2026-04-01.
- 236 lines covering: workspace, auth, plans, item creation, branch creation, work, agent-complete, PR, deploy, status flow, key rules.

### Cross-repo upstream

`/var/www/shared/AGENT-WORKFLOW.md` (outside this repo) is the cross-repo source of truth referenced by `AGENTS.md`. The repo-local `ai-agent-workflow.md` should remain authoritative for OM-specific guardrails and defer to the shared doc for cross-repo process.

### Documents and their roles

| File | Role | Last Updated |
|------|------|--------------|
| `ai-agent-workflow.md` (repo root) | **Authoritative for OM** — full lifecycle | 2026-04-01 |
| `CLAUDE.md` (repo root) | AI assistant quick-reference (mirrors workflow into CLAUDE) | — |
| `AGENTS.md` (repo root) | Repo overview, defers to `/var/www/shared/AGENT-WORKFLOW.md` for process | 2026-04-07 |
| `/var/www/shared/AGENT-WORKFLOW.md` | Cross-repo process | 2026-04-07 |
| `docs/ai-agent-workflow.md` | **Does NOT exist** — referenced by CLAUDE.md as if it does | — |

---

## 3. Stale References to `docs/ai-agent-workflow.md`

`CLAUDE.md` contains three broken links to `docs/ai-agent-workflow.md` (which does not exist):

| Line | Context |
|------|---------|
| 154 | `**Full workflow documentation:** [docs/ai-agent-workflow.md](docs/ai-agent-workflow.md)` |
| 303 | `... See [docs/ai-agent-workflow.md](docs/ai-agent-workflow.md) for full details.` |
| 315 | `- [ai-agent-workflow.md](docs/ai-agent-workflow.md) — AI agent work tracking workflow` |

All three should point to `ai-agent-workflow.md` at repo root.

`CLAUDE.md` also contains workspace-path inconsistencies (separate from the doc-path issue):

| Line | Issue |
|------|-------|
| 180 | `cd /var/www/omai-workspaces/agent-claude` shown in OM Quick Reference (should be the OM workspace path) |
| 215 | Same OMAI path repeated in step `0. Enter workspace` of OM section |

The Workspace Rule section (lines 160-174) correctly distinguishes OM (`/var/www/om-workspaces/...`) from OMAI (`/var/www/omai-workspaces/...`); only the example/quick-ref blocks below it use the wrong path.

---

## 4. PR-Skip / Shortcut Language

**None found.** A targeted grep across all `*.md` for `skip pr`, `no pr`, `direct to main`, `bypass workflow`, `temporary shortcut`, `fast iteration`, `emergency`, `without (a|opening) pr` returned zero matches in workflow docs.

The current docs already require PRs. The user's prompt confirms the shortcut was a **practice deviation, not a documented allowance** — so the restoration adds an explicit "PRs are required, no exceptions without admin authorization" section rather than removing language.

---

## 5. Direct-to-Main Allowances

**None permitted in current docs.** Both `ai-agent-workflow.md` and `CLAUDE.md` route work through `start-work`, which always creates a feature/fix/chore branch from `main` — main is never the working branch.

**However**, there is a tooling gap worth flagging:

> The `start-work` API (POST `:7060/api/omai-daily/items/:id/start-work`) checks out the new branch in `/var/www/orthodoxmetrics/prod` (the primary repo dir), **not in the agent's worktree** at `/var/www/om-workspaces/agent-{claude,cursor,windsurf}`.

This was confirmed during this audit: response payload returned `repo_dir: /var/www/orthodoxmetrics/prod` and the new branch was checked out there. The agent then has to manually relocate the branch into the agent worktree to honor the workspace rule. This is a workflow-tool defect, **not** a documented allowance for direct prod work — and is out of scope for this PR (file as a follow-up).

---

## 6. Self-Merge Allowances

**None.** Both docs explicitly say "Never self-merge":

- `ai-agent-workflow.md:161` — "Never self-merge — admin review is required"
- `CLAUDE.md:210` — "Admin reviews and merges — agents never self-merge"
- `CLAUDE.md:220` — "Never self-merge."
- `CLAUDE.md:287` — "ALWAYS create a PR — Never self-merge."

The restoration formalizes this into a numbered rule and adds it to the Stop Conditions list.

---

## 7. Existing Branch Naming Standard

Authoritative format (preserved unchanged):

```
<type>/<work-item-id>/<yyyy-mm-dd>/<slug>
```

| task_type | Branch prefix |
|-----------|---------------|
| `feature` / `enhancement` / `spike` | `feature` |
| `bugfix` | `fix` |
| `refactor` / `migration` / `chore` / `docs` | `chore` |

Three prefixes only: `feature`, `fix`, `chore`. Documented in `CLAUDE.md` lines 234-249 and `ai-agent-workflow.md` lines 80-86.

**Note:** the branch produced by `start-work` for OMD-1342 is `chore/1342-restore-om-ai-agent-pr-workflow-guardrails`, missing the `omd-` prefix and date segment that the doc prescribes. The naming standard in the doc says `<type>/omd-<id>/<date>/<slug>`. This is another `start-work` tooling drift to flag as a follow-up; preserving the naming-standard text as documented.

---

## 8. Existing Status Ownership Rules

Preserved unchanged. Canonical 9-status model:

```
draft → backlog → in_progress → self_review → review → staging → done
                                      ↑ agent stops here (calls agent-complete)
blocked / cancelled (any active status, any actor)
```

| Status | Owner |
|--------|-------|
| `draft`, `backlog`, `review`, `staging`, `done` | Admin |
| `in_progress`, `self_review` | Agent |
| `blocked`, `cancelled` | Anyone |

Agents pass `actor_type: "agent"` in PATCH `/status` calls. Backend enforces the transition matrix.

---

## 9. Existing Deploy Rules

Preserved unchanged:

- Single deploy script: `/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh [be|fe]`
- Run as `next` (never `sudo` — leaves root-owned files)
- Never manually build / copy / restart services
- Deploys are admin-triggered; agents do not deploy as part of their workflow

The restoration adds an explicit rule that agents must not run deploys unless the human admin asks for it in the prompt.

---

## 10. Recommended Edits (minimum-necessary)

| Edit | File | Rationale |
|------|------|-----------|
| Fix three broken `docs/ai-agent-workflow.md` links | `CLAUDE.md` lines 154, 303, 315 | Point to actual file at repo root |
| Fix workspace-path examples to use OM path | `CLAUDE.md` lines 180, 215 | OM Quick Reference shows OMAI path |
| Add "PR Discipline Restored" section | `ai-agent-workflow.md` | Explicit prohibition on PR skipping |
| Add "Agent Stop Conditions" section | `ai-agent-workflow.md` | Define when an agent must stop |
| Add "Emergency Exception" section | `ai-agent-workflow.md` | Document admin-only override |
| Update header "Last Updated" date | `ai-agent-workflow.md` | Reflect this restoration |

**Out of scope (deliberately not changed):**

- `start-work` API targeting `/var/www/orthodoxmetrics/prod` instead of the agent worktree (tooling change, not docs)
- `start-work` branch naming missing `omd-` prefix and date segment (tooling drift)
- `docs/sdlc.md` link in CLAUDE.md (separate broken link, unrelated)
- `AGENTS.md` references to nonexistent `docs/architecture.md`, `docs/api-reference.md`, etc. (separate cleanup)
- `/var/www/shared/AGENT-WORKFLOW.md` — outside this repo
- Deployment scripts — not workflow docs
- Application runtime code — not workflow docs

---

## Validation Plan (post-edit)

1. `git status --short` — only the 3 expected files (`_report/...md`, `CLAUDE.md`, `ai-agent-workflow.md`) modified
2. `grep -rn "docs/ai-agent-workflow"` — zero hits in modified scope
3. `grep -niE "skip pr|no pr|direct to main|self-merge"` — only "Never self-merge" / "self-merge" in prohibition contexts
4. `head -20 ai-agent-workflow.md` — date updated, "PR Discipline Restored" section present
5. CLAUDE.md links resolve — `[ai-agent-workflow.md](ai-agent-workflow.md)` points to existing file

---

## End of report
