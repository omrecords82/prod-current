/**
 * Platform DB cache for expensive workflow runtime summaries.
 * Avoids scanning every church database on each executive overview refresh.
 */
const CACHE_KEY_OCR_SETUP = 'ocr.setup.wizard';
const STALE_MS = 15 * 60 * 1000;

async function readCacheRow(pool, cacheKey) {
  try {
    const [rows] = await pool.query(
      'SELECT payload, refreshed_at, refresh_error FROM workflow_runtime_cache WHERE cache_key = ?',
      [cacheKey]
    );
    if (!rows.length) return null;
    const payload = typeof rows[0].payload === 'object'
      ? rows[0].payload
      : JSON.parse(rows[0].payload || '{}');
    return {
      payload,
      refreshed_at: rows[0].refreshed_at,
      refresh_error: rows[0].refresh_error,
    };
  } catch {
    return null;
  }
}

function isStale(refreshedAt) {
  if (!refreshedAt) return true;
  return Date.now() - new Date(refreshedAt).getTime() > STALE_MS;
}

async function writeCacheRow(pool, cacheKey, payload, refreshError = null) {
  await pool.query(
    `INSERT INTO workflow_runtime_cache (cache_key, payload, refresh_error)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       payload = VALUES(payload),
       refresh_error = VALUES(refresh_error),
       refreshed_at = CURRENT_TIMESTAMP`,
    [cacheKey, JSON.stringify(payload), refreshError]
  );
}

/** Scan church DBs and persist aggregated OCR setup counters. */
async function refreshOcrSetupCache(pool) {
  const [churches] = await pool.query(
    `SELECT c.id, c.database_name
     FROM churches c
     WHERE c.database_name IS NOT NULL AND c.is_active = 1
     ORDER BY c.id`
  );

  let complete = 0;
  let incomplete = 0;
  let notStarted = 0;
  const { getChurchDbConnection } = require('../utils/dbSwitcher');

  for (const ch of churches) {
    try {
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

  const payload = {
    source: 'workflow_runtime_cache',
    churches_total: churches.length,
    setup_complete: complete,
    setup_in_progress: incomplete,
    setup_not_started: notStarted,
    stale: false,
    refreshed_at: new Date().toISOString(),
  };

  await writeCacheRow(pool, CACHE_KEY_OCR_SETUP, payload);
  return payload;
}

/** Read OCR setup stats; refresh when cache missing or stale. */
async function getOcrSetupStats(pool, { forceRefresh = false } = {}) {
  const cached = await readCacheRow(pool, CACHE_KEY_OCR_SETUP);
  if (!forceRefresh && cached && !isStale(cached.refreshed_at)) {
    return { ...cached.payload, cache_hit: true, cached_at: cached.refreshed_at };
  }

  try {
    const fresh = await refreshOcrSetupCache(pool);
    return { ...fresh, cache_hit: false };
  } catch (err) {
    if (cached?.payload) {
      return { ...cached.payload, cache_hit: true, stale: true, refresh_error: err.message };
    }
    throw err;
  }
}

module.exports = {
  CACHE_KEY_OCR_SETUP,
  refreshOcrSetupCache,
  getOcrSetupStats,
  isStale,
};
