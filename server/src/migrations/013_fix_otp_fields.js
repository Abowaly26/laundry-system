const { query } = require('../config/database');

async function up() {
  console.log('Ensuring all OTP and pending fields exist in users table...');
  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP,
    ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS pending_password VARCHAR(255),
    ADD COLUMN IF NOT EXISTS pending_name VARCHAR(255);
  `);
  console.log('All OTP fields verified/added successfully.');
}

async function down() {
  // We won't drop them in down migration as they are critical
}

module.exports = {
  up,
  down
};
