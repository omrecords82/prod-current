/**
 * Scores ocr_extractors candidates against OCR page text to pick the best layout template.
 */
const { getSignaturePhrasesForCatalogId } = require('./globalLayoutCorpusService');

const MIN_MATCH_SCORE = 2;
const CHURCH_BOOST = 0.5;

function parseLearnedParams(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (_) { return {}; }
  }
  return raw;
}

function extractPageText(visionResultJson, ocrRawText) {
  if (ocrRawText && typeof ocrRawText === 'string') return ocrRawText;
  const annotation = visionResultJson?.fullTextAnnotation;
  if (annotation?.text) return annotation.text;
  if (Array.isArray(visionResultJson?.textAnnotations) && visionResultJson.textAnnotations[0]?.description) {
    return visionResultJson.textAnnotations[0].description;
  }
  return '';
}

function normalizeText(text) {
  return String(text || '').toUpperCase().replace(/\s+/g, ' ');
}

function getTemplatePhrases(templateRow) {
  const learned = parseLearnedParams(templateRow.learned_params);
  if (Array.isArray(learned.signature_phrases) && learned.signature_phrases.length) {
    return learned.signature_phrases;
  }
  if (learned.catalog_layout_id) {
    return getSignaturePhrasesForCatalogId(learned.catalog_layout_id);
  }
  return [];
}

function scoreTemplate(templateRow, pageTextUpper, { churchId } = {}) {
  const phrases = getTemplatePhrases(templateRow);
  if (!phrases.length) return 0;

  let score = 0;
  for (const phrase of phrases) {
    const needle = String(phrase).toUpperCase().trim();
    if (needle && pageTextUpper.includes(needle)) {
      score += 1;
    }
  }

  if (churchId && templateRow.church_id === churchId) {
    score += CHURCH_BOOST;
  }

  return score;
}

/**
 * @param {Array} templateRows rows from ocr_extractors
 * @param {object} visionResultJson
 * @param {string} ocrRawText
 * @param {{ churchId?: number|null, language?: string }} options
 */
function scoreTemplatesFromVision(templateRows, visionResultJson, ocrRawText, options = {}) {
  const pageTextUpper = normalizeText(extractPageText(visionResultJson, ocrRawText));
  if (!pageTextUpper) {
    return { best: null, candidates: [], pageTextLength: 0 };
  }

  const language = (options.language || 'en').toLowerCase();
  const candidates = [];

  for (const row of templateRows) {
    const learned = parseLearnedParams(row.learned_params);
    const rowLang = (learned.language || 'en').toLowerCase();
    if (rowLang !== language && rowLang !== 'en' && language !== 'en') continue;
    if (language === 'en' && rowLang && !['en', 'eng', 'english'].includes(rowLang)) continue;

    const score = scoreTemplate(row, pageTextUpper, options);
    if (score > 0) {
      candidates.push({ templateId: row.id, score, row });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const best = candidates.length && candidates[0].score >= MIN_MATCH_SCORE
    ? candidates[0]
    : null;

  return {
    best: best ? { id: best.templateId, score: best.score, row: best.row } : null,
    candidates: candidates.map((c) => ({ templateId: c.templateId, score: c.score })),
    pageTextLength: pageTextUpper.length,
  };
}

module.exports = {
  scoreTemplatesFromVision,
  scoreTemplate,
  MIN_MATCH_SCORE,
};
