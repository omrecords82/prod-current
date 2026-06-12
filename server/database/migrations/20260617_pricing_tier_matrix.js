/**
 * Upsert English pricing.* keys into translations_source from i18n.js defaults.
 * Run: node server/database/migrations/20260608_pricing_tier_matrix.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

function md5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

function extractPricingDefaults() {
  const src = fs.readFileSync(path.join(__dirname, '../../src/routes/i18n.js'), 'utf8');
  const entries = [];
  const re = /^\s+'(pricing\.[^']+)':\s+'((?:\\'|[^'])*)',?\s*$/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    entries.push([m[1], m[2].replace(/\\'/g, "'")]);
  }
  return entries;
}

async function main() {
  const entries = extractPricingDefaults();
  if (!entries.length) {
    throw new Error('No pricing.* keys found in i18n.js');
  }

  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'om',
    waitForConnections: true,
    connectionLimit: 2,
  });

  const CHUNK = 40;
  let affected = 0;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => '(?, ?, ?, ?)').join(', ');
    const values = [];
    for (const [key, text] of chunk) {
      values.push(key, 'pricing', text, md5(text));
    }
    const [result] = await pool.query(
      `INSERT INTO translations_source (translation_key, namespace, english_text, english_hash)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE
         english_text = VALUES(english_text),
         english_hash = VALUES(english_hash),
         namespace = VALUES(namespace)`,
      values
    );
    affected += result.affectedRows;
  }

  console.log(`Upserted ${entries.length} pricing keys (affected rows: ${affected})`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
