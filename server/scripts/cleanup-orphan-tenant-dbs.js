#!/usr/bin/env node
/**
 * Drop om_church_* schemas that are no longer linked from churches.database_name.
 *
 * Usage:
 *   node server/scripts/cleanup-orphan-tenant-dbs.js --dry-run
 *   node server/scripts/cleanup-orphan-tenant-dbs.js --execute
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });

const mysql = require('mysql2/promise');

const EXECUTE = process.argv.includes('--execute');
const DRY_RUN = !EXECUTE || process.argv.includes('--dry-run');

async function main() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const appDb = process.env.DB_NAME || 'orthodoxmetrics_db';

  if (!user || !password) {
    console.error('DB_USER and DB_PASSWORD required');
    process.exit(1);
  }

  const conn = await mysql.createConnection({ host, user, password, multipleStatements: true });

  const [linkedRows] = await conn.query(
    `SELECT DISTINCT database_name AS db FROM ${appDb}.churches WHERE database_name IS NOT NULL AND database_name != ''`
  );
  const linked = new Set(linkedRows.map(r => r.db));

  const [schemas] = await conn.query(
    `SELECT SCHEMA_NAME AS db FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'om\\_church\\_%'`
  );

  const orphans = schemas.map(r => r.db).filter(db => !linked.has(db)).sort();
  const keep = schemas.map(r => r.db).filter(db => linked.has(db)).sort();

  console.log(`Host: ${host}`);
  console.log(`Linked tenant DBs (${keep.length}): ${keep.join(', ') || '(none)'}`);
  console.log(`Orphan tenant DBs (${orphans.length}):`);

  if (orphans.length === 0) {
    console.log('  (none)');
    await conn.end();
    return;
  }

  orphans.forEach(db => console.log(`  - ${db}`));

  if (DRY_RUN && !process.argv.includes('--execute')) {
    console.log('\nDry run — pass --execute to drop orphan schemas.');
    await conn.end();
    return;
  }

  console.log('\nDropping orphan schemas...');
  for (const db of orphans) {
    try {
      await conn.query(`DROP DATABASE IF EXISTS \`${db}\``);
      console.log(`  dropped ${db}`);
    } catch (err) {
      console.error(`  FAILED ${db}: ${err.message}`);
    }
  }

  await conn.end();
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
