#!/usr/bin/env node
/**
 * Reset a user's password by email address.
 *
 * Usage:
 *   node server/scripts/reset-password.js <email> <new-password>
 *
 * Example:
 *   node server/scripts/reset-password.js john@example.com NewPass123!
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: 'orthodoxmetrics_db',
  connectTimeout: 10000,
};

async function resetPassword(email, newPassword) {
  if (!email || !newPassword) {
    console.error('Usage: node reset-password.js <email> <new-password>');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // Look up user
    const [users] = await connection.query(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    const user = users[0];
    console.log(`Found user: ${user.first_name} ${user.last_name} (${user.email}) [${user.role}] active=${user.is_active}`);

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update
    await connection.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, user.id]
    );

    console.log(`Password reset successfully for ${user.email} (id=${user.id}).`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

const [,, email, newPassword] = process.argv;
resetPassword(email, newPassword).then(() => process.exit(0));
