/**
 * Global English OCR reference corpus — seeds platform-wide ocr_extractors (church_id NULL)
 * from ocr-reference-corpus-en.json and tracked reference images.
 */
const fs = require('fs');
const path = require('path');
const { promisePool } = require('../config/db');
const layoutCatalog = require('./ocrLayoutCatalogService');
const {
  findExtractorByCatalogId,
  createCatalogExtractor,
  normalizeColumnBands,
} = require('./catalogLayoutExtractorShared');

const MANIFEST_PATH = path.join(__dirname, '../config/ocr-reference-corpus-en.json');
const CORPUS_STORAGE_DIR = path.join(__dirname, '../storage/ocr-reference-corpus/en');

let cachedManifest = null;

function loadManifest() {
  if (cachedManifest) return cachedManifest;
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  cachedManifest = JSON.parse(raw);
  return cachedManifest;
}

function isEnglishLanguage(language) {
  if (!language) return true;
  const code = String(language).trim().toLowerCase();
  return code === 'en' || code === 'eng' || code === 'english';
}

function getReferenceImagePath(catalogLayoutId) {
  const filePath = path.join(CORPUS_STORAGE_DIR, `${catalogLayoutId}.jpg`);
  return fs.existsSync(filePath) ? filePath : null;
}

function getLayoutsForRecordType(recordType) {
  return (loadManifest().layouts || []).filter((l) => l.record_type === recordType);
}

function getSignaturePhrasesForCatalogId(catalogLayoutId) {
  const entry = (loadManifest().layouts || []).find((l) => l.catalog_layout_id === catalogLayoutId);
  return entry?.signature_phrases || [];
}

async function ensureGlobalLayoutExtractor(manifestEntry) {
  const {
    catalog_layout_id: catalogLayoutId,
    record_type: recordType,
    signature_phrases: signaturePhrases,
    column_bands: columnBands,
    header_y_threshold: headerYThreshold,
  } = manifestEntry;

  const layout = layoutCatalog.getLayoutById(catalogLayoutId);
  if (!layout) {
    throw new Error(`Catalog layout not found: ${catalogLayoutId}`);
  }

  const referenceImage = getReferenceImagePath(catalogLayoutId);
  const existingId = await findExtractorByCatalogId(promisePool, null, recordType, catalogLayoutId);

  if (existingId) {
    const [rows] = await promisePool.query(
      'SELECT learned_params FROM ocr_extractors WHERE id = ? LIMIT 1',
      [existingId]
    );
    let learned = {};
    if (rows[0]?.learned_params) {
      try {
        learned = typeof rows[0].learned_params === 'string'
          ? JSON.parse(rows[0].learned_params)
          : rows[0].learned_params;
      } catch (_) { learned = {}; }
    }
    learned.signature_phrases = signaturePhrases || [];
    learned.reference_image = referenceImage;
    learned.language = 'en';
    learned.source = 'global_reference_corpus';
    learned.catalog_layout_id = catalogLayoutId;

    const bandsJson = columnBands ? JSON.stringify(normalizeColumnBands(columnBands)) : null;
    await promisePool.query(
      `UPDATE ocr_extractors SET
         learned_params = ?,
         column_bands = COALESCE(?, column_bands),
         header_y_threshold = COALESCE(?, header_y_threshold),
         status = 'approved',
         updated_at = NOW()
       WHERE id = ?`,
      [JSON.stringify(learned), bandsJson, headerYThreshold ?? null, existingId]
    );
    return { id: existingId, created: false };
  }

  const newId = await createCatalogExtractor(promisePool, {
    churchId: null,
    recordType,
    catalogLayoutId,
    status: 'approved',
    source: 'global_reference_corpus',
    namePrefix: '[Global EN] ',
    referenceImage,
    columnBands: columnBands || null,
    headerYThreshold: headerYThreshold ?? 0.15,
    extraLearnedParams: {
      language: 'en',
      signature_phrases: signaturePhrases || [],
    },
  });

  return { id: newId, created: true };
}

/**
 * Idempotently seed all global English layouts, or only those for one record type.
 */
async function ensureGlobalEnglishLayouts(recordType = null) {
  const manifest = loadManifest();
  const entries = recordType
    ? manifest.layouts.filter((l) => l.record_type === recordType)
    : manifest.layouts;

  const result = { created: [], existing: [], catalogLayoutIds: [] };

  for (const entry of entries) {
    result.catalogLayoutIds.push(entry.catalog_layout_id);
    const { id, created } = await ensureGlobalLayoutExtractor(entry);
    if (created) result.created.push(id);
    else result.existing.push(id);
  }

  return result;
}

module.exports = {
  loadManifest,
  isEnglishLanguage,
  getReferenceImagePath,
  getLayoutsForRecordType,
  getSignaturePhrasesForCatalogId,
  ensureGlobalEnglishLayouts,
  CORPUS_STORAGE_DIR,
};
