/**
 * Deprecation Registry — Component Lifecycle Tracking (Sunset Path)
 *
 * Tracks components progressing through deprecation toward removal.
 * Mirrors featureRegistry.ts but for the opposite direction: features
 * moving OUT of the codebase rather than in.
 *
 * Stages:
 *   1 = Deprecated    — Marked for removal, still functional, routes redirect
 *   2 = Quarantined   — Routes removed, imports severed, files still on disk
 *   3 = Verified      — Confirmed no remaining references (OMTrace clean)
 *   4 = Removed       — Files deleted from disk
 *   5 = Archived      — Logged in history, available in git/backup if needed
 *
 * Integration points:
 *   - OMTrace: dependency analysis to verify no remaining imports (stage 2→3)
 *   - Refactor Console: dead code scanning, file classification, restore from backup
 *   - Feature Registry: cross-reference to ensure deprecated items are removed from FEATURE_REGISTRY
 *
 * See docs/sdlc.md for the forward lifecycle (stages 1-5 production path).
 */

export interface DeprecatedEntry {
  /** Unique ID (kebab-case) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Deprecation stage (1-5) */
  stage: 1 | 2 | 3 | 4 | 5;
  /** Files on disk (relative to front-end/src/ or server/src/) */
  files: string[];
  /** What replaced this component (route or component name) */
  replacement?: string;
  /** Why it was deprecated */
  reason: string;
  /** Date deprecated (YYYY-MM-DD) */
  deprecatedDate: string;
  /** Date files removed from disk (YYYY-MM-DD), set at stage 4 */
  removedDate?: string;
  /** Who deprecated it */
  owner?: string;
  /** Original route path (for redirect tracking) */
  originalRoute?: string;
  /** Redirect target (if route still exists as redirect) */
  redirectTo?: string;
  /** Linked change set code */
  changeSetCode?: string;
  /** OMTrace analysis: number of remaining imports (updated during verification) */
  remainingImports?: number;
  /** Category for grouping */
  category?: 'frontend' | 'backend' | 'shared';
}

/** Risk level for a deprecated component */
export type RiskLevel = 'no_risk' | 'low' | 'medium' | 'high';

/** DB-persisted tracking data (from deprecation_tracking table) */
export interface DeprecationTracking {
  id: string;
  stage: number;
  risk_level: RiskLevel | null;
  router_refs: number;
  menu_refs: number;
  import_refs: number;
  dependent_components: string[] | null;
  last_analysis_at: string | null;
  last_analysis_by: string | null;
  router_removed: boolean;
  menu_removed: boolean;
  files_deleted: boolean;
}

/** Analysis result from the backend */
export interface RiskAnalysisResult {
  riskLevel: RiskLevel;
  totalActiveRefs: number;
  router: {
    total: number;
    active: number;
    redirects: number;
    refs: Array<{ line: number; text: string; isRedirect: boolean; pattern: string }>;
  };
  menu: {
    total: number;
    refs: Array<{ line: number; text: string; pattern: string }>;
  };
  imports: {
    total: number;
    refs: Array<{ file: string; match: string; component: string }>;
  };
  dependentComponents: string[];
  files: Array<{ file: string; exists: boolean }>;
}

/** Blocker returned when stage advancement is rejected */
export interface AdvancementBlocker {
  type: 'router' | 'menu' | 'imports' | 'files';
  message: string;
  refs: unknown[];
  dependentComponents?: string[];
}

// ────────────────────────────────────────────────────────────
// Registry
// ────────────────────────────────────────────────────────────

export const DEPRECATION_REGISTRY: DeprecatedEntry[] = [
  // ── Stage 2: Quarantined (routes removed, files on disk) ──
  {
    id: 'super-dashboard',
    name: 'Super Dashboard',
    stage: 2,
    files: ['features/devel-tools/users-customized-landing/SuperDashboard.tsx'],
    replacement: '/admin/control-panel',
    reason: 'Replaced by unified Admin Control Panel with better navigation and feature access',
    deprecatedDate: '2026-03-15',
    owner: 'nectarios',
    originalRoute: '/dashboards/super',
    redirectTo: '/admin/control-panel',
    category: 'frontend',
  },
  {
    id: 'super-dashboard-customizer',
    name: 'Super Dashboard Customizer',
    stage: 2,
    files: ['features/devel-tools/users-customized-landing/SuperDashboardCustomizer.tsx'],
    replacement: '/admin/control-panel',
    reason: 'Dashboard customization superseded by Control Panel layout',
    deprecatedDate: '2026-03-15',
    owner: 'nectarios',
    originalRoute: '/dashboards/super/customize',
    redirectTo: '/admin/control-panel',
    category: 'frontend',
  },
  {
    id: 'user-dashboard',
    name: 'User Dashboard',
    stage: 2,
    files: ['features/devel-tools/users-customized-landing/UserDashboard.tsx'],
    replacement: '/portal',
    reason: 'Replaced by Church Portal Hub with role-based feature access',
    deprecatedDate: '2026-03-15',
    owner: 'nectarios',
    originalRoute: '/dashboards/user',
    redirectTo: '/portal',
    category: 'frontend',
  },
  {
    id: 'landingpage-legacy',
    name: 'Legacy Landing Page',
    stage: 2,
    files: [
      'features/pages/landingpage/Landingpage.tsx',
      'features/landingpage/',
    ],
    replacement: '/',
    reason: 'Replaced by new public Homepage with EditableText inline editing',
    deprecatedDate: '2026-03-15',
    owner: 'nectarios',
    originalRoute: '/landingpage',
    redirectTo: '/admin/control-panel',
    category: 'frontend',
  },
  // ── Stage 2: Quarantined (routes redirect, menu refs removed, files on disk) ──
  {
    id: 'crm-page',
    name: 'CRM Page',
    stage: 4,
    files: [
      'features/devel-tools/crm/CRMPage.tsx',
      'features/devel-tools/crm/CRMDialogs.tsx',
      'features/devel-tools/crm/ChurchDetailDrawer.tsx',
      'features/devel-tools/crm/types.ts',
    ],
    replacement: '/admin/control-panel (church lifecycle retired to OMAI)',
    reason: 'Church lifecycle feature retired from OM, now owned by OMAI (PP-0003). Route redirects, menu entry removed.',
    deprecatedDate: '2026-03-15',
    removedDate: '2026-04-11',
    owner: 'nectarios',
    originalRoute: '/devel-tools/crm',
    redirectTo: '/admin/control-panel',
    changeSetCode: 'CS-0050',
    category: 'frontend',
  },
  {
    id: 'church-onboarding-page',
    name: 'Church Onboarding Page',
    stage: 2,
    files: ['features/admin/control-panel/ChurchOnboardingPage.tsx'],
    replacement: '/admin/control-panel (church lifecycle retired to OMAI)',
    reason: 'Church lifecycle feature retired from OM, now owned by OMAI (PP-0003). Route redirects.',
    deprecatedDate: '2026-03-15',
    owner: 'nectarios',
    originalRoute: '/admin/control-panel/church-onboarding',
    redirectTo: '/admin/control-panel',
    changeSetCode: 'CS-0050',
    category: 'frontend',
  },
  {
    id: 'church-onboarding-detail-page',
    name: 'Church Onboarding Detail Page',
    stage: 2,
    files: ['features/admin/control-panel/ChurchOnboardingDetailPage.tsx'],
    replacement: '/admin/control-panel (church lifecycle retired to OMAI)',
    reason: 'Church lifecycle feature retired from OM, now owned by OMAI (PP-0003). Route redirects.',
    deprecatedDate: '2026-03-15',
    owner: 'nectarios',
    originalRoute: '/admin/control-panel/church-onboarding/:churchId',
    redirectTo: '/admin/control-panel',
    changeSetCode: 'CS-0050',
    category: 'frontend',
  },
  {
    id: 'church-pipeline-page',
    name: 'Church Pipeline Page',
    stage: 2,
    files: ['features/admin/control-panel/ChurchPipelinePage.tsx'],
    replacement: '/admin/control-panel (church lifecycle retired to OMAI)',
    reason: 'Church lifecycle feature retired from OM, now owned by OMAI (PP-0003). Route redirects.',
    deprecatedDate: '2026-03-15',
    owner: 'nectarios',
    originalRoute: '/admin/control-panel/church-pipeline',
    redirectTo: '/admin/control-panel',
    changeSetCode: 'CS-0050',
    category: 'frontend',
  },
  {
    id: 'crm-outreach-page',
    name: 'CRM Outreach Sub-page',
    stage: 2,
    files: ['features/admin/control-panel/CRMOutreachPage.tsx'],
    replacement: '/admin/control-panel (church lifecycle retired to OMAI)',
    reason: 'CRM Outreach category sub-page retired from OM, church lifecycle now owned by OMAI (PP-0003). Route removed.',
    deprecatedDate: '2026-03-15',
    owner: 'nectarios',
    originalRoute: '/admin/control-panel/crm-outreach',
    redirectTo: '/admin/control-panel',
    changeSetCode: 'CS-0050',
    category: 'frontend',
  },
  // ── Stage 2: Quarantined (routes redirect, files on disk) ──
  {
    id: 'onboarding-pipeline-page',
    name: 'Onboarding Pipeline List Page',
    stage: 2,
    files: ['features/admin/control-panel/OnboardingPipelinePage.tsx'],
    replacement: '/admin/control-panel/church-lifecycle',
    reason: 'Layer 3 onboarding pipeline features folded into ChurchLifecycleDetailPage (PP-0003 Stage 4). List view superseded by ChurchLifecyclePage.',
    deprecatedDate: '2026-03-27',
    owner: 'nectarios',
    originalRoute: '/admin/control-panel/onboarding-pipeline',
    redirectTo: '/admin/control-panel/church-lifecycle',
    changeSetCode: 'CS-0050',
    category: 'frontend',
  },
  {
    id: 'onboarding-pipeline-detail-page',
    name: 'Onboarding Pipeline Detail Page',
    stage: 2,
    files: ['features/admin/control-panel/OnboardingPipelineDetailPage.tsx'],
    replacement: '/admin/control-panel/church-lifecycle/:churchId',
    reason: 'Layer 3 onboarding detail features (record requirements, email workflow, provisioning checklist) folded into ChurchLifecycleDetailPage (PP-0003 Stage 4).',
    deprecatedDate: '2026-03-27',
    owner: 'nectarios',
    originalRoute: '/admin/control-panel/onboarding-pipeline/:id',
    redirectTo: '/admin/control-panel/church-lifecycle',
    changeSetCode: 'CS-0050',
    category: 'frontend',
  },
  {
    id: 'field-mapper-legacy',
    name: 'Legacy Field Mapper',
    stage: 4,
    files: [
      'features/church/FieldMapperPage.tsx',
      'features/church/FieldMapperPage/constants.ts',
      'features/church/FieldMapperPage/types.ts',
      'features/church/FieldMapperPage/useRecordSettings.ts',
      'features/church/FieldMapperPage/DatabaseMappingTab.tsx',
      'features/church/FieldMapperPage/ExportTemplateDialog.tsx',
      'features/church/FieldMapperPage/RecordSettingsTab.tsx',
      'features/church/FieldMapperPage/ThemeStudioTab.tsx',
      'features/church/FieldMapperPage/UIThemeTab.tsx',
    ],
    replacement: '/account/parish-management/database-mapping',
    reason: 'Replaced by canonical field config system (church_record_fields table) — legacy tool used raw DB columns via field_mapper_settings table, new tool uses canonical keys with professional labels',
    deprecatedDate: '2026-03-23',
    removedDate: '2026-04-11',
    owner: 'nectarios',
    originalRoute: '/apps/church-management/:id/field-mapper',
    redirectTo: '/account/parish-management/database-mapping',
    category: 'frontend',
  },
  {
    id: 'record-creation-wizard',
    name: 'Record Creation Wizard',
    stage: 4,
    files: [
      'features/devel-tools/om-seedlings/RecordCreationWizard.tsx',
      'features/devel-tools/om-seedlings/OMSeedlingsPage.tsx',
      'features/devel-tools/om-seedlings/recordWizardTypes.ts',
      'features/devel-tools/om-seedlings/WizardPreviewStep.tsx',
      'features/devel-tools/om-seedlings/WizardCreateStep.tsx',
      'features/devel-tools/om-seedlings/WizardConfigureStep.tsx',
    ],
    replacement: 'OMAI /omai/tools/om-seedlings (dual-mode: Quick Seed + Advanced)',
    reason: 'Consolidated with OMAI Seedlings into single canonical seeding system. Backend remains at /api/admin/record-wizard.',
    deprecatedDate: '2026-03-27',
    removedDate: '2026-04-11',
    owner: 'nectarios',
    originalRoute: '/devel-tools/record-creation-wizard',
    redirectTo: '/admin/control-panel',
    category: 'frontend',
  },
  {
    id: 'logs-apps-page',
    name: 'Legacy /apps/logs Page',
    stage: 4,
    files: [
      'features/system/apps/logs/Logs.tsx',
      'features/system/apps/logs/types.ts',
      'features/system/apps/logs/tabs/SiteLogsTab.tsx',
      'features/system/apps/logs/tabs/ComponentLogsTab.tsx',
      'features/system/apps/logs/tabs/LogLevelsTab.tsx',
    ],
    replacement: '/admin/logs (ActivityLogs) and /admin/log-search (LogSearch)',
    reason: 'Silently broken since commit 1e77e136 — the tab-extraction refactor stripped ~15 imports (useRef, styled, tabler Icon*, PageContainer, Breadcrumb, Tabs, Tab, Badge, Snackbar) but left references intact. No menu entry; only a stale SiteMapPage link. Real logs page is /admin/logs → ActivityLogs.',
    deprecatedDate: '2026-04-12',
    removedDate: '2026-04-12',
    owner: 'nectarios',
    originalRoute: '/apps/logs',
    redirectTo: '/admin/logs',
    category: 'frontend',
  },
  {
    id: 'api-explorer',
    name: 'API Explorer (OM Frontend + Test CRUD/Runner)',
    stage: 4,
    files: [
      'features/devel-tools/api-explorer/ApiExplorerPage.tsx',
      'server/src/api/apiExplorer.js',
    ],
    replacement: 'OMAI API Explorer (dual-target: OMAI + OM)',
    reason: 'Migrated to OMAI as part of OM→OMAI boundary migration Wave 1, Cluster #20 Part C. Route introspection endpoint retained as server/src/api/systemRoutes.js for OMAI dual-target proxy.',
    deprecatedDate: '2026-04-12',
    removedDate: '2026-04-12',
    owner: 'nectarios',
    originalRoute: '/devel-tools/api-explorer',
    redirectTo: '/admin/control-panel',
    changeSetCode: 'CS-0050',
    category: 'frontend',
  },
  // ── Stage 4: Removed (dead code — router never mounted, JSON source file never existed) ──
  {
    id: 'component-discovery',
    name: 'Component Discovery Subsystem',
    stage: 4,
    files: [
      'server/src/api/componentDiscovery.js',
      'server/src/services/componentRegistryService.js',
      'server/src/utils/componentDiscovery.js',
      'server/src/utils/__tests__/componentDiscovery.test.ts',
      'server/src/services/__tests__/componentRegistryService.test.ts',
    ],
    reason: 'Dead code — router never mounted in index.ts, auto-discovered-components.json source file never existed on disk, component_registry DB table empty. Part of OM→OMAI boundary migration Wave 1, Cluster #20 Part A.',
    deprecatedDate: '2026-04-12',
    removedDate: '2026-04-12',
    owner: 'nectarios',
    changeSetCode: 'CS-0050',
    category: 'backend',
  },
];

// ────────────────────────────────────────────────────────────
// Helpers (mirrors featureRegistry.ts pattern)
// ────────────────────────────────────────────────────────────

/** O(1) lookup by ID */
const _byId = new Map(DEPRECATION_REGISTRY.map(e => [e.id, e]));

/** Look up a deprecated entry by ID */
export const getDeprecated = (id: string): DeprecatedEntry | undefined => _byId.get(id);

/** Get all entries at a given deprecation stage */
export const getDeprecatedByStage = (stage: number): DeprecatedEntry[] =>
  DEPRECATION_REGISTRY.filter(e => e.stage === stage);

/** Check if an entry has been fully removed (stage 4+) */
export const isRemoved = (id: string): boolean => {
  const entry = _byId.get(id);
  return entry ? entry.stage >= 4 : false;
};

/** Check if an entry still has files on disk (stages 1-3) */
export const hasFilesOnDisk = (id: string): boolean => {
  const entry = _byId.get(id);
  return entry ? entry.stage <= 3 : false;
};

/** Total count of deprecated items */
export const deprecatedCount = (): number => DEPRECATION_REGISTRY.length;

/** Count by stage */
export const deprecatedCountByStage = (): Record<number, number> => {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const e of DEPRECATION_REGISTRY) {
    counts[e.stage] = (counts[e.stage] || 0) + 1;
  }
  return counts;
};
