const { query } = require('../config/database');

async function up() {
  console.log('Adding OTP fields to users table...');
  
  // Check if columns exist first to make it idempotent
  const checkColumns = await query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='users' AND column_name='otp_code';
  `);

  if (checkColumns.rows.length === 0) {
    await query(`
      ALTER TABLE users
      ADD COLUMN otp_code VARCHAR(10),
      ADD COLUMN otp_expiry TIMESTAMP,
      ADD COLUMN pending_email VARCHAR(255),
      ADD COLUMN pending_password VARCHAR(255),
      ADD COLUMN pending_name VARCHAR(255);
    `);
    console.log('OTP fields added successfully.');
  } else {
    console.log('OTP fields already exist.');
  }
}

async function down() {
  await query(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS otp_code,
    DROP COLUMN IF EXISTS otp_expiry,
    DROP COLUMN IF EXISTS pending_email,
    DROP COLUMN IF EXISTS pending_password,
    DROP COLUMN IF EXISTS pending_name;
  `);
}

module.exports = {
  up,
  down
};
