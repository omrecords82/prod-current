/**
 * Workflow Goals — resolves catalog steps + live runtime into actionable goals.
 *
 * ADDING A NEW WORKFLOW (no gaps):
 * 1. File workflow in app_workflows* (migration or admin seed) with steps + route_entrypoints.
 * 2. Register a runtime resolver in RUNTIME_RESOLVERS below.
 * 3. Optionally add STEP_ACTION_ROUTES for parish/admin deep links.
 * 4. Goals appear automatically on GET /api/workflow-goals and admin enrollment detail.
 */
const catalog = require('./workflowCatalogService');

/** onboarding_requests.status → catalog step_key */
const ENROLLMENT_STATUS_TO_STEP = {
  submitted: 'submit_enrollment',
  reviewing: 'staff_review',
  payment_pending: 'payment',
  payment_received: 'payment',
  provisioning: 'provision_tenant',
  admin_account_created: 'create_admin_account',
  awaiting_first_login: 'await_first_login',
  record_tables_review: 'configure_record_tables',
  active: 'activate_parish',
  rejected: null,
  cancelled: null,
};

/** Per-step action routes (OM app paths). Extend when filing new workflows. */
const STEP_ACTION_ROUTES = {
  'church.enrollment': {
    submit_enrollment: { route: '/enroll', label: 'View enrollment', audience: 'admin' },
    staff_review: { route: '/admin/onboarding', label: 'Review enrollment', audience: 'admin' },
    payment: { route: '/admin/onboarding', label: 'Manage payment', audience: 'admin' },
    provision_tenant: { route: '/admin/onboarding', label: 'Provisioning status', audience: 'admin' },
    create_admin_account: { route: '/admin/onboarding', label: 'Admin account', audience: 'admin' },
    await_first_login: { route: '/onboarding/change-password', label: 'Set your password', audience: 'parish' },
    configure_record_tables: { route: '/onboarding/record-tables', label: 'Configure record tables', audience: 'parish' },
    activate_parish: { route: '/account/parish-management', label: 'Open parish hub', audience: 'parish' },
    audit_complete: { route: '/account/parish-management', label: 'Parish dashboard', audience: 'parish' },
  },
  'ocr.batch.review': {
    upload_batch: { route: '/devel/ocr-studio/upload', label: 'Upload records', audience: 'parish' },
    human_review: { route: '/portal/ocr', label: 'Review OCR batch', audience: 'parish' },
    confirm_seed: { route: '/portal/ocr', label: 'Confirm and seed', audience: 'parish' },
  },
  'ocr.setup.wizard': {
    select_church: { route: '/devel/ocr-setup-wizard', label: 'Start OCR setup', audience: 'parish' },
    record_types: { route: '/devel/ocr-setup-wizard', label: 'Configure record types', audience: 'parish' },
    layout_template: { route: '/devel/ocr-setup-wizard', label: 'Set layout template', audience: 'parish' },
    feeder_settings: { route: '/devel/ocr-setup-wizard', label: 'Finish feeder settings', audience: 'parish' },
  },
  'records.certificate.generate': {
    select_record: { route: '/portal/certificates/generate', label: 'Generate certificate', audience: 'parish' },
    choose_template: { route: '/portal/certificates/generate', label: 'Choose template', audience: 'parish' },
    preview_certificate: { route: '/portal/certificates/generate', label: 'Preview certificate', audience: 'parish' },
    print_or_download: { route: '/portal/certificates/generate', label: 'Download certificate', audience: 'parish' },
  },
  'identity.user.admin': {
    list_users: { route: '/admin/users', label: 'Manage users', audience: 'admin' },
    create_or_edit: { route: '/admin/users', label: 'Add parish staff', audience: 'parish' },
    assign_roles: { route: '/admin/users', label: 'Assign roles', audience: 'parish' },
    notify_user: { route: '/admin/control-panel/pending-members', label: 'Activate pending users', audience: 'parish' },
  },
};

async function getChurchDbPool(churchId) {
  const { getAppPool } = require('../config/db');
  const pool = getAppPool();
  const [rows] = await pool.query(
    'SELECT database_name FROM churches WHERE id = ? LIMIT 1',
    [churchId]
  );
  if (!rows.length || !rows[0].database_name) return null;
  const { getChurchDbConnection } = require('../utils/dbSwitcher');
  return getChurchDbConnection(rows[0].database_name);
}

async function countChurchRecords(churchDb) {
  const tables = [
    'baptism_records', 'marriage_records', 'funeral_records',
    'baptism', 'marriage', 'funeral',
  ];
  let total = 0;
  for (const table of tables) {
    try {
      const [rows] = await churchDb.query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
      total += Number(rows[0]?.cnt || 0);
    } catch {
      // table may not exist in this tenant schema
    }
  }
  return total;
}

function resolveOcrSetupStep(percentComplete, isComplete) {
  if (isComplete || percentComplete >= 100) return null;
  if (percentComplete >= 60) return 'feeder_settings';
  if (percentComplete >= 40) return 'layout_template';
  if (percentComplete >= 20) return 'record_types';
  return 'select_church';
}

function resolveEnrollmentCurrentStep(request) {
  if (!request) return null;
  if (request.status === 'record_tables_review') {
    if (!request.table_configuration_completed) return 'configure_record_tables';
    if (!request.layout_configuration_completed) return 'configure_record_tables';
    return 'activate_parish';
  }
  return ENROLLMENT_STATUS_TO_STEP[request.status] ?? 'submit_enrollment';
}

function buildStepProgress(catalogSteps, currentStepKey) {
  if (!catalogSteps?.length) return [];
  const currentIdx = currentStepKey
    ? catalogSteps.findIndex((s) => s.step_key === currentStepKey)
    : -1;
  return catalogSteps.map((step, idx) => {
    const isCurrent = step.step_key === currentStepKey;
    const done = currentIdx >= 0 && idx < currentIdx;
    return {
      step_key: step.step_key,
      step_name: step.step_name,
      step_kind: step.step_kind,
      step_sequence: step.step_sequence,
      status: done ? 'done' : isCurrent ? 'current' : 'pending',
      done,
      current: isCurrent,
    };
  });
}

function attachActions(workflowKey, steps, audience = 'all') {
  const routes = STEP_ACTION_ROUTES[workflowKey] || {};
  return steps.map((step) => {
    const action = routes[step.step_key];
    if (!action) return { ...step, action_route: null, action_label: null };
    if (audience !== 'all' && action.audience !== audience && action.audience !== 'all') {
      return { ...step, action_route: null, action_label: null };
    }
    return {
      ...step,
      action_route: action.route,
      action_label: action.label,
    };
  });
}

function buildWorkflowContext(workflow, currentStepKey, audience = 'all') {
  const steps = buildStepProgress(workflow.steps, currentStepKey);
  const withActions = attachActions(workflow.workflow_key, steps, audience);
  const current = withActions.find((s) => s.current) || null;
  const nextPending = withActions.find((s) => s.status === 'pending');
  return {
    workflow_key: workflow.workflow_key,
    workflow_name: workflow.workflow_name,
    description: workflow.description,
    completion_state: workflow.completion_state,
    active_version: workflow.active_version,
    current_step_key: currentStepKey,
    current_step: current,
    next_step: nextPending || null,
    steps: withActions,
    route_entrypoints: workflow.route_entrypoints || [],
  };
}

async function resolveEnrollmentForChurch(pool, churchId) {
  const [rows] = await pool.query(
    `SELECT * FROM onboarding_requests
     WHERE church_id = ?
     ORDER BY updated_at DESC LIMIT 1`,
    [churchId]
  );
  if (!rows.length) return null;
  const request = rows[0];
  const workflow = await catalog.fetchWorkflowDetail('church.enrollment');
  if (!workflow) return null;
  const currentStepKey = resolveEnrollmentCurrentStep(request);
  if (!currentStepKey) return null;
  return {
    request_id: request.onboarding_request_id,
    request_status: request.status,
    context: buildWorkflowContext(workflow, currentStepKey, 'parish'),
  };
}

async function resolveEnrollmentByRequestId(onboardingRequestId) {
  const onboarding = require('./onboardingService');
  const row = await onboarding.getByPublicId(onboardingRequestId);
  if (!row) return null;
  const workflow = await catalog.fetchWorkflowDetail('church.enrollment');
  if (!workflow) return null;
  const currentStepKey = resolveEnrollmentCurrentStep(row);
  const context = buildWorkflowContext(workflow, currentStepKey, 'admin');
  return { request: row, workflow: context };
}

function workflowStepsToLegacyProgress(workflowContext) {
  if (!workflowContext?.steps?.length) return [];
  return workflowContext.steps.map((s) => ({
    key: s.step_key,
    label: s.step_name,
    done: s.status === 'done' || s.done,
    current: s.current,
  }));
}

async function resolveOcrSetupGoal(pool, churchId) {
  const churchDb = await getChurchDbPool(churchId);
  if (!churchDb) return null;

  let percentComplete = 0;
  let isComplete = false;
  try {
    const [rows] = await churchDb.query(
      'SELECT percent_complete, is_complete FROM ocr_setup_state WHERE church_id = ?',
      [churchId]
    );
    if (rows.length) {
      percentComplete = Number(rows[0].percent_complete || 0);
      isComplete = Boolean(rows[0].is_complete);
    }
  } catch {
    // ocr_setup_state may not exist yet — treat as not started
  }

  const stepKey = resolveOcrSetupStep(percentComplete, isComplete);
  if (!stepKey) return null;

  const workflow = await catalog.fetchWorkflowDetail('ocr.setup.wizard');
  if (!workflow) return null;

  const ctx = buildWorkflowContext(workflow, stepKey, 'parish');
  const setupRoute = `/devel/ocr-setup-wizard?church_id=${churchId}`;
  if (ctx.current_step) {
    ctx.current_step = {
      ...ctx.current_step,
      action_route: setupRoute,
      action_label: ctx.current_step.action_label || 'Continue OCR setup',
    };
  }
  return { percent_complete: percentComplete, workflow: ctx };
}

async function resolveCertificateGoal(pool, churchId) {
  try {
    const [genRows] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM generated_certificates WHERE church_id = ?',
      [churchId]
    );
    if (Number(genRows[0]?.cnt || 0) > 0) return null;
  } catch {
    return null;
  }

  const churchDb = await getChurchDbPool(churchId);
  if (!churchDb) return null;
  const recordCount = await countChurchRecords(churchDb);
  if (recordCount === 0) return null;

  const workflow = await catalog.fetchWorkflowDetail('records.certificate.generate');
  if (!workflow) return null;

  const ctx = buildWorkflowContext(workflow, 'select_record', 'parish');
  return { record_count: recordCount, workflow: ctx };
}

async function resolveIdentityAdminGoal(pool, churchId) {
  const [lockedRows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM users WHERE church_id = ? AND is_locked = 1',
    [churchId]
  );
  const pendingCount = Number(lockedRows[0]?.cnt || 0);

  let stepKey = 'create_or_edit';
  let summary = 'Add parish staff accounts';
  if (pendingCount > 0) {
    stepKey = 'notify_user';
    summary = `${pendingCount} user${pendingCount === 1 ? '' : 's'} awaiting activation`;
  } else {
    const [activeRows] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM users WHERE church_id = ? AND (is_locked = 0 OR is_locked IS NULL)',
      [churchId]
    );
    if (Number(activeRows[0]?.cnt || 0) >= 2) return null;
  }

  const workflow = await catalog.fetchWorkflowDetail('identity.user.admin');
  if (!workflow) return null;

  const ctx = buildWorkflowContext(workflow, stepKey, 'parish');
  return { pending_users: pendingCount, summary, workflow: ctx };
}

async function resolveOcrReviewGoals(pool, churchId) {
  const [rows] = await pool.query(
    `SELECT id, filename, review_status, status
     FROM ocr_jobs
     WHERE church_id = ?
       AND review_status IN ('uploaded','ocr_complete','agent_extracted','human_confirmed','in_review','ready_to_seed')
       AND (seeded_at IS NULL OR review_status != 'seeded')
     ORDER BY updated_at DESC LIMIT 5`,
    [churchId]
  );
  if (!rows.length) return [];
  const workflow = await catalog.fetchWorkflowDetail('ocr.batch.review');
  if (!workflow) return [];

  const reviewStatusToStep = {
    uploaded: 'upload_batch',
    ocr_complete: 'queue_processing',
    agent_extracted: 'agent_extract',
    human_confirmed: 'human_review',
    in_review: 'human_review',
    ready_to_seed: 'confirm_seed',
  };

  return rows.map((job) => {
    const stepKey = reviewStatusToStep[job.review_status] || 'human_review';
    const ctx = buildWorkflowContext(workflow, stepKey, 'parish');
    const reviewRoute = `/portal/ocr/review/${churchId}/${job.id}`;
    if (ctx.current_step) {
      ctx.current_step = {
        ...ctx.current_step,
        action_route: reviewRoute,
        action_label: `Review ${job.filename || 'batch'}`,
      };
    }
    return {
      job_id: job.id,
      filename: job.filename,
      review_status: job.review_status,
      workflow: ctx,
    };
  });
}

/**
 * Runtime resolvers — register new workflows here.
 * Each resolver: async (pool, churchId) => GoalItem | GoalItem[] | null
 */
const RUNTIME_RESOLVERS = [
  {
    workflow_key: 'church.enrollment',
    priority: 10,
    resolve: async (pool, churchId) => {
      const item = await resolveEnrollmentForChurch(pool, churchId);
      if (!item || item.request_status === 'active') return null;
      return {
        workflow_key: 'church.enrollment',
        priority: 10,
        title: item.context.workflow_name,
        summary: item.context.current_step?.step_name || 'Enrollment in progress',
        action_route: item.context.current_step?.action_route,
        action_label: item.context.current_step?.action_label || 'Continue setup',
        workflow: item.context,
        meta: { request_id: item.request_id, request_status: item.request_status },
      };
    },
  },
  {
    workflow_key: 'ocr.setup.wizard',
    priority: 15,
    resolve: async (pool, churchId) => {
      const item = await resolveOcrSetupGoal(pool, churchId);
      if (!item) return null;
      return {
        workflow_key: 'ocr.setup.wizard',
        priority: 15,
        title: item.workflow.workflow_name,
        summary: item.workflow.current_step?.step_name || 'OCR setup in progress',
        action_route: item.workflow.current_step?.action_route,
        action_label: item.workflow.current_step?.action_label || 'Continue OCR setup',
        workflow: item.workflow,
        meta: { percent_complete: item.percent_complete },
      };
    },
  },
  {
    workflow_key: 'ocr.batch.review',
    priority: 20,
    resolve: async (pool, churchId) => {
      const items = await resolveOcrReviewGoals(pool, churchId);
      return items.map((item, i) => ({
        workflow_key: 'ocr.batch.review',
        priority: 20 + i,
        title: 'OCR review needed',
        summary: item.filename || `Job #${item.job_id}`,
        action_route: item.workflow.current_step?.action_route,
        action_label: item.workflow.current_step?.action_label || 'Review batch',
        workflow: item.workflow,
        meta: { job_id: item.job_id, review_status: item.review_status },
      }));
    },
  },
  {
    workflow_key: 'identity.user.admin',
    priority: 25,
    resolve: async (pool, churchId) => {
      const item = await resolveIdentityAdminGoal(pool, churchId);
      if (!item) return null;
      return {
        workflow_key: 'identity.user.admin',
        priority: 25,
        title: item.workflow.workflow_name,
        summary: item.workflow.current_step?.step_name || item.summary,
        action_route: item.workflow.current_step?.action_route,
        action_label: item.workflow.current_step?.action_label || 'Manage users',
        workflow: item.workflow,
        meta: { pending_users: item.pending_users },
      };
    },
  },
  {
    workflow_key: 'records.certificate.generate',
    priority: 30,
    resolve: async (pool, churchId) => {
      const item = await resolveCertificateGoal(pool, churchId);
      if (!item) return null;
      return {
        workflow_key: 'records.certificate.generate',
        priority: 30,
        title: item.workflow.workflow_name,
        summary: 'Generate your first sacramental certificate',
        action_route: item.workflow.current_step?.action_route,
        action_label: item.workflow.current_step?.action_label || 'Generate certificate',
        workflow: item.workflow,
        meta: { record_count: item.record_count },
      };
    },
  },
];

async function getGoalsForChurch(churchId, { audience = 'parish' } = {}) {
  const { getAppPool } = require('../config/db');
  const pool = getAppPool();
  const goals = [];

  for (const resolver of RUNTIME_RESOLVERS.sort((a, b) => a.priority - b.priority)) {
    const result = await resolver.resolve(pool, churchId);
    if (!result) continue;
    const list = Array.isArray(result) ? result : [result];
    for (const g of list) {
      if (audience === 'parish' && g.workflow?.current_step && !g.action_route) continue;
      goals.push(g);
    }
  }

  return {
    church_id: churchId,
    generated_at: new Date().toISOString(),
    goals,
  };
}

async function getAdminEnrollmentWorkflow(onboardingRequestId) {
  return resolveEnrollmentByRequestId(onboardingRequestId);
}

/** Global runtime counters for OMAI workflow catalog /runtime endpoint. */
async function getRuntimeStatsForCatalog(pool, workflowKey) {
  if (workflowKey === 'church.enrollment') {
    const [byStatus] = await pool.query(
      'SELECT status, COUNT(*) AS count FROM onboarding_requests GROUP BY status ORDER BY count DESC'
    );
    const [byProv] = await pool.query(
      'SELECT provisioning_status, COUNT(*) AS count FROM onboarding_requests GROUP BY provisioning_status ORDER BY count DESC'
    );
    return { source: 'onboarding_requests', by_status: byStatus, by_provisioning_status: byProv };
  }
  if (workflowKey === 'ocr.batch.review') {
    const [byStatus] = await pool.query(
      'SELECT status, COUNT(*) AS count FROM ocr_jobs GROUP BY status ORDER BY count DESC'
    );
    const [byReview] = await pool.query(
      'SELECT review_status, COUNT(*) AS count FROM ocr_jobs GROUP BY review_status ORDER BY count DESC'
    );
    return { source: 'ocr_jobs', by_status: byStatus, by_review_status: byReview };
  }
  if (workflowKey === 'ocr.setup.wizard') {
    const [churches] = await pool.query(
      `SELECT c.id, c.database_name
       FROM churches c
       WHERE c.database_name IS NOT NULL AND c.is_active = 1
       ORDER BY c.id`
    );
    let complete = 0;
    let incomplete = 0;
    let notStarted = 0;
    for (const ch of churches) {
      try {
        const { getChurchDbConnection } = require('../utils/dbSwitcher');
        const churchDb = await getChurchDbConnection(ch.database_name);
        const [rows] = await churchDb.query(
          'SELECT is_complete, percent_complete FROM ocr_setup_state WHERE church_id = ?',
          [ch.id]
        );
        if (!rows.length) {
          notStarted += 1;
        } else if (rows[0].is_complete) {
          complete += 1;
        } else {
          incomplete += 1;
        }
      } catch {
        notStarted += 1;
      }
    }
    return {
      source: 'church_db.ocr_setup_state',
      churches_total: churches.length,
      setup_complete: complete,
      setup_in_progress: incomplete,
      setup_not_started: notStarted,
    };
  }
  if (workflowKey === 'records.certificate.generate') {
    const [byChurch] = await pool.query(
      `SELECT church_id, COUNT(*) AS count
       FROM generated_certificates
       GROUP BY church_id
       ORDER BY count DESC
       LIMIT 50`
    );
    const [byType] = await pool.query(
      `SELECT record_type, COUNT(*) AS count
       FROM generated_certificates
       GROUP BY record_type
       ORDER BY count DESC`
    );
    const [total] = await pool.query('SELECT COUNT(*) AS count FROM generated_certificates');
    return {
      source: 'generated_certificates',
      total_generated: Number(total[0]?.count || 0),
      by_church: byChurch,
      by_record_type: byType,
    };
  }
  if (workflowKey === 'identity.user.admin') {
    const [byChurch] = await pool.query(
      `SELECT church_id,
              SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END) AS pending_users,
              SUM(CASE WHEN is_locked = 0 OR is_locked IS NULL THEN 1 ELSE 0 END) AS active_users
       FROM users
       WHERE church_id IS NOT NULL
       GROUP BY church_id
       ORDER BY pending_users DESC, active_users DESC
       LIMIT 50`
    );
    const [totals] = await pool.query(
      `SELECT
         SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END) AS pending_users,
         SUM(CASE WHEN is_locked = 0 OR is_locked IS NULL THEN 1 ELSE 0 END) AS active_users
       FROM users
       WHERE church_id IS NOT NULL`
    );
    return {
      source: 'users',
      pending_users: Number(totals[0]?.pending_users || 0),
      active_users: Number(totals[0]?.active_users || 0),
      by_church: byChurch,
    };
  }
  return { source: null, note: 'No live runtime counters for this workflow yet' };
}

const ENROLLMENT_CATALOG_STEPS = [
  { step_key: 'submit_enrollment', step_name: 'Submit Enrollment', step_sequence: 10, step_kind: 'human' },
  { step_key: 'staff_review', step_name: 'Staff Review', step_sequence: 20, step_kind: 'approval' },
  { step_key: 'payment', step_name: 'Payment', step_sequence: 30, step_kind: 'human' },
  { step_key: 'provision_tenant', step_name: 'Provision Tenant', step_sequence: 40, step_kind: 'pipeline_trigger' },
  { step_key: 'create_admin_account', step_name: 'Create Admin Account', step_sequence: 50, step_kind: 'system' },
  { step_key: 'await_first_login', step_name: 'Await First Login', step_sequence: 60, step_kind: 'human' },
  { step_key: 'configure_record_tables', step_name: 'Configure Record Tables', step_sequence: 70, step_kind: 'human' },
  { step_key: 'activate_parish', step_name: 'Activate Parish', step_sequence: 80, step_kind: 'system' },
  { step_key: 'audit_complete', step_name: 'Audit Complete', step_sequence: 90, step_kind: 'audit' },
];

/** Sync catalog-aligned progress (no DB) — used by onboardingService fallback. */
function getEnrollmentLegacyProgress(request) {
  const currentStepKey = resolveEnrollmentCurrentStep(request);
  if (!currentStepKey) return [];
  const ctx = buildWorkflowContext(
    { workflow_key: 'church.enrollment', steps: ENROLLMENT_CATALOG_STEPS },
    currentStepKey,
    'admin',
  );
  return workflowStepsToLegacyProgress(ctx);
}

const OCR_REVIEW_OPEN_STATUSES = new Set([
  'uploaded', 'ocr_complete', 'agent_extracted', 'human_confirmed', 'in_review', 'ready_to_seed',
]);

function deriveWorkflowKpi(workflowKey, stats) {
  if (workflowKey === 'church.enrollment') {
    const open = (stats.by_status || [])
      .filter((r) => !['active', 'rejected', 'cancelled'].includes(r.status))
      .reduce((acc, r) => acc + Number(r.count || 0), 0);
    return { label: 'Open enrollments', value: open, status: open > 0 ? 'attention' : 'healthy' };
  }
  if (workflowKey === 'ocr.batch.review') {
    const open = (stats.by_review_status || [])
      .filter((r) => OCR_REVIEW_OPEN_STATUSES.has(r.review_status))
      .reduce((acc, r) => acc + Number(r.count || 0), 0);
    return { label: 'Jobs needing review', value: open, status: open > 0 ? 'attention' : 'healthy' };
  }
  if (workflowKey === 'ocr.setup.wizard') {
    const needsSetup = Number(stats.setup_not_started || 0) + Number(stats.setup_in_progress || 0);
    return {
      label: 'Churches need setup',
      value: needsSetup,
      status: needsSetup > 0 ? 'attention' : 'healthy',
    };
  }
  if (workflowKey === 'records.certificate.generate') {
    const total = Number(stats.total_generated || 0);
    return { label: 'Certificates generated', value: total, status: 'healthy' };
  }
  if (workflowKey === 'identity.user.admin') {
    const pending = Number(stats.pending_users || 0);
    return {
      label: 'Pending user activations',
      value: pending,
      status: pending > 0 ? 'attention' : 'healthy',
    };
  }
  return { label: 'Runtime', value: '—', status: 'unknown' };
}

/** Aggregated workflow KPIs for executive overview + catalog summary panel. */
async function getWorkflowRuntimeSummary(pool) {
  const list = await catalog.fetchWorkflowList();
  const workflows = [];

  for (const wf of list) {
    const stats = await getRuntimeStatsForCatalog(pool, wf.workflow_key);
    const kpi = deriveWorkflowKpi(wf.workflow_key, stats);
    workflows.push({
      workflow_key: wf.workflow_key,
      workflow_name: wf.workflow_name,
      completion_state: wf.completion_state,
      lifecycle_status: wf.lifecycle_status,
      primary_app: wf.primary_app,
      kpi_label: kpi.label,
      kpi_value: kpi.value,
      kpi_status: kpi.status,
      stats,
    });
  }

  const attentionCount = workflows.filter((w) => w.kpi_status === 'attention').length;
  const enrollment = workflows.find((w) => w.workflow_key === 'church.enrollment');
  const ocrReview = workflows.find((w) => w.workflow_key === 'ocr.batch.review');
  const ocrSetup = workflows.find((w) => w.workflow_key === 'ocr.setup.wizard');
  const identity = workflows.find((w) => w.workflow_key === 'identity.user.admin');
  const certificates = workflows.find((w) => w.workflow_key === 'records.certificate.generate');

  return {
    generated_at: new Date().toISOString(),
    workflows_total: workflows.length,
    runtime_resolvers: RUNTIME_RESOLVERS.length,
    needs_attention: attentionCount,
    totals: {
      open_enrollments: typeof enrollment?.kpi_value === 'number' ? enrollment.kpi_value : null,
      ocr_jobs_pending_review: typeof ocrReview?.kpi_value === 'number' ? ocrReview.kpi_value : null,
      churches_ocr_setup_incomplete: typeof ocrSetup?.kpi_value === 'number' ? ocrSetup.kpi_value : null,
      pending_user_activations: typeof identity?.kpi_value === 'number' ? identity.kpi_value : null,
      certificates_generated: typeof certificates?.kpi_value === 'number' ? certificates.kpi_value : null,
    },
    workflows,
  };
}

module.exports = {
  ENROLLMENT_STATUS_TO_STEP,
  STEP_ACTION_ROUTES,
  RUNTIME_RESOLVERS,
  resolveEnrollmentCurrentStep,
  buildStepProgress,
  buildWorkflowContext,
  workflowStepsToLegacyProgress,
  getGoalsForChurch,
  getAdminEnrollmentWorkflow,
  resolveEnrollmentByRequestId,
  getRuntimeStatsForCatalog,
  resolveOcrSetupGoal,
  resolveCertificateGoal,
  resolveIdentityAdminGoal,
  getEnrollmentLegacyProgress,
  getWorkflowRuntimeSummary,
  deriveWorkflowKpi,
  ENROLLMENT_CATALOG_STEPS,
};
