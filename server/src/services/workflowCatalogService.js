/**
 * App workflow catalog — read-only loaders from orthodoxmetrics_db.app_workflow_*.
 * Single source of truth for workflow definitions (steps, routes, components).
 * Phase A: GLOBAL → APP_FAMILY → WORKFLOW_GROUP hierarchy composition.
 */
const { getAppPool } = require('../config/db');

const HIERARCHY_SCHEMA_VERSION = '1.0.0';

function parseJson(val, fallback = null) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

async function fetchSystemLevels(pool = null) {
  const db = pool || getAppPool();
  const [rows] = await db.query(
    `SELECT level_key, level_name, system_level, workflow_group_sequence,
            parent_level_key, tree_depth, hierarchy_path, is_active, description
     FROM app_workflow_system_levels
     ORDER BY workflow_group_sequence, level_key`
  );
  return rows;
}

function buildWorkflowHierarchy(levels, workflows) {
  const global = levels.find((l) => l.system_level === 'GLOBAL') || null;
  const families = levels.filter((l) => l.system_level === 'APP_FAMILY');
  const groups = levels.filter((l) => l.system_level === 'WORKFLOW_GROUP');

  const familyNodes = families.map((fam) => {
    const familyGroups = groups
      .filter((g) => g.parent_level_key === fam.level_key)
      .sort((a, b) => a.workflow_group_sequence - b.workflow_group_sequence)
      .map((grp) => {
        const grpWorkflows = workflows
          .filter((w) => w.system_level_key === grp.level_key)
          .sort((a, b) => a.workflow_sequence - b.workflow_sequence);
        return {
          level_key: grp.level_key,
          level_name: grp.level_name,
          hierarchy_path: grp.hierarchy_path,
          is_active: grp.is_active,
          workflow_group_sequence: grp.workflow_group_sequence,
          workflows_filed: grpWorkflows.length,
          workflows: grpWorkflows,
          planned: grpWorkflows.length === 0,
        };
      });

    const filedCount = familyGroups.reduce((n, g) => n + g.workflows.length, 0);

    return {
      level_key: fam.level_key,
      level_name: fam.level_name,
      hierarchy_path: fam.hierarchy_path,
      workflow_group_sequence: fam.workflow_group_sequence,
      workflows_filed: filedCount,
      groups: familyGroups,
    };
  });

  return {
    schema_version: HIERARCHY_SCHEMA_VERSION,
    global: global
      ? {
          level_key: global.level_key,
          level_name: global.level_name,
          hierarchy_path: global.hierarchy_path,
        }
      : null,
    families: familyNodes,
  };
}

function workflowHierarchyPath(workflow, group, family) {
  const parts = ['om_platform'];
  if (family?.level_key) parts.push(family.level_key);
  if (group?.level_key) parts.push(group.level_key);
  if (workflow?.workflow_key) parts.push(workflow.workflow_key);
  return `/${parts.join('/')}`;
}

function enrichWorkflowRow(row, levelsByKey) {
  const group = levelsByKey.get(row.system_level_key);
  const family = row.app_family_key
    ? levelsByKey.get(row.app_family_key)
    : (group?.parent_level_key ? levelsByKey.get(group.parent_level_key) : null);

  return {
    ...row,
    route_entrypoints: parseJson(row.route_entrypoints, []),
    workflow_group_name: group?.level_name || null,
    app_family_key: row.app_family_key || family?.level_key || null,
    app_family_name: family?.level_name || null,
    hierarchy_path: workflowHierarchyPath(row, group, family),
  };
}

async function fetchEnrichedWorkflowList(pool = null, { appFamilyKey = null } = {}) {
  const db = pool || getAppPool();
  let sql = `
    SELECT w.workflow_key, w.workflow_name, w.description, w.primary_app, w.entry_type,
           w.system_level_key, w.app_family_key, w.workflow_sequence, w.lifecycle_status,
           w.completion_state, v.version AS active_version, v.route_entrypoints,
           v.runtime_state_source,
           sl.level_name AS system_level_name, sl.workflow_group_sequence,
           fam.level_name AS app_family_name
    FROM app_workflows w
    LEFT JOIN app_workflow_versions v ON v.id = w.active_version_id
    LEFT JOIN app_workflow_system_levels sl ON sl.level_key = w.system_level_key
    LEFT JOIN app_workflow_system_levels fam ON fam.level_key = w.app_family_key
  `;
  const params = [];
  if (appFamilyKey) {
    sql += ' WHERE w.app_family_key = ?';
    params.push(appFamilyKey);
  }
  sql += ' ORDER BY fam.workflow_group_sequence, sl.workflow_group_sequence, w.workflow_sequence, w.workflow_name';

  const [rows] = await db.query(sql, params);
  const levels = await fetchSystemLevels(db);
  const levelsByKey = new Map(levels.map((l) => [l.level_key, l]));
  return rows.map((r) => enrichWorkflowRow(r, levelsByKey));
}

async function fetchCatalogBundle(pool = null, { appFamilyKey = null } = {}) {
  const db = pool || getAppPool();
  const [levels, workflows] = await Promise.all([
    fetchSystemLevels(db),
    fetchEnrichedWorkflowList(db, { appFamilyKey }),
  ]);
  return {
    schema_version: HIERARCHY_SCHEMA_VERSION,
    workflow_system_levels: levels,
    workflows,
    workflow_hierarchy: buildWorkflowHierarchy(levels, workflows),
  };
}

async function fetchWorkflowList() {
  return fetchEnrichedWorkflowList();
}

async function fetchWorkflowDetail(workflowKey) {
  const pool = getAppPool();
  const [wfRows] = await pool.query(
    `SELECT w.*, sl.level_name AS system_level_name, sl.hierarchy_path AS group_hierarchy_path,
            sl.parent_level_key AS group_parent_key,
            fam.level_name AS app_family_name, fam.level_key AS app_family_key_resolved,
            v.id AS version_id, v.version, v.route_entrypoints, v.runtime_state_source
     FROM app_workflows w
     LEFT JOIN app_workflow_system_levels sl ON sl.level_key = w.system_level_key
     LEFT JOIN app_workflow_system_levels fam ON fam.level_key = COALESCE(w.app_family_key, sl.parent_level_key)
       AND fam.system_level = 'APP_FAMILY'
     LEFT JOIN app_workflow_versions v ON v.id = w.active_version_id
     WHERE w.workflow_key = ?`,
    [workflowKey]
  );
  if (!wfRows.length) return null;
  const wf = wfRows[0];
  const appFamilyKey = wf.app_family_key || wf.app_family_key_resolved;
  const hierarchyPath = [
    'om_platform',
    appFamilyKey,
    wf.system_level_key,
    wf.workflow_key,
  ].filter(Boolean).join('/');
  const versionId = wf.version_id;
  if (!versionId) {
    return {
      workflow_key: wf.workflow_key,
      workflow_name: wf.workflow_name,
      description: wf.description,
      primary_app: wf.primary_app,
      entry_type: wf.entry_type,
      system_level_key: wf.system_level_key,
      system_level_name: wf.system_level_name,
      app_family_key: appFamilyKey,
      app_family_name: wf.app_family_name,
      hierarchy_path: `/${hierarchyPath}`,
      completion_state: wf.completion_state,
      active_version: null,
      route_entrypoints: [],
      runtime_state_source: wf.runtime_state_source,
      steps: [],
    };
  }

  const [steps] = await pool.query(
    `SELECT s.*, p.pipeline_key, p.pipeline_name, p.runtime_state_source AS pipeline_runtime_source,
            p.step_definitions AS pipeline_step_definitions
     FROM app_workflow_steps s
     LEFT JOIN app_workflow_pipelines p ON p.pipeline_key = s.pipeline_key
     WHERE s.workflow_version_id = ?
     ORDER BY s.step_sequence`,
    [versionId]
  );

  const stepIds = steps.map((s) => s.id);
  let components = [];
  if (stepIds.length) {
    const [compRows] = await pool.query(
      `SELECT * FROM app_workflow_step_components
       WHERE workflow_step_id IN (?)
       ORDER BY workflow_step_id, component_sequence`,
      [stepIds]
    );
    components = compRows;
  }
  const byStep = new Map();
  for (const c of components) {
    if (!byStep.has(c.workflow_step_id)) byStep.set(c.workflow_step_id, []);
    byStep.get(c.workflow_step_id).push(c);
  }

  return {
    workflow_key: wf.workflow_key,
    workflow_name: wf.workflow_name,
    description: wf.description,
    primary_app: wf.primary_app,
    entry_type: wf.entry_type,
    system_level_key: wf.system_level_key,
    system_level_name: wf.system_level_name,
    app_family_key: appFamilyKey,
    app_family_name: wf.app_family_name,
    hierarchy_path: `/${hierarchyPath}`,
    completion_state: wf.completion_state,
    active_version: wf.version,
    route_entrypoints: parseJson(wf.route_entrypoints, []),
    runtime_state_source: wf.runtime_state_source,
    steps: steps.map((s) => ({
      step_key: s.step_key,
      step_name: s.step_name,
      step_sequence: s.step_sequence,
      step_kind: s.step_kind,
      pipeline_key: s.pipeline_key,
      pipeline_name: s.pipeline_name,
      runtime_status_field: s.runtime_status_field,
      runtime_status_values: parseJson(s.runtime_status_values, []),
      required_components: byStep.get(s.id) || [],
    })),
  };
}

module.exports = {
  HIERARCHY_SCHEMA_VERSION,
  parseJson,
  fetchSystemLevels,
  buildWorkflowHierarchy,
  workflowHierarchyPath,
  fetchEnrichedWorkflowList,
  fetchCatalogBundle,
  fetchWorkflowList,
  fetchWorkflowDetail,
};
