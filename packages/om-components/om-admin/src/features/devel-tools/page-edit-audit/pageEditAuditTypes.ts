/**
 * pageEditAuditTypes — Shared types, interfaces, and classification configs
 * for the Page Editability Audit feature.
 * Extracted from PageEditAuditPage.tsx
 */

// ── Types ───────────────────────────────────────────────────────────────

export interface RuleResult {
  status: string;
  [key: string]: any;
}

export interface SharedSection {
  component: string;
  has_edit_key_prefix: boolean;
  edit_key_prefix: string | null;
  fields: string[];
}

export interface RuntimeData {
  override_count: number;
  detected_key_count: number;
  persisted_detected_key_count: number;
  missing_detected_key_count: number;
  orphaned_override_count: number;
  translation_status_total: number;
  translation_needs_update_count: number;
}

export interface AuditIssue {
  rule: string;
  severity: string;
  message: string;
}

export interface PageAudit {
  id: string;
  name: string;
  file: string;
  category: string;
  route: string | null;
  pageKey: string | null;
  classification: string;
  editable_field_count: number;
  shared_section_count: number;
  shared_sections: SharedSection[];
  content_keys: string[];
  rules: Record<string, RuleResult>;
  issues: AuditIssue[];
  warnings: AuditIssue[];
  runtime: RuntimeData | null;
}

export interface AuditSummary {
  total_pages: number;
  editable_compliant: number;
  partially_editable: number;
  non_editable_by_design: number;
  broken_integration: number;
  unknown: number;
  total_issues: number;
  total_warnings: number;
}

export interface AuditResponse {
  success: boolean;
  timestamp: string;
  summary: AuditSummary;
  pages: PageAudit[];
}

// ── Candidate types ────────────────────────────────────────────────────

export interface CandidateSignals {
  hasSubstantialText?: boolean;
  totalTranslatable?: number;
  i18nCallCount?: number;
  hardcodedStringCount?: number;
  usesI18n?: boolean;
  isDataDriven?: boolean;
  unwiredSharedSections?: number;
  inPublicLayout?: boolean;
  editableTextCount?: number;
  wiredSharedSections?: number;
}

export interface Candidate {
  route: string;
  pageKey: string;
  component: string | null;
  file?: string;
  registryId?: string;
  classification: string;
  score: number;
  signals: CandidateSignals;
  rationale: string;
  inPublicLayout: boolean;
  recommended_action?: string;
  duplicateOf?: string;
}

export interface CandidateSummary {
  total_public_routes: number;
  excluded_non_content: number;
  evaluated_content_pages: number;
  already_compliant: number;
  conversion_candidates: number;
  low_priority_candidates: number;
  non_candidates: number;
  needs_investigation: number;
}

export interface CandidateResponse {
  success: boolean;
  timestamp: string;
  summary: CandidateSummary;
  candidates: Candidate[];
}

// ── Wire preview types ─────────────────────────────────────────────────

export interface DiffChange {
  type: 'added' | 'removed' | 'context';
  line: number;
  text: string;
}

export interface DiffHunk {
  startLine: number;
  changes: DiffChange[];
}

export interface UncoveredCall {
  key: string;
  context: string;
  line: number;
  lineText: string;
}

export interface WirePreviewResult {
  success: boolean;
  error?: string;
  file?: string;
  relativeFile?: string;
  totalChanges: number;
  phases?: {
    directElements: number;
    arrayPatterns: number;
    standaloneCalls: number;
    importAdded: boolean;
  };
  coveredPrefixes?: string[];
  uncovered?: UncoveredCall[];
  propValues?: number;
  diff?: DiffHunk[];
  allCovered?: boolean;
}

export interface WireApplyResult {
  success: boolean;
  applied?: boolean;
  totalChanges?: number;
  message?: string;
  error?: string;
  uncovered?: UncoveredCall[];
  allCovered?: boolean;
}

// ── Classification config ───────────────────────────────────────────────

export const CLASSIFICATION_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'error' | 'info' }> = {
  'editable-compliant':      { label: 'Compliant',        color: 'success' },
  'partially-editable':      { label: 'Partial',          color: 'warning' },
  'non-editable-by-design':  { label: 'By Design',        color: 'default' },
  'broken-integration':      { label: 'Broken',           color: 'error'   },
  'unknown':                 { label: 'Unknown',          color: 'info'    },
};

export const CANDIDATE_CLASS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'error' | 'info' | 'primary' | 'secondary' }> = {
  'conversion-candidate':    { label: 'Ready',            color: 'primary'  },
  'low-priority-candidate':  { label: 'Low Priority',     color: 'info'     },
  'already-compliant':       { label: 'Compliant',        color: 'success'  },
  'non-candidate':           { label: 'Non-Candidate',    color: 'default'  },
  'excluded':                { label: 'Excluded',         color: 'default'  },
  'needs-investigation':     { label: 'Investigate',      color: 'warning'  },
};
