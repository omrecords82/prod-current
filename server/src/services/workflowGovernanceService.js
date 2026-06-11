/**
 * Workflow governance — deployment history, queue, and validation gates.
 * OMStudio is the authoritative consumer via OMAI platform-workflows APIs.
 */
const crypto = require('crypto');

const DEFAULT_VALIDATION_GATES = [
  { gate: 'request_status_submitted', label: 'Request is submitted' },
  { gate: 'component_key_present', label: 'Component key present' },
  { gate: 'version_format', label: 'Semantic version + build format' },
  { gate: 'workflow_key_valid', label: 'Target workflow exists in catalog (when set)' },
];

function newId() {
  return crypto.randomUUID();
}

function parseJson(val, fallback = null) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

async function recordDeploymentHistory(pool, row) {
  await pool.query(
    `INSERT INTO workflow_deployment_history (
       deployment_id, request_id, workflow_key, component_key, target_app, full_version,
       deployment_action, status, validation_result, rollback_of_deployment_id,
       decided_by_user_id, notes, completed_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.deployment_id,
      row.request_id || null,
      row.workflow_key || null,
      row.component_key || null,
      row.target_app || 'om',
      row.full_version || '1.0.0_1',
      row.deployment_action || 'deploy',
      row.status || 'queued',
      row.validation_result ? JSON.stringify(row.validation_result) : null,
      row.rollback_of_deployment_id || null,
      row.decided_by_user_id || null,
      row.notes || null,
      row.completed_at || null,
    ]
  );
}

async function enqueueDeployment(pool, requestRow, { priority = 100, validationGates = null } = {}) {
  const queueId = newId();
  const deploymentId = newId();
  const gates = validationGates || DEFAULT_VALIDATION_GATES;

  await pool.query(
    `INSERT INTO workflow_deployment_queue (
       queue_id, request_id, deployment_id, priority, status, validation_gates, payload
     ) VALUES (?, ?, ?, ?, 'queued', ?, ?)`,
    [
      queueId,
      requestRow.request_id,
      deploymentId,
      priority,
      JSON.stringify(gates),
      JSON.stringify({
        component_key: requestRow.component_key,
        full_version: requestRow.full_version,
        target_workflow_key: requestRow.target_workflow_key,
        target_app: requestRow.target_app,
      }),
    ]
  );

  await recordDeploymentHistory(pool, {
    deployment_id: deploymentId,
    request_id: requestRow.request_id,
    workflow_key: requestRow.target_workflow_key,
    component_key: requestRow.component_key,
    target_app: requestRow.target_app,
    full_version: requestRow.full_version,
    deployment_action: 'queue',
    status: 'queued',
    validation_result: { gates },
  });

  return { queue_id: queueId, deployment_id: deploymentId };
}

async function validateDeploymentRequest(pool, requestRow) {
  const gates = [];
  let passed = true;

  const add = (gate, ok, detail = null) => {
    gates.push({ gate, passed: ok, detail });
    if (!ok) passed = false;
  };

  add('request_status_submitted', requestRow.status === 'submitted');
  add('component_key_present', Boolean(requestRow.component_key));
  add(
    'version_format',
    /^[\d]+\.[\d]+\.[\d]+_\d+$/.test(String(requestRow.full_version || ''))
      || /^[\d]+\.[\d]+\.[\d]+$/.test(String(requestRow.semantic_version || ''))
  );

  if (requestRow.target_workflow_key) {
    const [wf] = await pool.query(
      'SELECT workflow_key FROM app_workflows WHERE workflow_key = ? LIMIT 1',
      [requestRow.target_workflow_key]
    );
    add('workflow_key_valid', wf.length > 0, requestRow.target_workflow_key);
  } else {
    add('workflow_key_valid', true, 'optional');
  }

  return { passed, gates, validated_at: new Date().toISOString() };
}

async function listDeploymentHistory(pool, { limit = 50, workflowKey = null } = {}) {
  const cap = Math.min(limit, 200);
  let sql = 'SELECT * FROM workflow_deployment_history';
  const params = [];
  if (workflowKey) {
    sql += ' WHERE workflow_key = ?';
    params.push(workflowKey);
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(cap);
  const [rows] = await pool.query(sql, params);
  return rows.map((r) => ({
    ...r,
    validation_result: parseJson(r.validation_result, null),
  }));
}

async function listDeploymentQueue(pool, { status = null, limit = 50 } = {}) {
  const cap = Math.min(limit, 200);
  let sql = 'SELECT * FROM workflow_deployment_queue';
  const params = [];
  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  sql += ' ORDER BY priority ASC, created_at ASC LIMIT ?';
  params.push(cap);
  const [rows] = await pool.query(sql, params);
  return rows.map((r) => ({
    ...r,
    validation_gates: parseJson(r.validation_gates, []),
    payload: parseJson(r.payload, null),
  }));
}

async function recordRollback(pool, { deploymentId, rollbackOfDeploymentId, actorUserId, notes }) {
  const rollbackId = newId();
  await recordDeploymentHistory(pool, {
    deployment_id: rollbackId,
    deployment_action: 'rollback',
    status: 'rolled_back',
    rollback_of_deployment_id: rollbackOfDeploymentId,
    decided_by_user_id: actorUserId,
    notes: notes || `Rollback of ${rollbackOfDeploymentId}`,
    completed_at: new Date(),
  });
  if (deploymentId) {
    await pool.query(
      `UPDATE workflow_deployment_history SET status = 'rolled_back', completed_at = NOW()
       WHERE deployment_id = ?`,
      [deploymentId]
    );
  }
  return { rollback_deployment_id: rollbackId };
}

/** OMStudio authority manifest — catalog + governance docs + filing registry. */
async function getWorkflowAuthorityManifest(pool) {
  const registry = require('./workflowRegistry');
  const workflowGoals = require('./workflowGoalsService');
  const catalog = require('./workflowCatalogService');
  const bundle = await catalog.fetchCatalogBundle(pool);
  const [historyCount] = await pool.query('SELECT COUNT(*) AS cnt FROM workflow_deployment_history');
  const [queueCount] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM workflow_deployment_queue WHERE status = 'queued'"
  );

  return {
    authority: 'omstudio',
    role: 'workflow_governance_consumer',
    schema_version: catalog.HIERARCHY_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    documentation: [
      { doc_key: 'pipeline', path: 'docs/app-workflow-catalog-pipeline.md', title: 'App Workflow Catalog Pipeline' },
      { doc_key: 'review_decisions', path: 'docs/workflow-catalog-review-implementation.md', title: 'Catalog Review Implementation' },
      { doc_key: 'phase_a_hierarchy', path: 'docs/workflow-catalog-phase-a-hierarchy-design.md', title: 'Phase A Hierarchy Design' },
      { doc_key: 'gap_analysis', path: 'docs/workflow-catalog-architecture-gap-analysis.md', title: 'Architecture Gap Analysis' },
    ],
    filed_workflows: registry.FILED_WORKFLOW_KEYS,
    filing_checklist: registry.FILING_CHECKLIST,
    runtime_resolvers: workflowGoals.RUNTIME_RESOLVERS.map((r) => r.workflow_key),
    feature_flags: workflowGoals.getWorkflowFeatureFlags(),
    workflow_hierarchy: bundle.workflow_hierarchy,
    workflow_families: bundle.workflow_hierarchy.families.map((f) => ({
      level_key: f.level_key,
      level_name: f.level_name,
      workflows_filed: f.workflows_filed,
      groups_total: f.groups.length,
    })),
    catalog_workflows: bundle.workflows.map((w) => ({
      workflow_key: w.workflow_key,
      workflow_name: w.workflow_name,
      completion_state: w.completion_state,
      lifecycle_status: w.lifecycle_status,
      primary_app: w.primary_app,
      app_family_key: w.app_family_key,
    })),
    governance: {
      deployment_history_total: Number(historyCount[0]?.cnt || 0),
      deployment_queue_pending: Number(queueCount[0]?.cnt || 0),
      validation_gates: DEFAULT_VALIDATION_GATES,
      hierarchy_policy_key: 'catalog.hierarchy.v1',
    },
  };
}

module.exports = {
  DEFAULT_VALIDATION_GATES,
  validateDeploymentRequest,
  enqueueDeployment,
  recordDeploymentHistory,
  listDeploymentHistory,
  listDeploymentQueue,
  recordRollback,
  getWorkflowAuthorityManifest,
};
