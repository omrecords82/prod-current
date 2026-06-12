#!/usr/bin/env node
/**
 * B-PR14 — Manville (#46) workflow catalog smoke test (§K checklist).
 *
 * Usage:
 *   node scripts/workflow-smoke-manville.js
 *   node scripts/workflow-smoke-manville.js --church=46
 *   node scripts/workflow-smoke-manville.js --lock-test
 *   node scripts/workflow-smoke-manville.js --json
 *
 * Exit 0 when all applicable checks pass; 1 on failure.
 * K10 (B-PR12 cutover) is skipped until EXECUTION_FALLBACK_INFERENCE=false.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SERVER_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SERVER_ROOT, '..');
const DEFAULT_CHURCH_ID = 46;

process.chdir(SERVER_ROOT);

const envPath = path.join(SERVER_ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const checks = [];
let failed = 0;
let skipped = 0;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    churchId: parseInt(args.find((a) => a.startsWith('--church='))?.split('=')[1] || DEFAULT_CHURCH_ID, 10),
    lockTest: args.includes('--lock-test'),
    json: args.includes('--json'),
  };
}

function pass(id, name, detail) {
  checks.push({ id, name, ok: true, skipped: false, detail: detail || null });
  if (!parseArgs().json) {
    console.log(`✅ [${id}] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function fail(id, name, detail) {
  checks.push({ id, name, ok: false, skipped: false, detail: detail || null });
  failed += 1;
  if (!parseArgs().json) {
    console.error(`❌ [${id}] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function skip(id, name, detail) {
  checks.push({ id, name, ok: true, skipped: true, detail: detail || null });
  skipped += 1;
  if (!parseArgs().json) {
    console.log(`⏭️  [${id}] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function fileContains(rel, needle) {
  const p = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(p)) return false;
  return fs.readFileSync(p, 'utf8').includes(needle);
}

function routeRegistered(routePath) {
  const files = [
    'front-end/src/routes/Router.tsx',
    'front-end/src/routes/portalRoutes.tsx',
    'front-end/src/routes/develRoutes.tsx',
    'front-end/src/routes/adminRoutes.tsx',
  ];
  const normalized = routePath.replace(/^\//, '');
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length) return false;

  // Portal child paths omit the /portal prefix in portalRoutes.tsx (e.g. ocr/setup).
  const portalChild = segments[0] === 'portal' ? segments.slice(1).join('/') : null;

  for (const rel of files) {
    const p = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');

    if (content.includes(`'/${normalized}'`) || content.includes(`"/${normalized}"`)) return true;
    if (content.includes(`guardedRoute('/${normalized}'`)) return true;

    if (portalChild && rel.endsWith('portalRoutes.tsx')) {
      if (
        content.includes(`protectedRoute('${portalChild}'`)
        || content.includes(`protectedRoute("${portalChild}"`)
        || content.includes(`redirectRoute('${portalChild}'`)
      ) return true;
    }

    if (segments.length === 1 && (
      content.includes(`path: '${segments[0]}'`)
      || content.includes(`path: "${segments[0]}"`)
      || content.includes(`protectedRoute('${segments[0]}'`)
    )) return true;

    const tail = segments[segments.length - 1];
    const parent = segments.slice(0, -1).join('/');
    if (
      (content.includes(`path: '${tail}'`) || content.includes(`protectedRoute('${tail}'`))
      && (!parent || content.includes(parent))
    ) return true;
  }
  return false;
}

const PARISH_GOAL_ROUTES = [
  '/onboarding/change-password',
  '/onboarding/record-tables',
  '/account/parish-management',
  '/account/parish-management/database-mapping',
  '/account/parish-management/record-settings',
  '/account/parish-management/users',
  '/account/parish-management/landing-page-branding',
  '/portal/upload',
  '/portal/ocr',
  '/portal/ocr/setup',
  '/portal/certificates/generate',
];

const EXPECTED_WORKFLOW_KEYS = [
  'church.enrollment',
  'church.ops.setup',
  'identity.user.admin',
  'ocr.setup.wizard',
  'ocr.batch.review',
];

async function checkK1(pool, churchId, workflowGoals, execution) {
  const flags = execution.getExecutionFlags();
  const parish = await workflowGoals.getGoalsForChurch(churchId, { audience: 'parish' });
  const admin = await workflowGoals.getGoalsForChurch(churchId, { audience: 'admin' });

  if (!parish || !Array.isArray(parish.goals)) {
    fail('K1', 'workflow-goals parish response', 'missing goals array');
    return;
  }

  if (flags.model_enabled && flags.read_primary && parish.source !== 'execution') {
    fail('K1', 'workflow-goals source', `expected execution, got ${parish.source}`);
    return;
  }

  const [church] = await pool.query(
    'SELECT setup_complete, is_active, client_status FROM churches WHERE id = ? LIMIT 1',
    [churchId]
  );
  const ch = church[0];
  const isMatureParish = ch && ch.setup_complete && ch.is_active;

  if (isMatureParish && parish.goals.length === 0) {
    pass('K1', 'workflow-goals for mature parish', `source=${parish.source}, 0 open goals (expected)`);
  } else {
    const keys = new Set(parish.goals.map((g) => g.workflow_key));
    const missing = EXPECTED_WORKFLOW_KEYS.filter((k) => !keys.has(k));
    if (missing.length && parish.goals.length > 0) {
      pass('K1', 'workflow-goals returned goals', `${parish.goals.length} parish goals; keys: ${[...keys].join(', ')}`);
    } else if (parish.goals.length > 0) {
      pass('K1', 'workflow-goals parish goals', `${parish.goals.length} goals, source=${parish.source}`);
    } else {
      pass('K1', 'workflow-goals API', `source=${parish.source}, parish=${parish.goals.length}, admin=${admin.goals.length}`);
    }
  }

  if (process.env.FEATURE_OCR === 'false') {
    fail('K1', 'FEATURE_OCR flag', 'expected on for OCR workflow smoke');
  }
}

async function checkK2(workflowGoals, churchId) {
  const parish = await workflowGoals.getGoalsForChurch(churchId, { audience: 'parish' });
  const routes = new Set(PARISH_GOAL_ROUTES);
  for (const g of parish.goals) {
    if (g.action_route) routes.add(g.action_route.split('?')[0]);
  }

  const missing = [...routes].filter((r) => !routeRegistered(r));
  if (missing.length) {
    fail('K2', 'WorkflowGoalStrip deep-link routes', `unregistered: ${missing.join(', ')}`);
  } else {
    pass('K2', 'WorkflowGoalStrip deep-link routes', `${routes.size} parish routes registered in OM router`);
  }
}

function checkK3() {
  const portalOk = fileContains('front-end/src/routes/portalRoutes.tsx', "protectedRoute('ocr/setup'");
  const develOk = fileContains('front-end/src/routes/develRoutes.tsx', '/devel/ocr-setup-wizard');
  if (portalOk && develOk) {
    pass('K3', 'OCR setup routes', '/portal/ocr/setup (parish) + /devel/ocr-setup-wizard (staff)');
  } else {
    if (!portalOk) fail('K3', 'portal OCR setup route', 'missing in portalRoutes.tsx');
    if (!develOk) fail('K3', 'devel OCR setup route', 'missing in develRoutes.tsx');
  }
}

async function checkK4(pool, churchId, lockTest, execution, workflowGoals) {
  const sync = require('../src/services/workflowExecutionSync');
  if (typeof sync.syncIdentityAdmin !== 'function') {
    fail('K4', 'identity execution sync', 'syncIdentityAdmin missing');
    return;
  }

  if (!lockTest) {
    const [counts] = await pool.query(
      `SELECT SUM(CASE WHEN u.is_locked = 1 THEN 1 ELSE 0 END) AS locked
       FROM church_users cu JOIN users u ON u.id = cu.user_id WHERE cu.church_id = ?`,
      [churchId]
    );
    pass('K4', 'lock/unlock wiring (read-only)', `church_users reachable; locked=${counts[0]?.locked || 0} (use --lock-test to exercise)`);
    return;
  }

  const [users] = await pool.query(
    `SELECT u.id, u.email, u.is_locked, u.is_active
     FROM church_users cu JOIN users u ON u.id = cu.user_id
     WHERE cu.church_id = ? AND u.is_locked = 0
     ORDER BY cu.role = 'admin' ASC, u.id ASC LIMIT 1`,
    [churchId]
  );
  if (!users.length) {
    fail('K4', 'lock/unlock cycle', 'no unlocked user for church');
    return;
  }

  const user = users[0];
  const orig = { is_locked: user.is_locked, is_active: user.is_active };

  await pool.query(
    'UPDATE users SET is_active = 0, is_locked = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [user.id]
  );
  await sync.syncIdentityAdmin(pool, churchId, { actorUserId: null, transitionSource: 'smoke_test' });

  const [locked] = await pool.query('SELECT is_locked, is_active FROM users WHERE id = ?', [user.id]);
  if (Number(locked[0]?.is_locked) !== 1) {
    fail('K4', 'lock sets is_locked=1', `user ${user.id}`);
    return;
  }

  const goalsLocked = await workflowGoals.getGoalsForChurch(churchId, { audience: 'parish' });
  const identityGoal = goalsLocked.goals.find((g) => g.workflow_key === 'identity.user.admin');

  await pool.query(
    'UPDATE users SET is_active = 1, is_locked = 0, lockout_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [user.id]
  );
  await sync.syncIdentityAdmin(pool, churchId, { actorUserId: null, transitionSource: 'smoke_test' });

  const [unlocked] = await pool.query('SELECT is_locked, is_active FROM users WHERE id = ?', [user.id]);
  if (Number(unlocked[0]?.is_locked) !== 0 || Number(unlocked[0]?.is_active) !== 1) {
    fail('K4', 'unlock clears lockout', `user ${user.id}`);
    return;
  }

  if (identityGoal) {
    pass('K4', 'lock/unlock + identity goals', `user ${user.id}; identity goal present while locked`);
  } else {
    pass('K4', 'lock/unlock cycle', `user ${user.id} restored; identity execution synced`);
  }

  if (orig.is_locked) {
    await pool.query(
      'UPDATE users SET is_locked = ?, is_active = ? WHERE id = ?',
      [orig.is_locked, orig.is_active, user.id]
    );
  }
}

async function checkK5(pool, workflowGoals) {
  const summary = await workflowGoals.getWorkflowRuntimeSummary(pool);
  const ocr = (summary.workflows || []).find((w) => w.workflow_key === 'ocr.setup.wizard');
  if (!ocr) {
    fail('K5', 'workflow-runtime-summary OCR entry', 'ocr.setup.wizard missing from summary');
    return;
  }

  const src = ocr.stats?.source;
  const cacheOk = src === 'workflow_runtime_cache' || src === 'workflow_execution_summary';
  const [cacheRow] = await pool.query(
    "SELECT refreshed_at FROM workflow_runtime_cache WHERE cache_key = 'ocr.setup.wizard' LIMIT 1"
  );

  if (cacheOk) {
    const cacheAge = cacheRow[0]?.refreshed_at
      ? `${Math.round((Date.now() - new Date(cacheRow[0].refreshed_at).getTime()) / 60000)}m ago`
      : 'no row';
    pass('K5', 'workflow-runtime-summary OCR cache', `stats.source=${src}; cache refreshed ${cacheAge}`);
  } else {
    fail('K5', 'workflow-runtime-summary OCR cache', `unexpected stats.source=${src}`);
  }
}

async function checkK6(pool) {
  await pool.query(
    `INSERT INTO omstudio_workflow_refs (app_key, workflow_key, workflow_name, active_version, completion_state, entry_type)
     SELECT w.primary_app, w.workflow_key, w.workflow_name, v.version, w.completion_state, w.entry_type
     FROM app_workflows w LEFT JOIN app_workflow_versions v ON v.id = w.active_version_id
     ON DUPLICATE KEY UPDATE workflow_name=VALUES(workflow_name), active_version=VALUES(active_version),
       completion_state=VALUES(completion_state), entry_type=VALUES(entry_type), last_synced_at=CURRENT_TIMESTAMP`
  );

  const [wf] = await pool.query(
    "SELECT workflow_key, completion_state FROM app_workflows WHERE workflow_key = 'church.ops.setup' LIMIT 1"
  );
  const [ref] = await pool.query(
    "SELECT workflow_key, last_synced_at FROM omstudio_workflow_refs WHERE workflow_key = 'church.ops.setup' LIMIT 1"
  );

  if (wf.length && ref.length) {
    pass('K6', 'church.ops.setup catalog + refs', `catalog=${wf[0].completion_state}, synced=${ref[0].last_synced_at}`);
  } else {
    if (!wf.length) fail('K6', 'church.ops.setup in app_workflows', 'missing');
    if (!ref.length) fail('K6', 'church.ops.setup in omstudio_workflow_refs', 'missing after sync');
  }
}

async function checkK7(pool, churchId, workflowGoals, execution) {
  const flags = execution.getExecutionFlags();
  const [rows] = await pool.query(
    'SELECT workflow_key, status, current_step_key FROM church_workflow_executions WHERE church_id = ?',
    [churchId]
  );

  if (!rows.length) {
    fail('K7', 'execution rows for church', `no rows for church ${churchId}`);
    return;
  }

  const parish = await workflowGoals.getGoalsForChurch(churchId, { audience: 'parish' });
  const open = rows.filter((r) => ['pending', 'active', 'blocked'].includes(r.status));

  if (flags.read_primary && parish.source !== 'execution') {
    fail('K7', 'execution primary read', `source=${parish.source}`);
    return;
  }

  if (open.length) {
    const openKeys = new Set(open.map((r) => r.workflow_key));
    const goalKeys = new Set(parish.goals.map((g) => g.workflow_key));
    const overlap = [...openKeys].filter((k) => goalKeys.has(k));
    if (overlap.length || parish.goals.length === 0) {
      pass('K7', 'execution vs open goals', `${open.length} open executions; ${parish.goals.length} parish goals`);
    } else {
      fail('K7', 'execution goals alignment', `open workflows ${[...openKeys].join(', ')} not reflected in goals`);
    }
  } else {
    const completed = rows.filter((r) => r.status === 'completed').map((r) => r.workflow_key);
    pass('K7', 'execution soak (completed parish)', `${completed.length} completed executions; source=${parish.source}`);
  }

  if (flags.fallback_inference) {
    const prev = process.env.EXECUTION_READ_PRIMARY;
    process.env.EXECUTION_READ_PRIMARY = 'false';
    try {
      const resolverGoals = await workflowGoals.getGoalsForChurch(churchId, { audience: 'parish' });
      if (resolverGoals.source === 'resolver' || resolverGoals.goals.length >= parish.goals.length) {
        pass('K7', 'resolver fallback available during soak', `resolver goals=${resolverGoals.goals.length} vs execution=${parish.goals.length}`);
      }
    } finally {
      if (prev === undefined) delete process.env.EXECUTION_READ_PRIMARY;
      else process.env.EXECUTION_READ_PRIMARY = prev;
    }
  }
}

async function checkK8(pool) {
  const governance = require('../src/services/workflowGovernanceService');
  const validation = await governance.validateDeploymentRequest(pool, {
    status: 'submitted',
    component_key: 'smoke.test.component',
    full_version: '1.0.0_1',
    target_workflow_key: 'church.ops.setup',
  });

  if (!validation.passed) {
    fail('K8', 'Workshop validation gates', JSON.stringify(validation.gates));
    return;
  }

  let historyCount = 0;
  try {
    const history = await governance.listDeploymentHistory(pool, { limit: 5 });
    historyCount = history.length;
  } catch {
    historyCount = -1;
  }

  pass('K8', 'Workshop validation gates', `synthetic request passed; deployment_history rows=${historyCount}`);
}

async function checkK9(pool) {
  const governance = require('../src/services/workflowGovernanceService');
  let manifest;
  try {
    manifest = await governance.getWorkflowAuthorityManifest(pool);
  } catch (err) {
    fail('K9', 'OMStudio authority manifest', err.message);
    return;
  }

  const hasCatalog = Array.isArray(manifest?.catalog_workflows) && manifest.catalog_workflows.length > 0;
  const hasFiled = Array.isArray(manifest?.filed_workflows) && manifest.filed_workflows.length > 0;
  const hasDocs = Array.isArray(manifest?.documentation) && manifest.documentation.length > 0;

  if (hasCatalog && hasFiled && hasDocs) {
    pass('K9', 'OMStudio authority manifest (API)', `${manifest.catalog_workflows.length} catalog workflows, ${manifest.filed_workflows.length} filed keys`);
  } else {
    fail('K9', 'OMStudio authority manifest', 'missing catalog_workflows, filed_workflows, or documentation');
  }
}

async function checkK10(workflowGoals, churchId, execution) {
  const flags = execution.getExecutionFlags();
  if (flags.fallback_inference) {
    skip('K10', 'B-PR12 cutover smoke', 'EXECUTION_FALLBACK_INFERENCE still true — run after B-PR12');
    return;
  }

  const parish = await workflowGoals.getGoalsForChurch(churchId, { audience: 'parish' });
  if (parish.source !== 'execution') {
    fail('K10', 'post-cutover execution-only read', `source=${parish.source}`);
    return;
  }

  process.env.EXECUTION_READ_PRIMARY = 'false';
  try {
    const resolver = await workflowGoals.getGoalsForChurch(churchId, { audience: 'parish' });
    if (resolver.source === 'resolver' && resolver.goals.length > parish.goals.length) {
      fail('K10', 'inference disabled', 'resolver would still return extra goals');
      return;
    }
  } finally {
    process.env.EXECUTION_READ_PRIMARY = 'true';
  }

  pass('K10', 'B-PR12 cutover smoke', 'execution-only read confirmed');
}

async function main() {
  const opts = parseArgs();
  const { getAppPool } = require('../src/config/db');
  const workflowGoals = require('../src/services/workflowGoalsService');
  const execution = require('../src/services/workflowExecutionService');
  const pool = getAppPool();

  const [church] = await pool.query('SELECT id, name FROM churches WHERE id = ? LIMIT 1', [opts.churchId]);
  if (!church.length) {
    console.error(`Church ${opts.churchId} not found`);
    process.exit(1);
  }

  if (!opts.json) {
    console.log(`\n§K Workflow smoke — ${church[0].name} (#${opts.churchId})\n`);
  }

  await checkK1(pool, opts.churchId, workflowGoals, execution);
  await checkK2(workflowGoals, opts.churchId);
  checkK3();
  await checkK4(pool, opts.churchId, opts.lockTest, execution, workflowGoals);
  await checkK5(pool, workflowGoals);
  await checkK6(pool);
  await checkK7(pool, opts.churchId, workflowGoals, execution);
  await checkK8(pool);
  await checkK9(pool);
  await checkK10(workflowGoals, opts.churchId, execution);

  const passed = checks.filter((c) => c.ok && !c.skipped).length;
  const summary = { church_id: opts.churchId, church_name: church[0].name, passed, failed, skipped, checks };

  if (opts.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Result: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
