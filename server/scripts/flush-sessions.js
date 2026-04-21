/**
 * Flush all sessions from MySQL on build.
 * Prevents stale/poisoned sessions from surviving a dist rebuild.
 */

const path = require('path');
const fs = require('fs');

// Load .env from server root
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.AUTH_DB_HOST || process.env.DB_HOST || 'localhost',
    user: process.env.AUTH_DB_USER || process.env.DB_USER || 'orthodoxapps',
    password: process.env.AUTH_DB_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.AUTH_DB_NAME || process.env.AUTH_DB || process.env.DB_NAME || 'orthodoxmetrics_db',
    port: parseInt(process.env.AUTH_DB_PORT || process.env.DB_PORT || '3306'),
  });

  const [result] = await connection.execute('DELETE FROM sessions');
  const count = result.affectedRows || 0;
  console.log(`[flush-sessions] Cleared ${count} session(s) from database`);

  await connection.end();
}

main().catch((err) => {
  // Non-fatal — don't block the build if DB is unreachable (e.g. CI)
  console.warn(`[flush-sessions] Skipped: ${err.message}`);
});
