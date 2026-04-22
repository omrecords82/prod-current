/**
 * Feature Registry — Single Source of Truth
 *
 * Every user-facing feature is registered here with its current lifecycle stage.
 * The EnvironmentContext and EnvironmentAwarePage derive visibility and banner
 * styling from this registry instead of hardcoded feature sets.
 *
 * Stages:
 *   1 = Prototype    (red banner, super_admin only)
 *   2 = Development  (red banner, super_admin only)
 *   3 = Review       (orange banner, super_admin only)
 *   4 = Stabilizing  (orange banner, super_admin only)
 *   5 = Production   (green banner or none, all users)
 *
 * See docs/sdlc.md for full lifecycle documentation.
 */

export interface FeatureEntry {
  /** Unique feature ID (kebab-case, matches featureId in EnvironmentAwarePage) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Current lifecycle stage */
  stage: 1 | 2 | 3 | 4 | 5;
  /** Who owns / is working on the feature */
  owner?: string;
  /** Primary route path */
  route?: string;
  /** One-line description */
  description?: string;
  /** Date feature entered current stage (YYYY-MM-DD) */
  since?: string;
  /** Linked change set code (e.g. 'CS-0038') — ties feature to SDLC pipeline */
  changeSetCode?: string;
  /**
   * Scope: which platform(s) this feature serves.
   *   'om'    — OrthodoxMetrics only
   *   'omai'  — OMAI only
   *   'shared' — used by both platforms
   * Defaults to 'om' when omitted.
   */
  scope?: 'om' | 'omai' | 'shared';
  /**
   * Canonical parent platform — where the single source of truth lives.
   * Required when scope is 'shared'. The other platform links/proxies to it.
   *   'om'   — canonical code lives in orthodoxmetrics
   *   'omai' — canonical code lives in omai
   */
  canonicalParent?: 'om' | 'omai';
}

// ────────────────────────────────────────────────────────────
// Registry
// ────────────────────────────────────────────────────────────

export const FEATURE_REGISTRY: FeatureEntry[] = [
  // ── Stage 5: Production ────────────────────────────────────
  { id: 'user-profile', name: 'User Profile', stage: 5, route: '/apps/user-profile' },
  { id: 'contacts', name: 'Contacts', stage: 5, route: '/apps/contacts' },
  { id: 'notes', name: 'Notes', stage: 5, route: '/apps/notes' },
  { id: 'tickets', name: 'Tickets', stage: 5, route: '/apps/tickets' },
  { id: 'email', name: 'Email', stage: 5, route: '/apps/email' },
  { id: 'kanban', name: 'Kanban Board', stage: 5, route: '/apps/kanban' },
  { id: 'invoice', name: 'Invoice', stage: 5, route: '/apps/invoice/list' },
  { id: 'church-management', name: 'Church Management', stage: 5, route: '/admin/churches' },
  { id: 'social-chat', name: 'Social Chat', stage: 5, route: '/social/chat' },
  { id: 'notifications', name: 'Notifications', stage: 5, route: '/notifications' },
  { id: 'baptism-records-v2', name: 'Baptism Records', stage: 5, route: '/apps/records/baptism', since: '2026-02-15' },
  { id: 'certificates', name: 'Certificate Generator', stage: 5, route: '/apps/certificates/generate' },
  { id: 'user-guide', name: 'User Guide', stage: 5, route: '/help/user-guide', description: 'Documentation knowledge base for all users', since: '2026-02-21' },
  { id: 'church-portal', name: 'Church Portal', stage: 5, route: '/portal', description: 'Hub for church staff', since: '2026-02-26' },
  { id: 'portal-records', name: 'Portal Records Hub', stage: 5, route: '/portal/records', description: 'Unified records hub with onboarding flow', since: '2026-03-07' },

  // ── Stage 3: Review ──────────────────────────────────────────
  { id: 'certificate-templates', name: 'Certificate Template Library', stage: 3, route: '/admin/control-panel/certificate-templates', description: 'Jurisdiction-based certificate template management with field positioning', since: '2026-03-16' },

  // ── Stage 4: Stabilizing ───────────────────────────────────
  { id: 'pending-members', name: 'Pending Members', stage: 4, route: '/admin/control-panel/pending-members', description: 'Review and approve users who registered via church token', since: '2026-03-07', changeSetCode: 'CS-0049' },
  { id: 'upload-records', name: 'Upload Records', stage: 5, route: '/apps/upload-records', description: 'Simplified OCR upload for church staff', since: '2026-02-26', changeSetCode: 'CS-0042' },
  { id: 'ocr-studio', name: 'OCR Studio', stage: 5, route: '/portal/ocr', since: '2026-02-01' },
  { id: 'interactive-reports', name: 'Interactive Reports', stage: 4, route: '/apps/records/interactive-reports', since: '2026-02-01' },
  { id: 'interactive-report-jobs', name: 'Interactive Report Jobs', stage: 4, route: '/devel-tools/interactive-reports/jobs', since: '2026-02-01' },

  // ── Stage 3: Review ────────────────────────────────────────
  { id: 'church-lifecycle-detail', name: 'Church Lifecycle Detail', stage: 3, route: '/admin/control-panel/church-lifecycle/:churchId', description: 'Unified church detail view — CRM contacts, activities, follow-ups, record requirements, email workflow, onboarding, and timeline', since: '2026-03-15', changeSetCode: 'CS-0050' },
  { id: 'funeral-records-v2', name: 'Funeral Records', stage: 3, route: '/apps/records/funeral', since: '2026-02-01', changeSetCode: 'CS-0039' },
  { id: 'change-sets', name: 'Change Sets', stage: 3, route: '/omai/tools/om-daily', description: 'SDLC delivery container — migrated to OMAI Operations Hub', since: '2026-03-08', changeSetCode: 'CS-0037', scope: 'shared', canonicalParent: 'omai' },

  // ── Stage 2: Development ───────────────────────────────────
  { id: 'account-hub', name: 'Account Hub', stage: 2, route: '/account/profile', description: 'Unified account settings — profile, password, parish info, church details', since: '2026-03-20' },
  { id: 'parish-management-hub', name: 'Parish Management Hub', stage: 2, route: '/account/parish-management', description: 'Dashboard, database mapping wizard, record settings, branding, themes, search config, system behavior', since: '2026-03-21' },
  { id: 'om-charts', name: 'OM Charts', stage: 2, route: '/apps/om-charts', description: 'Graphical charts from church sacramental records', since: '2026-02-18' },
  { id: 'sacramental-restrictions', name: 'Sacramental Date Restrictions', stage: 2, route: '/admin/control-panel/church-management/sacramental-restrictions', description: 'Calendar viewer for Orthodox sacramental date restrictions', since: '2026-02-28' },
  { id: 'marriage-records-v2', name: 'Marriage Records', stage: 2, route: '/apps/records/marriage', since: '2026-02-01', changeSetCode: 'CS-0039' },
  { id: 'enhanced-ocr-uploader', name: 'Enhanced OCR Uploader', stage: 2, route: '/devel/ocr-studio/upload', since: '2026-01-15', changeSetCode: 'CS-0038' },
  { id: 'dynamic-records-inspector', name: 'Dynamic Records Inspector', stage: 2, route: '/devel/dynamic-records', since: '2026-01-20' },
  // tutorial-management — migrated to OMAI (/omai/ops/tutorials)
  { id: 'prompt-plans', name: 'Prompt Plans', stage: 2, route: '/omai/ai/prompt-plans', description: 'Ordered sequences of AI prompts for complex initiatives — migrated to OMAI Operations Hub', since: '2026-03-08', scope: 'shared', canonicalParent: 'omai' },
  { id: 'page-editor', name: 'Page Content Editor', stage: 2, route: '/devel-tools/page-editor', description: 'CMS for editing frontend page text from the web UI', since: '2026-03-08' },
  { id: 'jurisdictions', name: 'Jurisdictions', stage: 2, route: '/admin/control-panel/jurisdictions', description: 'Orthodox church jurisdictions with calendar type mapping', since: '2026-03-15' },
  { id: 'demo-churches', name: 'Demo Churches', stage: 2, route: '/admin/control-panel/demo-churches', description: 'Quick-create demo church instances with sample sacramental records', since: '2026-03-15' },
  { id: 'onboarding-pipeline', name: 'Onboarding Pipeline', stage: 2, route: '/admin/control-panel/onboarding-pipeline', description: 'Extended church onboarding pipeline with record requirements, email workflow, and provisioning checklist', since: '2026-03-24' },
  { id: 'onboarding-pipeline-detail', name: 'Onboarding Pipeline Detail', stage: 2, route: '/admin/control-panel/onboarding-pipeline/:id', description: 'Church onboarding workspace with contacts, requirements, email drafts, and provisioning', since: '2026-03-24' },
  { id: 'records-landing-branding', name: 'Records Landing Branding', stage: 2, route: '/admin/church-branding/records-landing', description: 'Church-level customization for records landing page header', since: '2026-03-10' },
  { id: 'code-change-detection', name: 'Code Change Detection', stage: 2, route: '/admin/ai/code-changes', description: 'Tracks page content edits, notifies admins, and triggers frontend builds', since: '2026-03-08' },
  { id: 'sdlc-wizard', name: 'SDLC Pipeline Wizard', stage: 2, route: '/omai/tools/om-daily', description: 'Wizard-driven SDLC pipeline — migrated to OMAI Operations Hub', since: '2026-03-12', changeSetCode: 'CS-0037', scope: 'shared', canonicalParent: 'omai' },
  { id: 'ocr-workbench', name: 'OCR Workbench & Review UX', stage: 2, route: '/devel/ocr-studio', description: 'Full OCR document review workbench with overlay editing', since: '2026-02-01', changeSetCode: 'CS-0042' },
  { id: 'ocr-admin-dashboard', name: 'OCR Admin & Analytics', stage: 2, description: 'Admin dashboard for OCR job monitoring, stats, and quality metrics', since: '2026-03-08', changeSetCode: 'CS-0043' },
  { id: 'ocr-backend-infra', name: 'OCR Backend Infrastructure', stage: 2, description: 'Pipeline workers, queue management, storage, and API layer', since: '2026-03-08', changeSetCode: 'CS-0044' },
  { id: 'ocr-test-suite', name: 'OCR Test Suite', stage: 2, description: 'End-to-end and unit test coverage for OCR pipeline', since: '2026-03-08', changeSetCode: 'CS-0045' },
  { id: 'ocr-accessibility', name: 'OCR Frontend Polish & Accessibility', stage: 2, description: 'Accessibility, responsiveness, and UX polish for OCR pages', since: '2026-03-08', changeSetCode: 'CS-0046' },
  { id: 'ocr-languages', name: 'OCR Language & Accuracy', stage: 2, description: 'Multi-language support and accuracy improvement system', since: '2026-03-08', changeSetCode: 'CS-0040' },
  { id: 'ocr-layout-intel', name: 'OCR Layout & Table Intelligence', stage: 2, description: 'Automatic table detection, column mapping, and layout analysis', since: '2026-03-08', changeSetCode: 'CS-0041' },
  { id: 'documentation-sprint', name: 'Documentation Sprint', stage: 2, description: 'Platform-wide documentation updates and developer guides', since: '2026-03-08', changeSetCode: 'CS-0047' },
  { id: 'platform-devops', name: 'Platform DevOps & Infrastructure', stage: 2, description: 'CI/CD, monitoring, deployment automation, and server hardening', since: '2026-03-08', changeSetCode: 'CS-0048' },

  // ── Stage 1: Prototype ─────────────────────────────────────
  { id: 'repo-ops', name: 'Repository Operations', stage: 2, route: '/devel-tools/repo-ops', description: 'Unified build status, git context, and branch cleanup hub', since: '2026-03-24' },
  { id: 'us-church-map', name: 'US Church Map', stage: 2, route: '/omai/ops/church-map', description: 'Church Operations Hub — status-aware choropleth with CRM/onboarding integration', since: '2026-03-15', changeSetCode: 'CS-0050', scope: 'shared', canonicalParent: 'omai' },
  { id: 'om-seedlings', name: 'OM Seedlings', stage: 2, route: '/omai/tools/om-seedlings', description: 'Mass-generate sacramental records for onboarded churches — migrated to OMAI Operations Hub', since: '2026-03-23', scope: 'shared', canonicalParent: 'omai' },
  // record-creation-wizard: removed (see deprecationRegistry.ts, stage 4 — deleted 2026-04-11)
  { id: 'parish-onboarding-wizard', name: 'Parish Onboarding Wizard', stage: 2, route: '/portal/onboarding', description: 'Guided parish setup wizard for configuring record field labels, order, and visibility', since: '2026-03-24' },
  { id: 'translation-manager', name: 'Translation Manager', stage: 2, route: '/devel-tools/translation-manager', description: 'Professional translation management with source versioning, hash-based staleness, and per-language workflow', since: '2026-03-28' },
  { id: 'badge-state-manager', name: 'Badge State Manager', stage: 2, route: '/devel-tools/badge-state-manager', description: 'Manage menu item badge lifecycle (NEW/UPDATED) from the control panel', since: '2026-03-31' },
  { id: 'live-table-builder', name: 'Live Table Builder', stage: 1, route: '/devel-tools/live-table-builder', since: '2026-01-20' },
  { id: 'liturgical-calendar', name: 'Liturgical Calendar', stage: 5, route: '/apps/liturgical-calendar', description: 'Eastern Orthodox liturgical calendar with auto-theme', since: '2026-02-27' },
];

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const _byId = new Map<string, FeatureEntry>(
  FEATURE_REGISTRY.map((f) => [f.id, f]),
);

/** Look up a feature by its ID */
export function getFeature(id: string): FeatureEntry | undefined {
  return _byId.get(id);
}

/** Get all features at a given stage */
export function getFeaturesByStage(stage: number): FeatureEntry[] {
  return FEATURE_REGISTRY.filter((f) => f.stage === stage);
}

/** Returns true when the feature is stage 5 (production) */
export function isProductionFeature(id: string): boolean {
  const f = _byId.get(id);
  return f ? f.stage === 5 : false;
}

/** Get all shared features (served by both platforms) */
export function getSharedFeatures(): FeatureEntry[] {
  return FEATURE_REGISTRY.filter((f) => f.scope === 'shared');
}

/**
 * Returns the feature's stage number (used as priority).
 * Unknown features return undefined so callers can fall back to explicit priority.
 */
export function featurePriority(id: string): number | undefined {
  return _byId.get(id)?.stage;
}
