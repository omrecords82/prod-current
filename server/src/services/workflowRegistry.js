/**
 * Workflow filing registry — checklist for adding workflows without pipeline gaps.
 * Keep in sync with workflowGoalsService.RUNTIME_RESOLVERS and DB migrations.
 */
const FILING_CHECKLIST = [
  '1. Seed app_workflows + app_workflow_versions + app_workflow_steps (+ components) in migration',
  '2. Set route_entrypoints JSON on active version',
  '3. Register RUNTIME_RESOLVERS entry in workflowGoalsService.js',
  '4. Add STEP_ACTION_ROUTES for parish/admin deep links',
  '5. Extend getRuntimeStatsForCatalog() + deriveWorkflowKpi() for executive KPIs',
  '6. Optional: UI hook (Parish goal strip, CCC panel, or catalog-only)',
  '7. Run sync-production-states from OMAI Workflow Catalog after deploy',
];

const FILED_WORKFLOW_KEYS = [
  'church.enrollment',
  'ocr.batch.review',
  'ocr.setup.wizard',
  'records.certificate.generate',
  'identity.user.admin',
];

module.exports = {
  FILING_CHECKLIST,
  FILED_WORKFLOW_KEYS,
};
