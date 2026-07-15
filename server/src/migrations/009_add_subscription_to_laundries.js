const { query } = require('../config/database');

async function up() {
  console.log('  → Adding subscription columns to laundries table...');
  
  // إضافة أعمدة تتبع الباقات والاشتراكات لجدول المغاسل
  await query(`
    ALTER TABLE laundries 
    ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'lifetime', -- lifetime, monthly, yearly, semi_annual
    ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'paid' -- paid, unpaid, pending
  `);

  console.log('  ✅ Migration 009 completed successfully');
}

async function down() {
  await query(`
    ALTER TABLE laundries 
    DROP COLUMN IF EXISTS plan_type,
    DROP COLUMN IF EXISTS subscription_start_date,
    DROP COLUMN IF EXISTS subscription_end_date,
    DROP COLUMN IF EXISTS payment_status
  `);
}

module.exports = { up, down };
