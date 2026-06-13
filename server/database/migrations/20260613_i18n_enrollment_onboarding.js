/**
 * Seed missing translations_source keys and localized strings for enrollment/onboarding wave.
 * Run: node server/database/migrations/20260613_i18n_enrollment_onboarding.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const LOCALIZED = require('./20260613_i18n_enrollment_onboarding.data.js');

const LANGS = ['el', 'ru', 'ro', 'ka', 'zh'];

function md5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

function namespaceForKey(key) {
  return key.split('.')[0] || 'common';
}

function loadEnglishDefaults() {
  const src = fs.readFileSync(path.join(__dirname, '../../src/routes/i18n.js'), 'utf8');
  const start = src.indexOf('const ENGLISH_DEFAULTS = {');
  const end = src.indexOf('\n};', start);
  const block = src.slice(start, end);
  const re = /^\s+'([^']+)':\s+'((?:\\'|[^'])*)',?\s*$/gm;
  const out = {};
  let m;
  while ((m = re.exec(block)) !== null) out[m[1]] = m[2].replace(/\\'/g, "'");
  return out;
}

async function main() {
  const defaults = loadEnglishDefaults();
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'om',
    waitForConnections: true,
    connectionLimit: 2,
  });

  const allLocalizedKeys = new Set();
  for (const lang of LANGS) {
    Object.keys(LOCALIZED[lang] || {}).forEach((k) => allLocalizedKeys.add(k));
  }

  const [srcRows] = await pool.query('SELECT translation_key FROM translations_source WHERE is_active = 1');
  const srcSet = new Set(srcRows.map((r) => r.translation_key));

  const keysToSeed = [...allLocalizedKeys].filter((k) => defaults[k] && !srcSet.has(k));
  if (keysToSeed.length) {
    const values = [];
    for (const key of keysToSeed) {
      values.push(key, namespaceForKey(key), defaults[key], md5(defaults[key]));
    }
    const placeholders = keysToSeed.map(() => '(?, ?, ?, ?)').join(', ');
    await pool.query(
      `INSERT INTO translations_source (translation_key, namespace, english_text, english_hash)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE english_text = VALUES(english_text), english_hash = VALUES(english_hash)`,
      values,
    );
    console.log(`Upserted ${keysToSeed.length} translations_source keys`);
  } else {
    console.log('No new translations_source keys needed');
  }

  const [hashRows] = await pool.query('SELECT translation_key, english_hash FROM translations_source WHERE is_active = 1');
  const hashByKey = Object.fromEntries(hashRows.map((r) => [r.translation_key, r.english_hash]));

  let localizedUpserts = 0;
  for (const lang of LANGS) {
    const map = LOCALIZED[lang] || {};
    const entries = Object.entries(map);
    const CHUNK = 40;
    for (let i = 0; i < entries.length; i += CHUNK) {
      const chunk = entries.slice(i, i + CHUNK);
      const values = [];
      for (const [key, text] of chunk) {
        values.push(key, lang, text, hashByKey[key] || null, 'current');
      }
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const [result] = await pool.query(
        `INSERT INTO translations_localized (translation_key, language_code, translated_text, translated_from_hash, status)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE translated_text = VALUES(translated_text),
           translated_from_hash = VALUES(translated_from_hash),
           status = 'current',
           updated_at = CURRENT_TIMESTAMP`,
        values,
      );
      localizedUpserts += result.affectedRows;
    }
    console.log(`Localized ${entries.length} keys for ${lang}`);
  }

  console.log(`Done. Localized row operations: ${localizedUpserts}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
