/**
 * Anonymized OCR layout catalog for parish onboarding.
 * Sources: docs/ocr/template-registries/ — no church-identifying metadata exposed.
 */
const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../config/ocr-layout-catalog.json');

let cachedCatalog = null;

function loadCatalog() {
  if (cachedCatalog) return cachedCatalog;
  const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
  cachedCatalog = JSON.parse(raw);
  return cachedCatalog;
}

function getAllLayouts() {
  return loadCatalog().layouts || [];
}

function getLayoutById(id) {
  return getAllLayouts().find((l) => l.id === id) || null;
}

function getLayoutsForRecordTypes(recordTypes = []) {
  const set = new Set(recordTypes);
  return getAllLayouts().filter((l) => set.has(l.record_type));
}

function validateSelections(recordTypes, selectionsByType) {
  if (!selectionsByType || typeof selectionsByType !== 'object') {
    throw new Error('selections object required');
  }
  const selectedTypes = Object.keys(selectionsByType);
  for (const rt of recordTypes) {
    const ids = selectionsByType[rt];
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error(`Select at least one layout for ${rt} records`);
    }
    for (const id of ids) {
      const layout = getLayoutById(id);
      if (!layout) throw new Error(`Unknown layout: ${id}`);
      if (layout.record_type !== rt) {
        throw new Error(`Layout ${id} does not apply to ${rt} records`);
      }
    }
  }
  for (const rt of selectedTypes) {
    if (!recordTypes.includes(rt)) {
      throw new Error(`Record type not in enrollment selection: ${rt}`);
    }
  }
  return true;
}

module.exports = {
  loadCatalog,
  getAllLayouts,
  getLayoutById,
  getLayoutsForRecordTypes,
  validateSelections,
};
