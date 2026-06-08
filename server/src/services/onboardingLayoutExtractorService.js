/**
 * Seeds ocr_extractors candidates from parish onboarding layout catalog selections.
 */
const { promisePool } = require('../config/db');
const layoutCatalog = require('./ocrLayoutCatalogService');
const {
  findExtractorByCatalogId,
  createCatalogExtractor,
} = require('./catalogLayoutExtractorShared');

function parseLayoutSelections(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (_) { return {}; }
  }
  return raw;
}

async function loadOnboardingLayoutContext(churchId) {
  const [rows] = await promisePool.query(
    `SELECT onboarding_request_id, selected_layout_catalog_json
     FROM onboarding_requests
     WHERE church_id = ? AND layout_configuration_completed = 1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [churchId]
  );
  if (!rows.length) return null;
  return {
    onboardingRequestId: rows[0].onboarding_request_id,
    selections: parseLayoutSelections(rows[0].selected_layout_catalog_json),
  };
}

async function ensureOnboardingLayoutCandidates(churchId, recordType) {
  const result = { created: [], existing: [], catalogLayoutIds: [] };
  if (!churchId || !recordType || recordType === 'custom') return result;

  const ctx = await loadOnboardingLayoutContext(churchId);
  if (!ctx) return result;

  const catalogIds = ctx.selections[recordType];
  if (!Array.isArray(catalogIds) || catalogIds.length === 0) return result;

  result.catalogLayoutIds = catalogIds;

  for (const catalogLayoutId of catalogIds) {
    const existingId = await findExtractorByCatalogId(promisePool, churchId, recordType, catalogLayoutId);
    if (existingId) {
      result.existing.push(existingId);
      continue;
    }

    const newId = await createCatalogExtractor(promisePool, {
      churchId,
      recordType,
      catalogLayoutId,
      status: 'candidate',
      source: 'onboarding_selection',
      extraLearnedParams: { onboarding_request_id: ctx.onboardingRequestId },
    });
    result.created.push(newId);
  }

  return result;
}

async function resolveUploadLayoutTemplateId(churchId, recordType) {
  if (!churchId || !recordType || recordType === 'custom') return null;

  const ctx = await loadOnboardingLayoutContext(churchId);
  if (!ctx) return null;

  const catalogIds = ctx.selections[recordType];
  if (!Array.isArray(catalogIds) || catalogIds.length !== 1) return null;

  return findExtractorByCatalogId(promisePool, churchId, recordType, catalogIds[0]);
}

module.exports = {
  ensureOnboardingLayoutCandidates,
  resolveUploadLayoutTemplateId,
  loadOnboardingLayoutContext,
  findCandidateByCatalogId: (churchId, recordType, catalogLayoutId) =>
    findExtractorByCatalogId(promisePool, churchId, recordType, catalogLayoutId),
};
