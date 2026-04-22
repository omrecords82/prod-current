/**
 * Command Center — Shared Types & Helpers
 */

// ─── Types ─────────────────────────────────────────────────────────

export type Classification = 'action_required' | 'monitor' | 'safe_to_ignore';
export type Severity = 'critical' | 'warning' | 'info';

export interface BlockedFrontier {
  workflow_id: number;
  workflow_name: string;
  component: string;
  step_number: number;
  step_title: string;
  prompt_id: number;
  gate_id: string | null;
  explanation: string;
  severity: Severity;
  recommended_action: string | null;
  quality_score: number | null;
}

export interface WorkflowItem {
  id: number;
  name: string;
  component: string;
  status: string;
  step_count: number;
  verified: number;
  executing: number;
  blocked: number;
  progress_pct: number;
  has_exceptions: boolean;
  autonomy_paused: boolean;
  autonomy_pause_reason: string | null;
  manual_only: boolean;
  classification: Classification;
  current_step: any;
  steps: any[];
}

export interface ExceptionItem {
  id: number;
  title: string;
  component: string;
  queue_status: string;
  escalation_required: boolean;
  degradation_flag: boolean;
  overdue: boolean;
  classification: Classification;
  exception_types: string[];
  blocked_reasons: string[];
}

export interface ReadyItem {
  id: number;
  title: string;
  component: string;
  queue_status: string;
  release_mode: string;
  can_auto_release: boolean;
  needs_review: boolean;
  is_overdue: boolean;
  classification: Classification;
}

export interface AutonomyStatus {
  current_mode: string;
  enabled: boolean;
  allowed_actions: string[];
  workflow_counts: {
    total_active: number;
    advancing_autonomously: number;
    paused: number;
    manual_only: number;
  };
  paused_workflows: any[];
  recent_advances: any[];
  recent_pauses: any[];
}

export interface ActivityEvent {
  timestamp: string;
  level: string;
  source: string;
  message: string;
  importance: string;
}

export interface DashboardData {
  generated_at: string;
  summary: any;
  active_workflows: WorkflowItem[];
  exceptions: ExceptionItem[];
  ready_to_release: ReadyItem[];
  blocked_frontiers: BlockedFrontier[];
  autonomy: AutonomyStatus;
  activity: ActivityEvent[];
}

// ─── Color / label helpers ─────────────────────────────────────────

import {
  IconAlertCircle,
  IconEye,
  IconShieldCheck,
} from '@tabler/icons-react';

export const CLASSIFICATION_CONFIG: Record<Classification, { label: string; color: 'error' | 'warning' | 'success' | 'default'; icon: any }> = {
  action_required: { label: 'ACTION REQUIRED', color: 'error', icon: IconAlertCircle },
  monitor: { label: 'MONITOR', color: 'warning', icon: IconEye },
  safe_to_ignore: { label: 'SAFE TO IGNORE', color: 'success', icon: IconShieldCheck },
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#DC2626',
  warning: '#D97706',
  info: '#6B7280',
};

export function formatTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString();
}
