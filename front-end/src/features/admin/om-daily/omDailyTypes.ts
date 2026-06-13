/**
 * Shared types, constants, and utilities for the OM Daily module.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface ChangeSetMembership {
  change_set_id: number;
  code: string;
  title: string;
  status: string;
}

export interface DailyItem {
  id: number;
  title: string;
  description: string | null;
  horizon: string;
  status: string;
  priority: string;
  category: string | null;
  due_date: string | null;
  assigned_to: number | null;
  tags: any;
  progress: number;
  created_by: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  source?: string;
  metadata?: any;
  github_issue_number?: number | null;
  github_synced_at?: string | null;
  agent_tool?: string | null;
  branch_type?: string | null;
  github_branch?: string | null;
  conversation_ref?: string | null;
  change_set?: ChangeSetMembership | null;
}

export interface GitHubSyncStatus {
  unsyncedCount: number;
  lastSync: string | null;
  repoUrl: string;
  issuesUrl: string;
}

export interface BuildInfo {
  version: string;
  buildNumber: number;
  buildDate: string | null;
  branch: string;
  commit: string;
  fullVersion: string;
}

export interface DashboardData {
  horizons: Record<string, { total: number; statuses: Record<string, number> }>;
  overdue: number;
  dueToday: number;
  recentlyCompleted: number;
  totalActive: number;
}

export interface ExtendedDashboard {
  statusDistribution: { status: string; count: number }[];
  priorityDistribution: { priority: string; count: number }[];
  categoryBreakdown: { category: string; count: number; done_count: number }[];
  recentCompleted: { id: number; title: string; category: string | null; horizon: string; completed_at: string; priority: string }[];
  inProgressItems: { id: number; title: string; description: string | null; category: string | null; horizon: string; priority: string; due_date: string | null; agent_tool: string | null; branch_type: string | null; updated_at: string }[];
  dueSoon: { id: number; title: string; status: string; priority: string; due_date: string; horizon: string; category: string | null }[];
  velocity: { date: string; count: number }[];
  created: { date: string; count: number }[];
  phaseGroups: { source: string; category: string | null; total: number; done_count: number; active_count: number; items_summary: string }[];
}

export interface ChangelogCommit {
  hash: string;
  fullHash: string;
  author: string;
  message: string;
  timestamp: string;
  files: { status: string; path: string }[];
  matchedItem?: { id: number; title: string; status: string } | null;
}

export interface ChangelogEntry {
  id: number;
  date: string;
  commits: ChangelogCommit[] | string;
  files_changed: { added: number; modified: number; deleted: number; list: any[] } | string;
  summary: string;
  status_breakdown: Record<string, number> | string;
  matched_items: any[] | string;
  email_sent_at: string | null;
  created_at: string;
}

export interface ItemFormData {
  title: string;
  description: string;
  horizon: string;
  status: string;
  priority: string;
  category: string;
  due_date: string;
  agent_tool: string;
  branch_type: string;
  repo_target: string;
}

// ─── Constants ──────────────────────────────────────────────────────

export const HORIZONS = ['1', '2', '7', '14', '30', '60', '90'];
export const HORIZON_LABELS: Record<string, string> = { '1': '24 Hour', '2': '48 Hour', '7': '7 Day', '14': '14 Day', '30': '30 Day', '60': '60 Day', '90': '90 Day' };
export const AGENT_TOOLS = ['windsurf', 'claude_cli', 'cursor', 'github_copilot'] as const;
export const AGENT_TOOL_LABELS: Record<string, string> = { windsurf: 'Windsurf', claude_cli: 'Claude CLI', cursor: 'Cursor', github_copilot: 'GitHub Copilot' };
export const AGENT_TOOL_COLORS: Record<string, string> = { windsurf: '#00b4d8', claude_cli: '#d4a574', cursor: '#7c3aed', github_copilot: '#1f883d' };
export const BRANCH_TYPES = ['feature', 'enhancement', 'bugfix', 'refactor', 'migration', 'chore', 'spike', 'docs'] as const;
export const BRANCH_TYPE_LABELS: Record<string, string> = { feature: 'Feature', enhancement: 'Enhancement', bugfix: 'Bug Fix', refactor: 'Refactor', migration: 'Migration', chore: 'Chore', spike: 'Spike', docs: 'Docs' };
export const BRANCH_TYPE_COLORS: Record<string, string> = { feature: '#0e8a16', enhancement: '#1d76db', bugfix: '#d73a4a', refactor: '#6f42c1', migration: '#e36209', chore: '#fbca04', spike: '#0075ca', docs: '#5319e7' };
export const TASK_TYPES = ['feature', 'enhancement', 'bugfix', 'refactor', 'migration', 'chore', 'spike', 'docs'] as const;
export const TASK_TYPE_LABELS: Record<string, string> = { feature: 'Feature', enhancement: 'Enhancement', bugfix: 'Bug Fix', refactor: 'Refactor', migration: 'Migration', chore: 'Chore', spike: 'Spike', docs: 'Docs' };
export const CATEGORIES = ['om-frontend', 'om-backend', 'om-database', 'om-ocr', 'om-records', 'om-admin', 'om-portal', 'om-auth', 'om-devops', 'omai-frontend', 'omai-backend', 'omai-sdlc', 'omai-ai', 'docs'] as const;
export const CATEGORY_LABELS: Record<string, string> = { 'om-frontend': 'OM Frontend', 'om-backend': 'OM Backend', 'om-database': 'OM Database', 'om-ocr': 'OM OCR', 'om-records': 'OM Records', 'om-admin': 'OM Admin', 'om-portal': 'OM Portal', 'om-auth': 'OM Auth', 'om-devops': 'OM DevOps', 'omai-frontend': 'OMAI Frontend', 'omai-backend': 'OMAI Backend', 'omai-sdlc': 'OMAI SDLC', 'omai-ai': 'OMAI AI', 'docs': 'Docs' };
// Canonical SDLC statuses (6 main + 2 side)
export const STATUSES = [
  'backlog', 'in_progress', 'self_review',
  'review', 'staging', 'done',
  'blocked', 'cancelled',
];
export const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog', in_progress: 'In Progress', self_review: 'Self Review',
  review: 'Review', staging: 'Staging', done: 'Done',
  blocked: 'Blocked', cancelled: 'Cancelled',
};
export const STATUS_COLORS: Record<string, string> = {
  backlog: '#9e9e9e', in_progress: '#ffa726', self_review: '#ab47bc',
  review: '#26c6da', staging: '#66bb6a', done: '#4caf50',
  blocked: '#ef5350', cancelled: '#bdbdbd',
};

// Status ownership — mirrors backend STATUS_OWNERSHIP
export interface StatusOwnership {
  owner: 'admin' | 'agent' | null;
  exit_action: string;
  exit_by: 'admin' | 'agent' | 'any';
}
export const STATUS_OWNERSHIP: Record<string, StatusOwnership> = {
  backlog:      { owner: 'admin', exit_action: 'Assign to agent, create branch (POST /start-work)', exit_by: 'admin' },
  in_progress:  { owner: 'agent', exit_action: 'Complete implementation, signal completion (POST /agent-complete)', exit_by: 'agent' },
  self_review:  { owner: 'agent', exit_action: 'Self-check: build, lint, push to remote, open PR', exit_by: 'agent' },
  review:       { owner: 'admin', exit_action: 'Review PR, test in staging — approve or request changes', exit_by: 'admin' },
  staging:      { owner: 'admin', exit_action: 'Merge PR into main, deploy to production', exit_by: 'admin' },
  done:         { owner: null,    exit_action: 'Reopen if needed', exit_by: 'admin' },
  blocked:      { owner: 'admin', exit_action: 'Resolve blocker', exit_by: 'any' },
  cancelled:    { owner: null,    exit_action: 'Reopen if needed', exit_by: 'admin' },
};
export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const PRIORITY_COLORS: Record<string, string> = { low: '#9e9e9e', medium: '#2196f3', high: '#ff9800', critical: '#f44336' };

// ─── Utilities ──────────────────────────────────────────────────────

export function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function parseJson(val: any) {
  if (!val) return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return val; } }
  return val;
}

export const DEFAULT_FORM: ItemFormData = {
  title: '', description: '', horizon: '7', status: 'backlog', priority: 'medium',
  category: '', due_date: '', agent_tool: '', branch_type: '', repo_target: 'orthodoxmetrics',
};
