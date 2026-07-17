require('dotenv').config();
const { query } = require('../config/database');

async function migrate() {
  try {
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
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
