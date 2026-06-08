/**
 * Shared helpers for seeding ocr_extractors from catalog / reference-corpus layouts.
 */
const layoutCatalog = require('./ocrLayoutCatalogService');

const ANCHOR_CONFIGS = {
  baptism: {
    record_number: { phrases: ['NO', 'N°', 'NUMBER', 'RECORD', 'PARISH RECORD'], direction: 'right' },
    child_first_name: { phrases: ['NAME OF CHILD', 'CHILD', 'FIRST NAME'], direction: 'below' },
    child_last_name: { phrases: ['LAST NAME', 'SURNAME', 'FAMILY NAME'], direction: 'below' },
    birth_date: { phrases: ['DATE OF BIRTH', 'BIRTH DATE', 'BORN'], direction: 'below' },
    baptism_date: { phrases: ['DATE OF BAPTISM', 'BAPTISM DATE', 'BAPTIZED', 'RECEPTION DATE'], direction: 'below' },
    birthplace: { phrases: ['PLACE OF BIRTH', 'BIRTHPLACE', 'CITY OF BIRTH', 'BORN IN'], direction: 'below' },
    sponsors: { phrases: ['FULL NAMES OF SPONSORS', 'NAMES OF SPONSORS', 'SPONSORS', 'GODPARENTS', 'GOD PARENTS'], direction: 'below' },
    parents: { phrases: ['PARENTS', 'FATHER', 'MOTHER', 'NAME OF PARENTS', "FATHER'S NAME", "MOTHER'S NAME"], direction: 'below' },
    clergy: { phrases: ["PRIEST'S NAME", 'PRIEST NAME', 'PRIEST', 'CLERGY', 'PERFORMED BY', 'SACRAMENTS PERFORMED BY'], direction: 'right' },
  },
  marriage: {
    groom_name: { phrases: ['GROOM', 'BRIDEGROOM', 'HUSBAND', 'NAME OF GROOM'], direction: 'below' },
    bride_name: { phrases: ['BRIDE', 'WIFE', 'NAME OF BRIDE'], direction: 'below' },
    date_of_marriage: { phrases: ['DATE OF MARRIAGE', 'MARRIAGE DATE', 'WEDDING DATE', 'MARRIED'], direction: 'below' },
    witnesses: { phrases: ['WITNESSES', 'WITNESS', 'BEST MAN', 'KOOM', 'KUMOVI'], direction: 'below' },
    officiant: { phrases: ['PRIEST', 'CLERGY', 'OFFICIANT', 'PERFORMED BY', 'SACRAMENTS PERFORMED BY'], direction: 'right' },
  },
  funeral: {
    deceased_name: { phrases: ['DECEASED', 'NAME OF DECEASED', 'DECEDENT', 'FULL NAME'], direction: 'below' },
    date_of_death: { phrases: ['DATE OF DEATH', 'DIED', 'DEATH DATE'], direction: 'below' },
    date_of_funeral: { phrases: ['DATE OF FUNERAL', 'FUNERAL DATE', 'FUNERAL SERVICE'], direction: 'below' },
    date_of_burial: { phrases: ['DATE OF BURIAL', 'BURIAL DATE', 'INTERMENT', 'BURIED'], direction: 'below' },
    place_of_burial: { phrases: ['PLACE OF BURIAL', 'CEMETERY', 'INTERMENT PLACE', 'BURIED AT'], direction: 'below' },
    age_at_death: { phrases: ['AGE', 'AGE AT DEATH', 'YEARS OLD'], direction: 'right' },
    cause_of_death: { phrases: ['CAUSE OF DEATH', 'CAUSE', 'MANNER OF DEATH'], direction: 'below' },
    officiant: { phrases: ['PRIEST', 'CLERGY', 'OFFICIANT', 'PERFORMED BY'], direction: 'right' },
  },
};

const FIELD_KEYS_BY_TYPE = {
  baptism: Object.keys(ANCHOR_CONFIGS.baptism),
  marriage: Object.keys(ANCHOR_CONFIGS.marriage),
  funeral: Object.keys(ANCHOR_CONFIGS.funeral),
};

function mapCatalogExtractionMode(catalogMode) {
  if (catalogMode === 'narrative_block') return 'auto';
  if (['tabular', 'form', 'multi_form', 'auto'].includes(catalogMode)) return catalogMode;
  return 'auto';
}

function humanizeFieldKey(key) {
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeColumnBands(columnBands) {
  if (!columnBands || !Array.isArray(columnBands)) return null;
  return columnBands.map((band) => {
    if (Array.isArray(band)) return band;
    return [band.start ?? band.x0 ?? 0, band.end ?? band.x1 ?? 1];
  });
}

async function seedExtractorFields(pool, extractorId, recordType, extractionMode) {
  if (!['form', 'multi_form', 'auto'].includes(extractionMode)) return;

  const fieldKeys = FIELD_KEYS_BY_TYPE[recordType];
  if (!fieldKeys?.length) return;

  const anchors = ANCHOR_CONFIGS[recordType] || {};

  for (let i = 0; i < fieldKeys.length; i++) {
    const key = fieldKeys[i];
    const anchor = anchors[key];
    if (!anchor) continue;

    const [existing] = await pool.query(
      'SELECT id FROM ocr_extractor_fields WHERE extractor_id = ? AND `key` = ? LIMIT 1',
      [extractorId, key]
    );
    if (existing.length) continue;

    await pool.query(
      `INSERT INTO ocr_extractor_fields
         (extractor_id, name, \`key\`, field_type, column_index, sort_order,
          anchor_phrases, anchor_direction, search_zone)
       VALUES (?, ?, ?, 'text', ?, ?, ?, ?, NULL)`,
      [
        extractorId,
        humanizeFieldKey(key),
        key,
        i,
        i,
        JSON.stringify(anchor.phrases),
        anchor.direction,
      ]
    );
  }
}

async function findExtractorByCatalogId(pool, churchId, recordType, catalogLayoutId) {
  const churchClause = churchId == null
    ? 'AND church_id IS NULL'
    : 'AND church_id = ?';
  const params = churchId == null
    ? [recordType, catalogLayoutId]
    : [recordType, churchId, catalogLayoutId];

  const [rows] = await pool.query(
    `SELECT id FROM ocr_extractors
     WHERE record_type = ? ${churchClause}
       AND JSON_UNQUOTE(JSON_EXTRACT(learned_params, '$.catalog_layout_id')) = ?
     LIMIT 1`,
    params
  );
  return rows[0]?.id || null;
}

async function createCatalogExtractor(pool, {
  churchId = null,
  recordType,
  catalogLayoutId,
  status = 'candidate',
  source,
  extraLearnedParams = {},
  columnBands = null,
  headerYThreshold = 0.15,
  namePrefix = '',
  referenceImage = null,
}) {
  const layout = layoutCatalog.getLayoutById(catalogLayoutId);
  if (!layout || layout.record_type !== recordType) {
    throw new Error(`Invalid catalog layout ${catalogLayoutId} for ${recordType}`);
  }

  const extractionMode = mapCatalogExtractionMode(layout.extraction_mode);
  const learnedParams = {
    catalog_layout_id: catalogLayoutId,
    catalog_extraction_mode: layout.extraction_mode,
    language: extraLearnedParams.language || 'en',
    source,
    signature_phrases: extraLearnedParams.signature_phrases || null,
    reference_image: referenceImage || null,
    ...extraLearnedParams,
  };

  const bandsJson = columnBands ? JSON.stringify(normalizeColumnBands(columnBands)) : null;
  const prefix = namePrefix || (churchId == null ? '[Global EN] ' : '[Onboarding] ');

  const [result] = await pool.query(
    `INSERT INTO ocr_extractors
       (name, description, record_type, page_mode, extraction_mode, column_bands,
        header_y_threshold, is_default, status, church_id, learned_params, created_at, updated_at)
     VALUES (?, ?, ?, 'single', ?, ?, ?, 0, ?, ?, ?, NOW(), NOW())`,
    [
      `${prefix}${layout.title}`,
      `${layout.description} (catalog: ${catalogLayoutId})`,
      recordType,
      extractionMode,
      bandsJson,
      headerYThreshold,
      status,
      churchId,
      JSON.stringify(learnedParams),
    ]
  );

  const extractorId = result.insertId;
  await seedExtractorFields(pool, extractorId, recordType, extractionMode);
  return extractorId;
}

module.exports = {
  ANCHOR_CONFIGS,
  FIELD_KEYS_BY_TYPE,
  mapCatalogExtractionMode,
  humanizeFieldKey,
  normalizeColumnBands,
  seedExtractorFields,
  findExtractorByCatalogId,
  createCatalogExtractor,
};
