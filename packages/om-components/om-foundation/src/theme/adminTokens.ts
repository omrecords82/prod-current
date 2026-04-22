/**
 * Admin UI Semantic Tokens
 *
 * Centralized color and spacing tokens for all admin-facing pages.
 * Every admin component should import from here — no inline hex codes.
 *
 * These tokens supplement the MUI theme palette with admin-specific
 * semantic meanings (classification, priority, status).
 */

// ─── Classification Colors ─────────────────────────────────────────
// Used by Command Center, dashboards, and workflow views

export const CLASSIFICATION = {
  action_required: {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
    accent: '#DC2626',
    chip: { bg: '#FEE2E2', text: '#DC2626' },
  },
  unblock_required: {
    bg: '#FFF7ED',
    text: '#9A3412',
    border: '#FED7AA',
    accent: '#EA580C',
    chip: { bg: '#FFEDD5', text: '#EA580C' },
  },
  monitor: {
    bg: '#FFFBEB',
    text: '#92400E',
    border: '#FDE68A',
    accent: '#D97706',
    chip: { bg: '#FEF3C7', text: '#D97706' },
  },
  safe_to_ignore: {
    bg: '#F0FDF4',
    text: '#166534',
    border: '#BBF7D0',
    accent: '#16A34A',
    chip: { bg: '#DCFCE7', text: '#16A34A' },
  },
  ready: {
    bg: '#EFF6FF',
    text: '#1E40AF',
    border: '#BFDBFE',
    accent: '#2563EB',
    chip: { bg: '#DBEAFE', text: '#2563EB' },
  },
} as const;

// ─── Priority Colors ───────────────────────────────────────────────

export const PRIORITY = {
  critical: { bg: '#FEF2F2', text: '#DC2626', dot: '#DC2626' },
  high: { bg: '#FFF7ED', text: '#EA580C', dot: '#EA580C' },
  medium: { bg: '#EFF6FF', text: '#2563EB', dot: '#2563EB' },
  low: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
} as const;

// ─── Status Colors ─────────────────────────────────────────────────
// Used by OM Daily, workflow status, prompt status

export const STATUS = {
  draft: { bg: '#F3F4F6', text: '#374151' },
  audited: { bg: '#EFF6FF', text: '#2563EB' },
  ready: { bg: '#ECFDF5', text: '#059669' },
  approved: { bg: '#F0FDF4', text: '#16A34A' },
  executing: { bg: '#FFFBEB', text: '#D97706' },
  verified: { bg: '#F0FDF4', text: '#15803D' },
  rejected: { bg: '#FEF2F2', text: '#DC2626' },
  blocked: { bg: '#FEF2F2', text: '#DC2626' },
  complete: { bg: '#F0FDF4', text: '#16A34A' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  in_progress: { bg: '#FFFBEB', text: '#D97706' },
  pending: { bg: '#F3F4F6', text: '#6B7280' },
  self_review: { bg: '#F5F3FF', text: '#7C3AED' },
  done: { bg: '#F0FDF4', text: '#16A34A' },
} as const;

// ─── Section Spacing ───────────────────────────────────────────────

export const SECTION = {
  gap: 24,          // Between major sections
  innerGap: 16,     // Between items within a section
  padding: 20,      // Section content padding
  accentWidth: 4,   // Left border accent for priority sections
} as const;

// ─── Text Hierarchy ────────────────────────────────────────────────
// Use these with MUI Typography's sx prop when theme defaults aren't enough

export const TEXT = {
  pageTitle: { fontSize: '1.5rem', fontWeight: 600, color: '#111827' },
  sectionHeader: { fontSize: '1.125rem', fontWeight: 600, color: '#111827' },
  body: { fontSize: '0.875rem', fontWeight: 400, color: '#374151' },
  meta: { fontSize: '0.75rem', fontWeight: 400, color: '#6B7280' },
  label: { fontSize: '0.6875rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
} as const;
