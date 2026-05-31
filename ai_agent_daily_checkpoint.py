#!/usr/bin/env python3
"""
AI Agent End-of-Day Checkpoint Reporter

Purpose:
  Run this at the end of an AI-agent work session to produce a concise Markdown
  checkpoint covering:
    - work accomplished
    - current environment state
    - pending drift items
    - next session suggestions

Designed for Orthodox Metrics / OMStudio / OM Workshop style agent hosts.

Usage:
  python3 ai_agent_daily_checkpoint.py \
    --agent-name "windsurf" \
    --host-role "omdev authoring" \
    --output-dir ./checkpoints \
    --repo /var/www/om-workshop \
    --repo /var/www/omstudio \
    --service omstudio-server.service \
    --service nginx.service

Optional:
  --notes-file ./session-notes.md
  --memory-file ./durable-memory.md
  --suggest-next "Resolve task-wheel drift"
  --drift-path /var/www/om-workshop/sites/orthodox-metrics-public/src/features/task-wheel

Server submission (optional):
  --submit                        POST the JSON report to the reporting server
  --submit-url http://192.168.1.239:3001/api/agent-reports/daily
  --submit-token <bearer-token>   Token from AGENT_SUBMIT_TOKEN env var on server

The submit token can also be provided via the AGENT_SUBMIT_TOKEN environment
variable so it does not appear in shell history.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import platform
import socket
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, Optional


@dataclass
class CommandResult:
    command: str
    cwd: Optional[str]
    rc: int
    stdout: str
    stderr: str


@dataclass
class RepoState:
    path: str
    exists: bool
    branch: Optional[str] = None
    head: Optional[str] = None
    head_subject: Optional[str] = None
    upstream: Optional[str] = None
    ahead_behind: Optional[str] = None
    dirty: Optional[bool] = None
    untracked: Optional[list[str]] = None
    changed: Optional[list[str]] = None
    error: Optional[str] = None


@dataclass
class ServiceState:
    name: str
    active: Optional[str]
    enabled: Optional[str]
    failed: Optional[bool]
    error: Optional[str] = None


def run(cmd: list[str], cwd: Optional[Path] = None, timeout: int = 20) -> CommandResult:
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            text=True,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
        return CommandResult(
            command=" ".join(cmd),
            cwd=str(cwd) if cwd else None,
            rc=proc.returncode,
            stdout=proc.stdout.strip(),
            stderr=proc.stderr.strip(),
        )
    except Exception as exc:
        return CommandResult(
            command=" ".join(cmd),
            cwd=str(cwd) if cwd else None,
            rc=999,
            stdout="",
            stderr=f"{type(exc).__name__}: {exc}",
        )


def read_text_file(path: Optional[str]) -> str:
    if not path:
        return ""
    p = Path(path).expanduser()
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8", errors="replace").strip()


def git_value(repo: Path, args: list[str]) -> Optional[str]:
    res = run(["git", *args], cwd=repo)
    if res.rc != 0:
        return None
    return res.stdout.strip() or None


def inspect_repo(path: str) -> RepoState:
    repo = Path(path).expanduser().resolve()
    state = RepoState(path=str(repo), exists=repo.exists())

    if not repo.exists():
        state.error = "path does not exist"
        return state

    if not (repo / ".git").exists():
        # Worktrees may have .git as a file.
        if not (repo / ".git").is_file():
            state.error = "not a git repository"
            return state

    state.branch = git_value(repo, ["rev-parse", "--abbrev-ref", "HEAD"])
    state.head = git_value(repo, ["rev-parse", "--short", "HEAD"])
    state.head_subject = git_value(repo, ["log", "-1", "--pretty=%s"])
    state.upstream = git_value(repo, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])

    if state.upstream:
        ahead_behind = git_value(repo, ["rev-list", "--left-right", "--count", f"HEAD...{state.upstream}"])
        if ahead_behind:
            parts = ahead_behind.split()
            if len(parts) == 2:
                state.ahead_behind = f"ahead {parts[0]} / behind {parts[1]}"

    porcelain = git_value(repo, ["status", "--porcelain=v1"])
    lines = porcelain.splitlines() if porcelain else []
    state.dirty = bool(lines)
    state.untracked = [line[3:] for line in lines if line.startswith("?? ")]
    state.changed = [line for line in lines if not line.startswith("?? ")]

    return state


def inspect_service(name: str) -> ServiceState:
    active = run(["systemctl", "is-active", name])
    enabled = run(["systemctl", "is-enabled", name])
    failed = run(["systemctl", "is-failed", name])

    error = None
    if active.rc not in (0, 3):
        error = active.stderr or active.stdout or "unable to read active state"

    return ServiceState(
        name=name,
        active=active.stdout or "unknown",
        enabled=enabled.stdout or "unknown",
        failed=(failed.stdout == "failed"),
        error=error,
    )


def get_failed_units() -> list[str]:
    res = run(["systemctl", "--failed", "--no-legend", "--plain"])
    if res.rc != 0:
        return []
    units = []
    for line in res.stdout.splitlines():
        parts = line.split()
        if parts:
            units.append(parts[0])
    return units


def get_recent_commits(repo: Path, count: int = 8) -> list[str]:
    res = run(["git", "log", f"-{count}", "--oneline", "--decorate"], cwd=repo)
    if res.rc != 0 or not res.stdout:
        return []
    return res.stdout.splitlines()


def path_status(path: str) -> str:
    p = Path(path).expanduser()
    if not p.exists():
        return "missing"
    if p.is_dir():
        try:
            count = sum(1 for _ in p.iterdir())
        except Exception:
            count = "unknown"
        return f"present directory ({count} direct entries)"
    return f"present file ({p.stat().st_size} bytes)"


def md_escape(value: object) -> str:
    text = "" if value is None else str(value)
    return text.replace("|", "\\|").replace("\n", " ")


def render_repo_table(repos: list[RepoState]) -> str:
    if not repos:
        return "_No repositories configured._"

    rows = [
        "| Repo | Branch | HEAD | Upstream | Ahead/Behind | Working Tree |",
        "|---|---:|---:|---:|---:|---|",
    ]
    for r in repos:
        if not r.exists or r.error:
            rows.append(f"| `{md_escape(r.path)}` | - | - | - | - | {md_escape(r.error or 'missing')} |")
            continue
        dirty = "dirty" if r.dirty else "clean"
        if r.untracked:
            dirty += f"; {len(r.untracked)} untracked"
        if r.changed:
            dirty += f"; {len(r.changed)} changed"
        rows.append(
            f"| `{md_escape(r.path)}` | `{md_escape(r.branch)}` | `{md_escape(r.head)}` | "
            f"`{md_escape(r.upstream or '-')}` | {md_escape(r.ahead_behind or '-')} | {md_escape(dirty)} |"
        )
    return "\n".join(rows)


def render_service_table(services: list[ServiceState], failed_units: list[str]) -> str:
    rows = [
        "| Service | Active | Enabled | Failed |",
        "|---|---:|---:|---:|",
    ]
    for s in services:
        rows.append(f"| `{md_escape(s.name)}` | {md_escape(s.active)} | {md_escape(s.enabled)} | {('yes' if s.failed else 'no')} |")

    if not services:
        rows.append("| _No services configured._ | - | - | - |")

    if failed_units:
        rows.append(f"| **systemctl --failed** | - | - | **{len(failed_units)} failed unit(s)** |")

    return "\n".join(rows)


def infer_accomplished_from_git(repos: list[RepoState], max_commits_per_repo: int = 8) -> list[str]:
    accomplished: list[str] = []
    for r in repos:
        if not r.exists or r.error:
            continue
        repo = Path(r.path)
        commits = get_recent_commits(repo, max_commits_per_repo)
        if commits:
            accomplished.append(f"`{repo.name}` recent commits:")
            for commit in commits:
                accomplished.append(f"  - {commit}")
    return accomplished


def infer_drift_items(repos: list[RepoState], failed_units: list[str], drift_paths: list[str]) -> list[str]:
    items: list[str] = []

    for r in repos:
        if not r.exists or r.error:
            items.append(f"`{r.path}`: {r.error or 'missing'}")
            continue

        if r.untracked:
            preview = ", ".join(r.untracked[:5])
            more = "" if len(r.untracked) <= 5 else f", +{len(r.untracked) - 5} more"
            items.append(f"`{r.path}` has untracked files/dirs: {preview}{more}")

        if r.changed:
            preview = ", ".join(r.changed[:5])
            more = "" if len(r.changed) <= 5 else f", +{len(r.changed) - 5} more"
            items.append(f"`{r.path}` has modified/staged changes: {preview}{more}")

        if r.ahead_behind and "behind 0" not in r.ahead_behind:
            items.append(f"`{r.path}` is {r.ahead_behind} versus `{r.upstream}`")

    for unit in failed_units:
        items.append(f"systemd failed unit: `{unit}`")

    for p in drift_paths:
        status = path_status(p)
        if not status.startswith("missing"):
            items.append(f"watched drift path `{p}` is {status}")

    return items


def render_report(args: argparse.Namespace) -> tuple[str, dict]:
    now = dt.datetime.now().astimezone()
    hostname = socket.gethostname()
    fqdn = socket.getfqdn()
    agent_name = args.agent_name or os.environ.get("USER") or "unknown-agent"

    repos = [inspect_repo(p) for p in args.repo]
    services = [inspect_service(s) for s in args.service]
    failed_units = get_failed_units()

    notes = read_text_file(args.notes_file)
    memory = read_text_file(args.memory_file)
    manual_done = args.done or []
    suggested_next = args.suggest_next or []

    accomplished = []
    accomplished.extend(manual_done)
    if not args.no_git_accomplishments:
        accomplished.extend(infer_accomplished_from_git(repos))

    drift_items = infer_drift_items(repos, failed_units, args.drift_path)

    if not suggested_next:
        if drift_items:
            suggested_next.append("Resolve or explicitly defer the pending drift items listed above.")
        suggested_next.append("Review the latest branch/work-item state before starting new implementation.")
        suggested_next.append("Start with the smallest verifiable next slice; avoid mixing cleanup and feature work.")

    report_lines = [
        f"# Session checkpoint — {now.strftime('%Y-%m-%d')}",
        "",
        "## Metadata",
        "",
        f"- Agent: `{agent_name}`",
        f"- Host: `{hostname}`",
        f"- FQDN: `{fqdn}`",
        f"- Host role: `{args.host_role or 'unspecified'}`",
        f"- Generated: `{now.isoformat(timespec='seconds')}`",
        f"- OS: `{platform.platform()}`",
        "",
        "## Work accomplished",
        "",
    ]

    if accomplished:
        for item in accomplished:
            report_lines.append(f"- [x] {item}")
    else:
        report_lines.append("- [ ] No explicit accomplishments were provided. Add `--done` entries or a `--notes-file`.")

    if notes:
        report_lines.extend(["", "### Session notes", "", notes])

    if memory:
        report_lines.extend(["", "### Durable memory / carry-forward notes", "", memory])

    report_lines.extend([
        "",
        "## Current state",
        "",
        "### Repositories",
        "",
        render_repo_table(repos),
        "",
        "### Services",
        "",
        render_service_table(services, failed_units),
        "",
        "## Pending drift items",
        "",
    ])

    if drift_items:
        for item in drift_items:
            report_lines.append(f"- [ ] {item}")
    else:
        report_lines.append("- [x] No drift detected by this script.")

    report_lines.extend([
        "",
        "## Next session suggestions",
        "",
    ])

    for idx, item in enumerate(suggested_next, start=1):
        report_lines.append(f"{idx}. {item}")

    report_lines.extend([
        "",
        "## Raw machine summary",
        "",
        "```json",
    ])

    machine = {
        "generated_at": now.isoformat(),
        "agent": agent_name,
        "host": hostname,
        "fqdn": fqdn,
        "host_role": args.host_role,
        "repos": [asdict(r) for r in repos],
        "services": [asdict(s) for s in services],
        "failed_units": failed_units,
        "drift_items": drift_items,
        "next_session_suggestions": suggested_next,
    }

    report_lines.append(json.dumps(machine, indent=2, sort_keys=True))
    report_lines.append("```")
    report_lines.append("")

    return "\n".join(report_lines), machine


def submit_report(machine: dict, markdown: str, url: str, token: str) -> bool:
    """
    POST the checkpoint JSON to the server reporting endpoint.
    Returns True on success, False on failure. Never raises.
    Failure does NOT affect local file writing.
    """
    payload = dict(machine)
    payload["_rendered_markdown"] = markdown

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "ai-agent-checkpoint/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            try:
                result = json.loads(body)
                print(f"[submit] ✅ Report stored — id={result.get('id')} date={result.get('report_date')}")
            except Exception:
                print(f"[submit] ✅ Server responded {resp.status}")
            return True
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
        print(f"[submit] ❌ HTTP {exc.code}: {body}", file=sys.stderr)
        return False
    except Exception as exc:
        print(f"[submit] ❌ Submission failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return False


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate an AI-agent end-of-day checkpoint report.")
    parser.add_argument("--agent-name", default=None, help="Name of the AI agent or operator.")
    parser.add_argument("--host-role", default=None, help="Short host role, e.g. '.254 authoring-only'.")
    parser.add_argument("--repo", action="append", default=[], help="Git repository path to inspect. Repeatable.")
    parser.add_argument("--service", action="append", default=[], help="systemd service to inspect. Repeatable.")
    parser.add_argument("--drift-path", action="append", default=[], help="Specific path that should be reported if present. Repeatable.")
    parser.add_argument("--done", action="append", default=[], help="Manual accomplishment entry. Repeatable.")
    parser.add_argument("--suggest-next", action="append", default=[], help="Manual next-session suggestion. Repeatable.")
    parser.add_argument("--notes-file", default=None, help="Optional Markdown/text notes file to include.")
    parser.add_argument("--memory-file", default=None, help="Optional Markdown/text durable memory file to include.")
    parser.add_argument("--output-dir", default="./checkpoints", help="Directory for generated reports.")
    parser.add_argument("--stdout", action="store_true", help="Print report to stdout.")
    parser.add_argument("--no-git-accomplishments", action="store_true", help="Do not infer accomplishments from recent git commits.")
    # --- Server submission flags ---
    parser.add_argument("--submit", action="store_true", help="POST the checkpoint JSON to the reporting server.")
    parser.add_argument("--submit-url", default="http://192.168.1.239:3001/api/agent-reports/daily",
                        help="Endpoint URL for report submission (default: OM server on .239).")
    parser.add_argument("--submit-token", default=None,
                        help="Bearer token for submit auth. Falls back to AGENT_SUBMIT_TOKEN env var.")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    report, machine = render_report(args)

    today = dt.datetime.now().astimezone().strftime("%Y-%m-%d")
    agent_slug = (args.agent_name or os.environ.get("USER") or "agent").replace(" ", "-").lower()
    host_slug = socket.gethostname().replace(" ", "-").lower()

    md_path = output_dir / f"{today}_{host_slug}_{agent_slug}_checkpoint.md"
    json_path = output_dir / f"{today}_{host_slug}_{agent_slug}_checkpoint.json"

    md_path.write_text(report, encoding="utf-8")
    json_path.write_text(json.dumps(machine, indent=2, sort_keys=True), encoding="utf-8")

    if args.stdout:
        print(report)
    else:
        print(f"Wrote Markdown: {md_path}")
        print(f"Wrote JSON:     {json_path}")

    # --- Optional server submission ---
    if args.submit:
        token = args.submit_token or os.environ.get("AGENT_SUBMIT_TOKEN", "")
        if not token:
            print(
                "[submit] ❌ No submit token provided. "
                "Use --submit-token or set AGENT_SUBMIT_TOKEN env var.",
                file=sys.stderr,
            )
            return 1
        print(f"[submit] Submitting report to {args.submit_url} ...")
        ok = submit_report(machine, report, args.submit_url, token)
        if not ok:
            print("[submit] Local files are intact. Fix the error above and retry.", file=sys.stderr)
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

