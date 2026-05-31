/**
 * Frontend Page Edit Audit Service — Phase 2 (Static + Runtime)
 *
 * Deterministic, read-only analysis of frontend page TSX files and runtime
 * DB state to verify pages are correctly wired for the inline live editing
 * system (EditableText, shared editable sections, content keys, PublicLayout,
 * page_content overrides, translation_status tracking).
 *
 * Phase 1 (static): Filesystem-only checks on source files and Router.tsx.
 * Phase 2 (runtime): DB queries against page_content and translation_status.
 *
 * Reuses PAGE_REGISTRY and import-resolution utilities from page-content.js.
 */

const fs = require('fs');
const path = require('path');
const { getAppPool } = require('../config/db');

const {
  PAGE_REGISTRY,
  resolveLocalImports,
  resolveFilePath,
  FRONTEND_SRC,
} = require('../routes/page-content');

// ── Constants ───────────────────────────────────────────────────────────

const ROUTER_FILE = path.join(FRONTEND_SRC, 'routes/Router.tsx');

/** Shared editable section components that participate in the live edit system. */
const APPROVED_SHARED_SECTIONS = ['HeroSection', 'CTASection', 'SectionHeader', 'FeatureCard', 'BulletList'];

/**
 * Content key validation pattern.
 * Accepts:
 *   - Two segments: section.field (e.g., "samples.intro")
 *   - Three+ segments: section.sub.field (e.g., "about.hero.title", "why.stat1.number")
 *   - Underscore variants: section.sub_field (e.g., "about.hero_title")
 * Each segment must start with a lowercase letter and contain only [a-z0-9_].
 */
const CONTENT_KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,4}$/;

/**
 * Lightweight intent declaration for pages known to be non-editable by design.
 * Keeps Phase 1 classifications clean without a full registry refactor.
 * Key = PAGE_REGISTRY id, value = reason.
 */
const NON_EDITABLE_BY_DESIGN = {
  // Shared layout components — not standalone pages
  'shared-header':                   'shared layout component',
  'shared-footer':                   'shared layout component',
  'shared-header-nav':               'shared layout component',
  'shared-c2a':                      'shared layout component',
  'shared-pricing':                  'shared layout component',
  // Auth/admin — outside public edit scope
  'login':                           'auth page',
  'admin-control-panel':             'admin page',
  'church-portal':                   'admin page',
  // Public pages intentionally not wired for inline editing
  'oca-timeline':                    'static reference page',
  'welcome-message':                 'onboarding page',
  'sacramental-restrictions-public': 'data-driven page',
  // Legacy pages outside PublicLayout, no edit wiring, no plan to add it
  'faq':                             'legacy page, not under PublicLayout — uses MUI Banner + C2a, no inline editing',
  'portfolio':                       'legacy page, not under PublicLayout — uses Banner + C2a + Footer, no inline editing',
};

/**
 * Pages that intentionally use section-scoped content keys instead of
 * pageKey-prefixed keys. The Homepage was built this way from the start
 * and has production data in page_content using bare section prefixes
 * (hero.*, steps.*, features.*, etc.) within pageKey="homepage".
 *
 * This exempts CONTENT_KEYS_MATCH_PAGE_KEY from flagging, while keeping
 * the rule strict for all other pages.
 */
const PAGE_KEY_PREFIX_EXEMPT = {
  'homepage': 'intentional: Homepage uses section-scoped keys (hero.*, steps.*, features.*) within pageKey="homepage" — established convention with production data',
};

/**
 * Routes in BlankLayout that are NOT public content pages.
 * These are excluded from candidate detection because they are auth flows,
 * redirects, utility viewers, data-driven apps, or token-gated pages.
 *
 * The BlankLayout block contains nested children (e.g., auth route group)
 * whose paths are extracted alongside direct children. Every non-content
 * route must be listed here to keep the candidate set clean.
 */
const CANDIDATE_EXCLUDED_ROUTES = {
  // ── Auth route group and all its children ────────────────────
  'auth':                                'auth route group',
  '404':                                 'auth error page',
  'coming-soon':                         'auth placeholder page',
  'unauthorized':                        'auth error page',
  'login':                               'auth login page',
  'login2':                              'auth login page',
  'register':                            'auth registration page',
  'register-token':                      'auth token registration',
  'register2':                           'auth registration page',
  'forgot-password':                     'auth password reset',
  'forgot-password2':                    'auth password reset',
  'two-steps':                           'auth 2FA page',
  'two-steps2':                          'auth 2FA page',
  'maintenance':                         'auth maintenance page',
  'accept-invite/:token':               'auth invite acceptance',
  'verify-email':                        'auth email verification',
  // ── Redirects ────────────────────────────────────────────────
  '/login':                              'redirect to auth',
  '/landingpage':                        'redirect to admin',
  '/pages/pricing':                      'redirect to admin',
  // ── Utility demo viewers ─────────────────────────────────────
  '/greek_baptism_table_demo.html':      'utility HTML viewer',
  '/russian_wedding_table_demo.html':    'utility HTML viewer',
  '/romanian_funeral_table_demo.html':   'utility HTML viewer',
  // ── Data-driven / CMS-driven pages ───────────────────────────
  '/tasks':                              'data-driven task list',
  '/tasks/:id':                          'data-driven task detail',
  '/blog/:slug':                         'CMS-driven blog post renderer',
  '/frontend-pages/blog/detail/:id':     'CMS-driven blog post renderer',
  '/frontend-pages/gallery':             'devel-tools gallery, not a public content page',
  // ── Token-gated functional pages ─────────────────────────────
  '/r/interactive/:token':               'token-gated form submission',
  '/c/:token':                           'token-gated collaboration page',
  // ── Catch-all ────────────────────────────────────────────────
  '*':                                   'catch-all error page',
};

/**
 * Unregistered page files on disk that are intentionally not in PAGE_REGISTRY.
 * These are either sub-components, utility pages, or legacy files that should
 * not be audited as standalone editable pages.
 * Key = filename (without .tsx), value = reason.
 */
const UNREGISTERED_KNOWN = {
  'Footer':                  'legacy footer component — replaced by shared/footer/SiteFooter',
  'Header':                  'registered as shared-header in PAGE_REGISTRY',
  'LeftSideMenu':            'UI sub-component, not a standalone page',
  'PagesMenu':               'internal navigation menu, not a content page',
  'HTMLViewer':              'utility viewer for static HTML demos, no editable content',
  'GreekRecordsViewer':      'utility viewer for Greek records demo, no editable content',
  'PublicTasksListPage':     'data-driven task list, no editable marketing content',
  'PublicTaskDetailPage':    'data-driven task detail, no editable marketing content',
  'SampleRecordsExplorer':   'data-driven interactive explorer, content from i18n',
  'BlogPost':                'dynamic blog post renderer — content comes from CMS/DB, not inline editing',
};

// ── Router scanning ─────────────────────────────────────────────────────

/**
 * Parse Router.tsx once and extract:
 *   - publicLayoutPaths: routes nested inside the <PublicLayout /> block
 *   - blankLayoutPaths: all routes inside BlankLayout (the public/unauthenticated tree)
 *   - allRoutePaths: every path="..." in the file
 *   - componentImports: map of component name → import path
 */
function parseRouterFile() {
  const source = readFileSafe(ROUTER_FILE);
  if (!source) return { publicLayoutPaths: [], blankLayoutPaths: [], allRoutePaths: [], componentImports: {} };

  // Extract all path="..." values
  const allRoutePaths = [];
  const pathRe = /path:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = pathRe.exec(source)) !== null) {
    allRoutePaths.push(m[1]);
  }

  // Find the PublicLayout children block and extract paths inside it.
  // Pattern: element: <PublicLayout />, children: [ ... ]
  const publicLayoutPaths = [];
  const plBlockRe = /element:\s*<PublicLayout\s*\/?>[\s\S]*?children:\s*\[([\s\S]*?)\]/;
  const plMatch = plBlockRe.exec(source);
  if (plMatch) {
    const childBlock = plMatch[1];
    const childPathRe = /path:\s*['"]([^'"]+)['"]/g;
    let cm;
    while ((cm = childPathRe.exec(childBlock)) !== null) {
      publicLayoutPaths.push(cm[1]);
    }
  }

  // Find the BlankLayout children block and extract ALL paths inside it.
  // This captures the full public/unauthenticated route tree, including
  // PublicLayout children, legacy public pages, auth routes, etc.
  const blankLayoutPaths = [];
  const blBlockRe = /element:\s*<BlankLayout\s*\/?>[\s\S]*?children:\s*\[([\s\S]*?)(?:\n\s*\],\s*\n\s*\})/;
  const blMatch = blBlockRe.exec(source);
  if (blMatch) {
    const childBlock = blMatch[1];
    const childPathRe = /path:\s*['"]([^'"]+)['"]/g;
    let cm;
    while ((cm = childPathRe.exec(childBlock)) !== null) {
      blankLayoutPaths.push(cm[1]);
    }
  }

  // Extract component imports: const Name = Loadable(lazy(() => import('...')))
  const componentImports = {};
  const importRe = /const\s+(\w+)\s*=\s*Loadable\(lazy\(\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)\)\)/g;
  while ((m = importRe.exec(source)) !== null) {
    componentImports[m[1]] = m[2];
  }

  return { publicLayoutPaths, blankLayoutPaths, allRoutePaths, componentImports };
}

// ── File scanning ───────────────────────────────────────────────────────

/** Read a file safely; return empty string on failure. */
function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

/**
 * Recursively collect source content for a page file and its local imports.
 * Returns array of { relPath, source } objects. Skips shared/layout/hooks dirs
 * (same logic as page-content.js scanFileWithImports).
 */
function collectPageSources(absolutePath, visited = new Set()) {
  if (visited.has(absolutePath)) return [];
  visited.add(absolutePath);
  if (!fs.existsSync(absolutePath)) return [];

  const source = fs.readFileSync(absolutePath, 'utf-8');
  const relPath = path.relative(FRONTEND_SRC, absolutePath);
  const results = [{ relPath, source }];

  const dir = path.dirname(absolutePath);
  const localImports = resolveLocalImports(source, dir);
  for (const importedFile of localImports) {
    if (!importedFile.startsWith(FRONTEND_SRC)) continue;
    const rel = path.relative(FRONTEND_SRC, importedFile);
    // Skip non-content directories (same filter as page-content.js)
    if (/^(shared|api|hooks|store|utils|context|config|routes|layouts|theme)\//.test(rel)) continue;
    results.push(...collectPageSources(importedFile, visited));
  }

  return results;
}

/**
 * Scan source files for EditableText and RichEditableText usage.
 * Returns { count, contentKeys } where contentKeys are the literal string values found.
 */
function scanEditableText(sources) {
  let count = 0;
  const contentKeys = [];

  for (const { source } of sources) {
    // Direct <EditableText or <RichEditableText contentKey="..." usage
    const directRe = /<(?:Editable|RichEditable)Text[^>]*contentKey=["']([^"']+)["']/g;
    let m;
    while ((m = directRe.exec(source)) !== null) {
      count++;
      contentKeys.push(m[1]);
    }

    // Template literal contentKey={`${prefix}.field`} inside EditableText or RichEditableText
    // These are in shared sections, captured separately via shared section scan.
    // Count inline template usages that aren't inside shared section definitions:
    const templateRe = /<(?:Editable|RichEditable)Text[^>]*contentKey=\{`\$\{(\w+)\}\.(\w+)`\}/g;
    while ((m = templateRe.exec(source)) !== null) {
      count++;
      // Can't resolve the runtime value, but we track the pattern
      contentKeys.push(`\${${m[1]}}.${m[2]}`);
    }
  }

  return { count, contentKeys };
}

/**
 * Scan source files for approved shared editable section usage.
 * Returns array of { component, hasEditKeyPrefix, editKeyPrefix?, fields[] }.
 */
function scanSharedSections(sources) {
  const sections = [];

  for (const { source } of sources) {
    for (const component of APPROVED_SHARED_SECTIONS) {
      // Match <ComponentName with optional props
      const tagRe = new RegExp(`<${component}\\b([^>]*(?:\\n[^>]*)*)>|<${component}\\b([^/]*?)/>`, 'g');
      let m;
      while ((m = tagRe.exec(source)) !== null) {
        const propsStr = m[1] || m[2] || '';

        if (component === 'BulletList') {
          // BulletList uses contentKeys={[...]} not editKeyPrefix
          const hasContentKeys = /contentKeys=/.test(propsStr);
          sections.push({
            component,
            hasEditKeyPrefix: hasContentKeys, // treat contentKeys as equivalent
            editKeyPrefix: null,
            fields: hasContentKeys ? ['items'] : [],
          });
          continue;
        }

        // Check for editKeyPrefix="value" or editKeyPrefix={'value'} or editKeyPrefix={`value`}
        const prefixMatch = propsStr.match(/editKeyPrefix=["'{`]([^"'}`]+)["'}`]/);
        const hasPrefix = !!prefixMatch;
        const prefix = prefixMatch ? prefixMatch[1] : null;

        // Determine fields based on component type
        let fields = [];
        if (component === 'HeroSection' || component === 'SectionHeader') {
          fields = ['badge', 'title', 'subtitle'];
        } else if (component === 'CTASection') {
          fields = ['title', 'subtitle'];
        } else if (component === 'FeatureCard') {
          fields = ['title', 'description'];
        }

        sections.push({ component, hasEditKeyPrefix: hasPrefix, editKeyPrefix: prefix, fields });
      }
    }
  }

  return sections;
}

/**
 * Derive the expected pageKey from a route path (mirrors EditModeContext.derivePageKey).
 */
function derivePageKey(routePath) {
  if (!routePath || routePath === '/') return 'homepage';
  const segments = routePath.replace(/^\/+|\/+$/g, '').split('/');
  return segments[segments.length - 1] || 'homepage';
}

/**
 * Expand shared section prefixes into concrete content keys.
 * E.g., HeroSection with prefix "about.hero" → ["about.hero.badge", "about.hero.title", "about.hero.subtitle"]
 */
function expandSectionKeys(sections) {
  const keys = [];
  for (const s of sections) {
    if (!s.editKeyPrefix) continue;
    for (const field of s.fields) {
      keys.push(`${s.editKeyPrefix}.${field}`);
    }
  }
  return keys;
}

// ── Runtime DB checks ───────────────────────────────────────────────────

/**
 * Fetch all runtime data needed for the audit in two queries (batch for all pages).
 * Returns { pageContentRows, translationStatusRows }.
 */
async function fetchRuntimeData() {
  const pool = getAppPool();
  const [pageContentRows] = await pool.query(
    'SELECT page_key, content_key FROM page_content ORDER BY page_key, content_key'
  );
  const [translationStatusRows] = await pool.query(
    'SELECT content_key, lang_code, needs_update FROM translation_status ORDER BY content_key'
  );
  return { pageContentRows, translationStatusRows };
}

/**
 * Build runtime audit data for a single page.
 *
 * page_content stores content_key relative to the page (e.g., "hero.badge").
 * translation_status stores the full key (e.g., "homepage.hero.badge").
 *
 * @param {string} pageKey - The page's derived pageKey
 * @param {string[]} detectedKeys - Content keys found by static analysis
 * @param {boolean} isNonEditableByDesign
 * @param {object[]} pageContentRows - All rows from page_content
 * @param {object[]} translationStatusRows - All rows from translation_status
 * @returns {{ runtime, rules }}
 */
function buildRuntimeAudit(pageKey, detectedKeys, isNonEditableByDesign, pageContentRows, translationStatusRows) {
  const rules = {};

  if (isNonEditableByDesign || !pageKey) {
    return {
      runtime: {
        override_count: 0,
        detected_key_count: 0,
        persisted_detected_key_count: 0,
        missing_detected_key_count: 0,
        orphaned_override_count: 0,
        translation_status_total: 0,
        translation_needs_update_count: 0,
      },
      rules: {
        PAGE_CONTENT_OVERRIDE_COUNT: { status: 'skip', reason: 'non-editable-by-design' },
        PAGE_CONTENT_KEY_PERSISTENCE: { status: 'skip', reason: 'non-editable-by-design' },
        TRANSLATION_STATUS_SUMMARY: { status: 'skip', reason: 'non-editable-by-design' },
        RUNTIME_PAGE_KEY_MATCH: { status: 'skip', reason: 'non-editable-by-design' },
      },
    };
  }

  // ── PAGE_CONTENT_OVERRIDE_COUNT ─────────────────────────────
  // page_content rows where page_key matches
  const pageOverrides = pageContentRows.filter(r => r.page_key === pageKey);
  const overrideContentKeys = new Set(pageOverrides.map(r => r.content_key));
  const overrideCount = pageOverrides.length;

  rules.PAGE_CONTENT_OVERRIDE_COUNT = {
    status: 'pass',
    override_count: overrideCount,
    detail: overrideCount > 0
      ? `${overrideCount} override(s) saved in page_content for pageKey "${pageKey}"`
      : `No overrides saved yet for pageKey "${pageKey}" — normal for newly wired pages`,
  };

  // ── PAGE_CONTENT_KEY_PERSISTENCE ────────────────────────────
  // Compare detected static keys against persisted rows.
  // Detected keys may or may not start with pageKey depending on convention.
  // page_content.content_key is relative (no pageKey prefix).
  // So we compare detected keys directly for non-exempt pages,
  // and also for exempt pages (Homepage) where keys are bare.

  const detectedKeyCount = detectedKeys.length;
  let persistedDetectedKeyCount = 0;
  let missingDetectedKeyCount = 0;
  const missingKeys = [];

  if (detectedKeyCount > 0) {
    for (const key of detectedKeys) {
      if (overrideContentKeys.has(key)) {
        persistedDetectedKeyCount++;
      } else {
        missingDetectedKeyCount++;
        missingKeys.push(key);
      }
    }
  }

  // Also detect orphaned overrides: DB rows whose content_key doesn't match
  // any statically-detected key. These may be stale from renamed/removed fields.
  const detectedKeySet = new Set(detectedKeys);
  const orphanedOverrides = pageOverrides.filter(r => !detectedKeySet.has(r.content_key));
  const orphanedOverrideCount = orphanedOverrides.length;

  rules.PAGE_CONTENT_KEY_PERSISTENCE = {
    status: 'pass',
    detected: detectedKeyCount,
    persisted: persistedDetectedKeyCount,
    missing: missingDetectedKeyCount,
    orphaned: orphanedOverrideCount,
    ...(orphanedOverrideCount > 0 ? { orphaned_keys: orphanedOverrides.map(r => r.content_key) } : {}),
    detail: detectedKeyCount === 0
      ? 'No detected keys to check'
      : `${persistedDetectedKeyCount}/${detectedKeyCount} detected keys have saved overrides${orphanedOverrideCount > 0 ? `, ${orphanedOverrideCount} orphaned override(s) in DB` : ''}`,
  };

  // ── TRANSLATION_STATUS_SUMMARY ──────────────────────────────
  // translation_status stores full keys: "{pageKey}.{contentKey}".
  // Filter rows whose content_key starts with "{pageKey}."
  const tsPrefix = pageKey + '.';
  const tsRows = translationStatusRows.filter(r => r.content_key.startsWith(tsPrefix));
  const tsTotal = tsRows.length;
  const tsNeedsUpdate = tsRows.filter(r => r.needs_update).length;

  rules.TRANSLATION_STATUS_SUMMARY = {
    status: 'pass',
    total_entries: tsTotal,
    needs_update: tsNeedsUpdate,
    detail: tsTotal === 0
      ? `No translation_status rows for pageKey "${pageKey}" — normal until first edit+save`
      : `${tsTotal} translation tracking entries, ${tsNeedsUpdate} needing update`,
  };

  // ── RUNTIME_PAGE_KEY_MATCH ──────────────────────────────────
  // Verify the pageKey used by the auditor matches what exists in page_content.
  // If page_content has rows for this pageKey, the mapping is confirmed.
  // If page_content has zero rows, we can't confirm but it's not an error (page may just be freshly wired).
  // Only flag an actual inconsistency if we find evidence of a different pageKey.

  if (overrideCount > 0) {
    rules.RUNTIME_PAGE_KEY_MATCH = {
      status: 'pass',
      pageKey,
      confirmed_by: `${overrideCount} row(s) in page_content with page_key="${pageKey}"`,
    };
  } else {
    rules.RUNTIME_PAGE_KEY_MATCH = {
      status: 'pass',
      pageKey,
      detail: 'No page_content rows to confirm pageKey — normal for newly wired pages',
    };
  }

  return {
    runtime: {
      override_count: overrideCount,
      detected_key_count: detectedKeyCount,
      persisted_detected_key_count: persistedDetectedKeyCount,
      missing_detected_key_count: missingDetectedKeyCount,
      orphaned_override_count: orphanedOverrideCount,
      translation_status_total: tsTotal,
      translation_needs_update_count: tsNeedsUpdate,
    },
    rules,
  };
}

// ── Rule implementations ────────────────────────────────────────────────

/**
 * Run all static rules for a single page.
 * Returns the static audit result (synchronous). Runtime is applied separately.
 */
function auditPageStatic(page, routerData) {
  const fullPath = path.join(FRONTEND_SRC, page.file);
  const isNonEditableByDesign = NON_EDITABLE_BY_DESIGN.hasOwnProperty(page.id);
  const isKeyPrefixExempt = PAGE_KEY_PREFIX_EXEMPT.hasOwnProperty(page.id);
  const rules = {};
  const issues = [];
  const warnings = [];

  // ── PAGE_IN_REGISTRY ──────────────────────────────────────
  rules.PAGE_IN_REGISTRY = { status: 'pass' };

  // ── PAGE_FILE_EXISTS ──────────────────────────────────────
  const fileExists = fs.existsSync(fullPath);
  rules.PAGE_FILE_EXISTS = fileExists
    ? { status: 'pass' }
    : { status: 'fail', detail: `File not found: ${page.file}` };
  if (!fileExists) {
    issues.push({ rule: 'PAGE_FILE_EXISTS', severity: 'error', message: `Source file missing: ${page.file}` });
  }

  // If file doesn't exist, skip remaining rules
  if (!fileExists) {
    return buildResult(page, null, null, rules, issues, warnings, [], [], 0, 0, isNonEditableByDesign);
  }

  // ── PAGE_HAS_ROUTE ────────────────────────────────────────
  const routeFound = findRouteForPage(page, routerData);
  rules.PAGE_HAS_ROUTE = routeFound
    ? { status: 'pass', route: routeFound }
    : { status: 'warn', detail: 'No matching route found in Router.tsx (may be rendered as child component)' };
  if (!routeFound && !isNonEditableByDesign) {
    warnings.push({ rule: 'PAGE_HAS_ROUTE', severity: 'warning', message: `No route found for "${page.id}" in Router.tsx` });
  }

  // ── PAGE_RENDERS_IN_PUBLIC_LAYOUT ─────────────────────────
  const inPublicLayout = routeFound
    ? routerData.publicLayoutPaths.includes(routeFound)
    : false;
  if (isNonEditableByDesign) {
    rules.PAGE_RENDERS_IN_PUBLIC_LAYOUT = { status: 'skip', reason: 'non-editable-by-design' };
  } else {
    rules.PAGE_RENDERS_IN_PUBLIC_LAYOUT = inPublicLayout
      ? { status: 'pass' }
      : { status: routeFound ? 'fail' : 'skip', detail: routeFound ? `Route ${routeFound} is NOT inside PublicLayout children block` : 'No route to check' };
    if (routeFound && !inPublicLayout && page.category === 'frontend-pages') {
      issues.push({ rule: 'PAGE_RENDERS_IN_PUBLIC_LAYOUT', severity: 'error', message: `Route "${routeFound}" is outside PublicLayout — EditModeProvider not available` });
    }
  }

  const pageKey = routeFound ? derivePageKey(routeFound) : page.id;

  // Collect sources (page file + its local imports)
  const sources = collectPageSources(fullPath);

  // ── PAGE_USES_EDITABLE_TEXT_OR_APPROVED_SHARED_EDITABLE_SECTION ──
  const editableText = scanEditableText(sources);
  const sharedSections = scanSharedSections(sources);
  const wiredSections = sharedSections.filter(s => s.hasEditKeyPrefix);
  const totalEditableFields = editableText.count + wiredSections.reduce((sum, s) => sum + s.fields.length, 0);

  if (isNonEditableByDesign) {
    rules.PAGE_USES_EDITABLE_TEXT_OR_SHARED_SECTION = {
      status: 'skip',
      reason: NON_EDITABLE_BY_DESIGN[page.id],
    };
  } else {
    const hasEditSupport = editableText.count > 0 || wiredSections.length > 0;
    rules.PAGE_USES_EDITABLE_TEXT_OR_SHARED_SECTION = hasEditSupport
      ? { status: 'pass', direct_editable_text: editableText.count, wired_shared_sections: wiredSections.length }
      : { status: 'info', detail: 'No EditableText or wired shared sections found' };
    if (!hasEditSupport && page.category === 'frontend-pages') {
      warnings.push({ rule: 'PAGE_USES_EDITABLE_TEXT_OR_SHARED_SECTION', severity: 'info', message: `No edit support detected — may be non-editable by design` });
    }
  }

  // ── SHARED_EDITABLE_SECTIONS_HAVE_EDIT_KEY_PREFIX ─────────
  const unwiredSections = sharedSections.filter(s => !s.hasEditKeyPrefix);
  if (isNonEditableByDesign || sharedSections.length === 0) {
    rules.SHARED_SECTIONS_HAVE_EDIT_KEY_PREFIX = {
      status: 'skip',
      reason: isNonEditableByDesign ? NON_EDITABLE_BY_DESIGN[page.id] : 'no shared sections found',
    };
  } else {
    rules.SHARED_SECTIONS_HAVE_EDIT_KEY_PREFIX = unwiredSections.length === 0
      ? { status: 'pass', total: sharedSections.length }
      : { status: 'warn', wired: wiredSections.length, unwired: unwiredSections.length, unwired_components: unwiredSections.map(s => s.component) };
    if (unwiredSections.length > 0) {
      warnings.push({
        rule: 'SHARED_SECTIONS_HAVE_EDIT_KEY_PREFIX',
        severity: 'warning',
        message: `${unwiredSections.length} shared section(s) missing editKeyPrefix: ${unwiredSections.map(s => s.component).join(', ')}`,
      });
    }
  }

  // ── CONTENT_KEYS_MATCH_PAGE_KEY ───────────────────────────
  const sectionKeys = expandSectionKeys(wiredSections);
  const allConcreteKeys = [
    ...editableText.contentKeys.filter(k => !k.startsWith('${')), // exclude unresolved templates
    ...sectionKeys,
  ];

  if (isNonEditableByDesign || allConcreteKeys.length === 0) {
    rules.CONTENT_KEYS_MATCH_PAGE_KEY = {
      status: 'skip',
      reason: isNonEditableByDesign ? NON_EDITABLE_BY_DESIGN[page.id] : 'no content keys to check',
    };
  } else if (isKeyPrefixExempt) {
    rules.CONTENT_KEYS_MATCH_PAGE_KEY = {
      status: 'pass',
      pageKey,
      checked: allConcreteKeys.length,
      exempt: true,
      exempt_reason: PAGE_KEY_PREFIX_EXEMPT[page.id],
    };
  } else {
    const mismatched = allConcreteKeys.filter(k => !k.startsWith(pageKey + '.'));
    rules.CONTENT_KEYS_MATCH_PAGE_KEY = mismatched.length === 0
      ? { status: 'pass', pageKey, checked: allConcreteKeys.length }
      : { status: 'warn', pageKey, mismatched };
    if (mismatched.length > 0) {
      warnings.push({
        rule: 'CONTENT_KEYS_MATCH_PAGE_KEY',
        severity: 'warning',
        message: `${mismatched.length} key(s) don't start with pageKey "${pageKey}": ${mismatched.slice(0, 5).join(', ')}${mismatched.length > 5 ? '...' : ''}`,
      });
    }
  }

  // ── CONTENT_KEYS_VALID_PATTERN ────────────────────────────
  if (isNonEditableByDesign || allConcreteKeys.length === 0) {
    rules.CONTENT_KEYS_VALID_PATTERN = {
      status: 'skip',
      reason: isNonEditableByDesign ? NON_EDITABLE_BY_DESIGN[page.id] : 'no content keys to check',
    };
  } else {
    const invalid = allConcreteKeys.filter(k => !CONTENT_KEY_PATTERN.test(k));
    rules.CONTENT_KEYS_VALID_PATTERN = invalid.length === 0
      ? { status: 'pass', checked: allConcreteKeys.length }
      : { status: 'warn', invalid };
    if (invalid.length > 0) {
      warnings.push({
        rule: 'CONTENT_KEYS_VALID_PATTERN',
        severity: 'warning',
        message: `${invalid.length} key(s) don't match expected pattern: ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? '...' : ''}`,
      });
    }
  }

  return buildResult(
    page, routeFound, pageKey, rules, issues, warnings,
    allConcreteKeys, sharedSections, totalEditableFields,
    wiredSections.length, isNonEditableByDesign
  );
}

// ── Classification ──────────────────────────────────────────────────────

function classify(rules, issues, warnings, totalEditableFields, isNonEditableByDesign) {
  if (isNonEditableByDesign) return 'non-editable-by-design';

  const hasErrors = issues.some(i => i.severity === 'error');
  if (hasErrors) return 'broken-integration';

  const hasEditSupport = rules.PAGE_USES_EDITABLE_TEXT_OR_SHARED_SECTION?.status === 'pass';
  if (!hasEditSupport) return 'non-editable-by-design';

  const hasUnwiredSections = rules.SHARED_SECTIONS_HAVE_EDIT_KEY_PREFIX?.status === 'warn';
  const hasKeyMismatches = rules.CONTENT_KEYS_MATCH_PAGE_KEY?.status === 'warn';
  if (hasUnwiredSections || hasKeyMismatches) return 'partially-editable';

  return 'editable-compliant';
}

// ── Result builder ──────────────────────────────────────────────────────

function buildResult(page, route, pageKey, rules, issues, warnings, contentKeys, sharedSections, editableFieldCount, wiredSectionCount, isNonEditableByDesign) {
  return {
    id: page.id,
    name: page.name,
    file: page.file,
    category: page.category || 'unknown',
    route: route || null,
    pageKey: pageKey || page.id,
    classification: classify(rules, issues, warnings, editableFieldCount, isNonEditableByDesign),
    editable_field_count: editableFieldCount,
    shared_section_count: wiredSectionCount,
    shared_sections: (sharedSections || []).map(s => ({
      component: s.component,
      has_edit_key_prefix: s.hasEditKeyPrefix,
      edit_key_prefix: s.editKeyPrefix,
      fields: s.fields,
    })),
    content_keys: contentKeys || [],
    rules,
    issues,
    warnings,
    runtime: null, // populated by applyRuntime
  };
}

/**
 * Apply runtime DB data to a static audit result.
 * Mutates the result in-place for efficiency.
 */
function applyRuntime(result, pageContentRows, translationStatusRows) {
  const isNonEditableByDesign = NON_EDITABLE_BY_DESIGN.hasOwnProperty(result.id);
  const { runtime, rules } = buildRuntimeAudit(
    result.pageKey,
    result.content_keys,
    isNonEditableByDesign,
    pageContentRows,
    translationStatusRows
  );
  result.runtime = runtime;
  Object.assign(result.rules, rules);
}

// ── Route matching ──────────────────────────────────────────────────────

/**
 * Find the route path for a page by matching its file against Router.tsx imports.
 */
function findRouteForPage(page, routerData) {
  const routerSource = readFileSafe(ROUTER_FILE);
  if (!routerSource) return null;

  const pageImportSuffix = page.file.replace(/\.tsx$/, '').replace(/\.ts$/, '');

  let componentName = null;
  for (const [name, importPath] of Object.entries(routerData.componentImports)) {
    if (importPath.endsWith(pageImportSuffix) || importPath.endsWith('/' + path.basename(pageImportSuffix))) {
      componentName = name;
      break;
    }
  }

  if (!componentName) return null;

  const routeRe = new RegExp(`path:\\s*['"]([^'"]+)['"][^}]*element:\\s*<${componentName}[\\s/>]`);
  const routeMatch = routeRe.exec(routerSource);
  return routeMatch ? routeMatch[1] : null;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Audit all pages in PAGE_REGISTRY with static + runtime checks.
 * Also detects unregistered page files on disk.
 */
async function auditAllPages() {
  const routerData = parseRouterFile();
  const results = [];

  // Run static audit for each registered page
  for (const page of PAGE_REGISTRY) {
    results.push(auditPageStatic(page, routerData));
  }

  // Detect unregistered page files on disk
  const registeredFiles = new Set(PAGE_REGISTRY.map(p => p.file));
  const pagesDir = path.join(FRONTEND_SRC, 'features/pages/frontend-pages');
  if (fs.existsSync(pagesDir)) {
    const diskFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
    for (const file of diskFiles) {
      const relFile = `features/pages/frontend-pages/${file}`;
      if (!registeredFiles.has(relFile)) {
        const baseName = file.replace(/\.tsx$/, '');
        const known = UNREGISTERED_KNOWN[baseName];

        if (known) {
          results.push({
            id: baseName.toLowerCase(),
            name: baseName,
            file: relFile,
            category: 'frontend-pages',
            route: null,
            pageKey: null,
            classification: 'non-editable-by-design',
            editable_field_count: 0,
            shared_section_count: 0,
            shared_sections: [],
            content_keys: [],
            rules: {
              PAGE_IN_REGISTRY: { status: 'skip', reason: `Known unregistered: ${known}` },
            },
            issues: [],
            warnings: [],
            runtime: null,
          });
        } else {
          results.push({
            id: baseName.toLowerCase(),
            name: baseName,
            file: relFile,
            category: 'frontend-pages',
            route: null,
            pageKey: null,
            classification: 'unknown',
            editable_field_count: 0,
            shared_section_count: 0,
            shared_sections: [],
            content_keys: [],
            rules: {
              PAGE_IN_REGISTRY: { status: 'fail', detail: `File "${relFile}" exists on disk but is not in PAGE_REGISTRY and not in UNREGISTERED_KNOWN` },
            },
            issues: [{ rule: 'PAGE_IN_REGISTRY', severity: 'warning', message: `Unregistered page file: ${relFile}` }],
            warnings: [],
            runtime: null,
          });
        }
      }
    }
  }

  // Apply runtime checks (single batch of DB queries for all pages)
  try {
    const { pageContentRows, translationStatusRows } = await fetchRuntimeData();
    for (const result of results) {
      applyRuntime(result, pageContentRows, translationStatusRows);
    }
  } catch (err) {
    console.error('[frontend-page-audit] Runtime DB check failed (static results still valid):', err.message);
    // Leave runtime as null — static audit is still usable
  }

  // Build summary
  const summary = {
    total_pages: results.length,
    editable_compliant: results.filter(r => r.classification === 'editable-compliant').length,
    partially_editable: results.filter(r => r.classification === 'partially-editable').length,
    non_editable_by_design: results.filter(r => r.classification === 'non-editable-by-design').length,
    broken_integration: results.filter(r => r.classification === 'broken-integration').length,
    unknown: results.filter(r => r.classification === 'unknown').length,
    total_issues: results.reduce((sum, r) => sum + r.issues.length, 0),
    total_warnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
  };

  return { summary, pages: results };
}

/**
 * Audit a single page by registry ID with static + runtime checks.
 */
async function auditSinglePage(pageId) {
  const page = PAGE_REGISTRY.find(p => p.id === pageId);
  if (!page) return null;
  const routerData = parseRouterFile();
  const result = auditPageStatic(page, routerData);

  try {
    const { pageContentRows, translationStatusRows } = await fetchRuntimeData();
    applyRuntime(result, pageContentRows, translationStatusRows);
  } catch (err) {
    console.error('[frontend-page-audit] Runtime DB check failed:', err.message);
  }

  return result;
}

/**
 * Get orphaned page_content overrides, optionally scoped to a single pageKey.
 *
 * Reuses the exact same detection logic as the audit (buildRuntimeAudit):
 *   orphaned = DB rows whose content_key ∉ statically-detected keys.
 *
 * Returns array of { page_key, content_key, content_value } grouped by page.
 * If pageKey is provided, returns only that page's orphaned overrides.
 */
async function getOrphanedOverrides(pageKey) {
  const routerData = parseRouterFile();
  const pool = getAppPool();

  // Build static key sets for each page
  const pagesToCheck = pageKey
    ? PAGE_REGISTRY.filter(p => {
        const route = findRouteForPage(p, routerData);
        const derivedKey = route ? derivePageKey(route) : p.id;
        return derivedKey === pageKey;
      })
    : PAGE_REGISTRY.filter(p => !NON_EDITABLE_BY_DESIGN.hasOwnProperty(p.id));

  const pageKeyMap = {}; // pageKey → Set of detected content keys
  for (const page of pagesToCheck) {
    const fullPath = path.join(FRONTEND_SRC, page.file);
    if (!fs.existsSync(fullPath)) continue;
    const route = findRouteForPage(page, routerData);
    const derivedKey = route ? derivePageKey(route) : page.id;
    const sources = collectPageSources(fullPath);
    const editableText = scanEditableText(sources);
    const sharedSections = scanSharedSections(sources);
    const wiredSections = sharedSections.filter(s => s.hasEditKeyPrefix);
    const sectionKeys = expandSectionKeys(wiredSections);
    const allConcreteKeys = [
      ...editableText.contentKeys.filter(k => !k.startsWith('${')),
      ...sectionKeys,
    ];
    pageKeyMap[derivedKey] = new Set(allConcreteKeys);
  }

  // Fetch page_content rows (with values for preview)
  const whereClause = pageKey ? 'WHERE page_key = ?' : '';
  const params = pageKey ? [pageKey] : [];
  const [rows] = await pool.query(
    `SELECT page_key, content_key, content_value FROM page_content ${whereClause} ORDER BY page_key, content_key`,
    params
  );

  // Filter to orphaned only
  const orphaned = [];
  for (const row of rows) {
    const detectedKeys = pageKeyMap[row.page_key];
    if (!detectedKeys) continue; // page not in our check set
    if (!detectedKeys.has(row.content_key)) {
      orphaned.push({
        page_key: row.page_key,
        content_key: row.content_key,
        content_value: row.content_value,
      });
    }
  }

  return orphaned;
}

/**
 * Delete specific orphaned page_content overrides for a page.
 *
 * Safety: re-validates that each requested key is actually orphaned at deletion
 * time by re-running the audit detection logic. Keys that are no longer orphaned
 * are skipped and reported.
 *
 * @param {string} pageKey - The page_key to scope deletion to
 * @param {string[]} keys - Content keys to delete
 * @param {object} actor - { userId, username } for audit logging
 * @returns {{ deleted_count, deleted_keys, skipped_keys, skipped_reason }}
 */
async function deleteOrphanedOverrides(pageKey, keys, actor) {
  if (!pageKey || !Array.isArray(keys) || keys.length === 0) {
    throw new Error('pageKey and non-empty keys array are required');
  }

  // Re-validate: get current orphaned set for this page
  const currentOrphaned = await getOrphanedOverrides(pageKey);
  const orphanedSet = new Set(currentOrphaned.map(r => r.content_key));

  const toDelete = [];
  const skipped = [];
  for (const key of keys) {
    if (orphanedSet.has(key)) {
      toDelete.push(key);
    } else {
      skipped.push(key);
    }
  }

  if (toDelete.length === 0) {
    return {
      deleted_count: 0,
      deleted_keys: [],
      skipped_keys: skipped,
      skipped_reason: 'Keys are no longer orphaned (may have been re-mapped or already deleted)',
    };
  }

  const pool = getAppPool();

  // Capture values before deletion for audit log
  const placeholders = toDelete.map(() => '?').join(', ');
  const [deletedRows] = await pool.query(
    `SELECT content_key, content_value FROM page_content WHERE page_key = ? AND content_key IN (${placeholders})`,
    [pageKey, ...toDelete]
  );

  // Delete
  await pool.query(
    `DELETE FROM page_content WHERE page_key = ? AND content_key IN (${placeholders})`,
    [pageKey, ...toDelete]
  );

  // Log to system_logs
  try {
    await pool.query(
      `INSERT INTO system_logs (level, message, meta) VALUES (?, ?, ?)`,
      [
        'info',
        `[page-edit-audit] Deleted ${toDelete.length} orphaned override(s) for page "${pageKey}"`,
        JSON.stringify({
          action: 'delete_orphaned_overrides',
          page_key: pageKey,
          deleted_keys: toDelete,
          deleted_values: deletedRows.map(r => ({ key: r.content_key, value: r.content_value })),
          skipped_keys: skipped,
          actor: actor || null,
        }),
      ]
    );
  } catch (logErr) {
    console.error('[page-edit-audit] Failed to write audit log:', logErr.message);
  }

  return {
    deleted_count: toDelete.length,
    deleted_keys: toDelete,
    skipped_keys: skipped,
    ...(skipped.length > 0 ? { skipped_reason: 'Keys are no longer orphaned' } : {}),
  };
}

// ── Edit Mode Candidate Detection ──────────────────────────────────────

/**
 * Count translatable strings in source files.
 * Looks for:
 *   - i18n t('key') / t("key") calls
 *   - Hardcoded string literals in JSX (>20 chars, not className/style/etc.)
 * Returns { i18nCallCount, hardcodedStringCount, totalTranslatable, usesI18n }.
 */
function countStaticText(sources) {
  let i18nCallCount = 0;
  let hardcodedStringCount = 0;
  let usesI18n = false;

  for (const { source } of sources) {
    // Check for useTranslation import
    if (/useTranslation/.test(source)) usesI18n = true;

    // Count t('...') and t("...") calls
    const tCallRe = /\bt\(\s*['"][^'"]{2,}['"]/g;
    let m;
    while ((m = tCallRe.exec(source)) !== null) {
      i18nCallCount++;
    }

    // Count hardcoded string content in JSX (between > and <)
    // Only strings longer than 20 chars that aren't just whitespace
    const jsxTextRe = />([^<>{]{20,})</g;
    while ((m = jsxTextRe.exec(source)) !== null) {
      const text = m[1].trim();
      if (text.length >= 20 && !/^\s*$/.test(text) && !/^[{}\s]+$/.test(text)) {
        hardcodedStringCount++;
      }
    }
  }

  return {
    i18nCallCount,
    hardcodedStringCount,
    totalTranslatable: i18nCallCount + hardcodedStringCount,
    usesI18n,
  };
}

/**
 * Check if a page is primarily data-driven (content from API, not static).
 * Signals: useEffect + apiClient/axios fetch patterns that populate main content.
 * Returns boolean.
 */
function isDataDriven(sources) {
  let hasApiFetch = false;
  let hasUseEffect = false;

  for (const { source } of sources) {
    if (/useEffect/.test(source)) hasUseEffect = true;
    if (/apiClient\.(get|post|put|delete)\s*\(/.test(source)) hasApiFetch = true;
    if (/axios\.(get|post|put|delete)\s*\(/.test(source)) hasApiFetch = true;
    if (/useSWR|useQuery|fetchData/.test(source)) hasApiFetch = true;
  }

  return hasUseEffect && hasApiFetch;
}

/**
 * Check if a route path is excluded from candidate detection.
 */
function isExcludedRoute(routePath) {
  return CANDIDATE_EXCLUDED_ROUTES.hasOwnProperty(routePath);
}

/**
 * Resolve a Router.tsx import path to an absolute filesystem path.
 * Handles relative paths (../), @/ alias, and bare paths.
 */
function resolveRouterImport(importPath) {
  let absoluteImportPath;
  if (importPath.startsWith('.')) {
    absoluteImportPath = path.resolve(path.dirname(ROUTER_FILE), importPath);
  } else if (importPath.startsWith('@/')) {
    absoluteImportPath = path.join(FRONTEND_SRC, importPath.slice(2));
  } else {
    absoluteImportPath = path.resolve(path.dirname(ROUTER_FILE), importPath);
  }
  return resolveFilePath(absoluteImportPath);
}

/**
 * Detect public-facing pages that are candidates for Edit Mode conversion.
 *
 * Scans ALL routes inside BlankLayout (the public/unauthenticated tree) in
 * Router.tsx, filtering out non-content routes via CANDIDATE_EXCLUDED_ROUTES.
 * This covers both PublicLayout children and legacy public pages outside it.
 *
 * Each page is classified based on deterministic signals:
 *   S1: Public-facing route in BlankLayout (required)
 *   S2: Not already edit-mode compliant (no EditableText or wired shared sections)
 *   S3: Has substantial static text (≥5 translatable strings) → +3
 *   S4: Uses i18n (useTranslation or useLanguage) → +2
 *   S5: Not data-driven (no primary API fetch pattern) → +1
 *   Bonus: Under PublicLayout (EditModeProvider already available) → +1
 *
 * Classifications:
 *   - conversion-candidate: S1+S2 and score ≥ 4
 *   - low-priority-candidate: S1+S2 and score 1-3
 *   - already-compliant: Has EditableText or wired shared sections
 *   - non-candidate: In NON_EDITABLE_BY_DESIGN
 *   - excluded: Route in CANDIDATE_EXCLUDED_ROUTES (not a content page)
 *   - needs-investigation: File not found or parse error
 *
 * @returns {{ summary, candidates }}
 */
function detectCandidates() {
  const routerSource = readFileSafe(ROUTER_FILE);
  if (!routerSource) {
    return { summary: { error: 'Could not read Router.tsx' }, candidates: [] };
  }

  const routerData = parseRouterFile();
  const publicLayoutSet = new Set(routerData.publicLayoutPaths);
  const candidates = [];

  // Deduplicate routes (e.g., /samples and /frontend-pages/samples → same component)
  const seenComponents = new Set();

  for (const routePath of routerData.blankLayoutPaths) {
    const pageKey = derivePageKey(routePath);

    // Skip excluded routes (auth, redirects, utility viewers, etc.)
    if (isExcludedRoute(routePath)) {
      candidates.push({
        route: routePath,
        pageKey,
        component: null,
        classification: 'excluded',
        score: 0,
        signals: {},
        rationale: `Excluded: ${CANDIDATE_EXCLUDED_ROUTES[routePath]}`,
        inPublicLayout: false,
      });
      continue;
    }

    // Find the component name for this route
    const routeEscaped = routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const elementRe = new RegExp(`path:\\s*['"]${routeEscaped}['"][^}]*element:\\s*<(\\w+)`);
    const elementMatch = elementRe.exec(routerSource);
    if (!elementMatch) {
      candidates.push({
        route: routePath,
        pageKey,
        component: null,
        classification: 'needs-investigation',
        score: 0,
        signals: {},
        rationale: 'Could not determine component for this route',
        inPublicLayout: publicLayoutSet.has(routePath),
      });
      continue;
    }

    const componentName = elementMatch[1];

    // Skip Navigate (redirect) components
    if (componentName === 'Navigate') {
      candidates.push({
        route: routePath,
        pageKey,
        component: 'Navigate',
        classification: 'excluded',
        score: 0,
        signals: {},
        rationale: 'Redirect route (Navigate)',
        inPublicLayout: false,
      });
      continue;
    }

    // Deduplicate: if we've already analyzed this component, add a reference entry
    if (seenComponents.has(componentName)) {
      const original = candidates.find(c => c.component === componentName && c.classification !== 'excluded');
      if (original) {
        candidates.push({
          route: routePath,
          pageKey,
          component: componentName,
          file: original.file,
          registryId: original.registryId,
          classification: original.classification,
          score: original.score,
          signals: original.signals,
          rationale: `Duplicate route for ${componentName} (see ${original.route})`,
          inPublicLayout: publicLayoutSet.has(routePath),
          duplicateOf: original.route,
        });
      }
      continue;
    }
    seenComponents.add(componentName);

    // Resolve component to file path
    const importPath = routerData.componentImports[componentName];
    if (!importPath) {
      candidates.push({
        route: routePath,
        pageKey,
        component: componentName,
        classification: 'needs-investigation',
        score: 0,
        signals: {},
        rationale: `Could not resolve import path for ${componentName}`,
        inPublicLayout: publicLayoutSet.has(routePath),
      });
      continue;
    }

    const resolvedFile = resolveRouterImport(importPath);
    if (!resolvedFile || !fs.existsSync(resolvedFile)) {
      candidates.push({
        route: routePath,
        pageKey,
        component: componentName,
        classification: 'needs-investigation',
        score: 0,
        signals: {},
        rationale: `Source file not found for ${componentName}`,
        inPublicLayout: publicLayoutSet.has(routePath),
      });
      continue;
    }

    const relFile = path.relative(FRONTEND_SRC, resolvedFile);
    const inPublicLayout = publicLayoutSet.has(routePath);

    // Check if in NON_EDITABLE_BY_DESIGN (by matching PAGE_REGISTRY id)
    const registryEntry = PAGE_REGISTRY.find(p => p.file === relFile);
    if (registryEntry && NON_EDITABLE_BY_DESIGN.hasOwnProperty(registryEntry.id)) {
      candidates.push({
        route: routePath,
        pageKey,
        component: componentName,
        file: relFile,
        registryId: registryEntry.id,
        classification: 'non-candidate',
        score: 0,
        signals: {},
        rationale: `Non-editable by design: ${NON_EDITABLE_BY_DESIGN[registryEntry.id]}`,
        inPublicLayout,
      });
      continue;
    }

    // Collect source files
    const sources = collectPageSources(resolvedFile);

    // Check if already edit-mode compliant
    const editableText = scanEditableText(sources);
    const sharedSections = scanSharedSections(sources);
    const wiredSections = sharedSections.filter(s => s.hasEditKeyPrefix);
    const hasEditSupport = editableText.count > 0 || wiredSections.length > 0;

    if (hasEditSupport) {
      candidates.push({
        route: routePath,
        pageKey,
        component: componentName,
        file: relFile,
        registryId: registryEntry?.id || null,
        classification: 'already-compliant',
        score: 0,
        signals: {
          editableTextCount: editableText.count,
          wiredSharedSections: wiredSections.length,
        },
        rationale: `Already has ${editableText.count} EditableText usage(s) and ${wiredSections.length} wired shared section(s)`,
        inPublicLayout,
      });
      continue;
    }

    // Score the candidate
    const textAnalysis = countStaticText(sources);
    const dataDriven = isDataDriven(sources);

    let score = 0;
    const signals = {
      hasSubstantialText: textAnalysis.totalTranslatable >= 5,
      totalTranslatable: textAnalysis.totalTranslatable,
      i18nCallCount: textAnalysis.i18nCallCount,
      hardcodedStringCount: textAnalysis.hardcodedStringCount,
      usesI18n: textAnalysis.usesI18n,
      isDataDriven: dataDriven,
      unwiredSharedSections: sharedSections.length - wiredSections.length,
      inPublicLayout,
    };

    if (textAnalysis.totalTranslatable >= 5) score += 3; // S3: substantial text
    if (textAnalysis.usesI18n) score += 2;               // S4: uses i18n
    if (!dataDriven) score += 1;                          // S5: not data-driven
    if (inPublicLayout) score += 1;                       // Bonus: EditModeProvider already available

    const classification = score >= 4 ? 'conversion-candidate' : 'low-priority-candidate';

    // Build rationale
    const reasons = [];
    if (textAnalysis.totalTranslatable >= 5) {
      reasons.push(`${textAnalysis.totalTranslatable} translatable strings (${textAnalysis.i18nCallCount} i18n + ${textAnalysis.hardcodedStringCount} hardcoded)`);
    } else {
      reasons.push(`only ${textAnalysis.totalTranslatable} translatable string(s)`);
    }
    if (textAnalysis.usesI18n) reasons.push('uses i18n');
    if (dataDriven) reasons.push('data-driven (lower priority)');
    if (!inPublicLayout) reasons.push('NOT under PublicLayout (would need EditModeProvider)');
    if (sharedSections.length > 0) reasons.push(`${sharedSections.length} shared section(s) without editKeyPrefix`);

    candidates.push({
      route: routePath,
      pageKey,
      component: componentName,
      file: relFile,
      registryId: registryEntry?.id || null,
      classification,
      score,
      signals,
      rationale: reasons.join('; '),
      inPublicLayout,
      recommended_action: classification === 'conversion-candidate'
        ? inPublicLayout
          ? 'Add editKeyPrefix props to shared sections and/or wrap static text with EditableText'
          : 'Move route under PublicLayout first, then add EditableText/shared section wiring'
        : 'Low priority — review if content grows or page becomes more prominent',
    });
  }

  // Summary (exclude 'excluded' from totals — they aren't public content pages)
  const contentCandidates = candidates.filter(c => c.classification !== 'excluded');
  const summary = {
    total_public_routes: routerData.blankLayoutPaths.length,
    excluded_non_content: candidates.filter(c => c.classification === 'excluded').length,
    evaluated_content_pages: contentCandidates.length,
    already_compliant: contentCandidates.filter(c => c.classification === 'already-compliant').length,
    conversion_candidates: contentCandidates.filter(c => c.classification === 'conversion-candidate').length,
    low_priority_candidates: contentCandidates.filter(c => c.classification === 'low-priority-candidate').length,
    non_candidates: contentCandidates.filter(c => c.classification === 'non-candidate').length,
    needs_investigation: contentCandidates.filter(c => c.classification === 'needs-investigation').length,
  };

  return { summary, candidates };
}

module.exports = {
  auditAllPages,
  auditSinglePage,
  getOrphanedOverrides,
  deleteOrphanedOverrides,
  detectCandidates,
  // Exported for testing
  derivePageKey,
  APPROVED_SHARED_SECTIONS,
  NON_EDITABLE_BY_DESIGN,
  CANDIDATE_EXCLUDED_ROUTES,
  PAGE_KEY_PREFIX_EXEMPT,
  UNREGISTERED_KNOWN,
};
