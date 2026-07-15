// Migration 012: إضافة حقول الإعدادات الضريبية وكود الدولة للمغاسل
const { query } = require('../config/database');

async function up() {
  console.log('  → Adding tax_number, vat_percent, and country_code columns to laundries table...');
  await query(`
    ALTER TABLE laundries 
    ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vat_percent DOUBLE PRECISION DEFAULT 15,
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(10) DEFAULT '966'
  `);
}

module.exports = { up };
