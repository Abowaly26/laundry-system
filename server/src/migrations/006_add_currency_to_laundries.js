const { query } = require('../config/database');

async function up() {
  console.log('🔄 Running migration: 006_add_currency_to_laundries');
  try {
    // Add currency column to laundries table, defaulting to 'ر.س'
    await query(`
      ALTER TABLE laundries 
      ADD COLUMN IF NOT EXISTS currency VARCHAR(50) DEFAULT 'ر.س'
    `);
    console.log('✅ Migration 006_add_currency_to_laundries completed successfully!');
  } catch (error) {
    console.error('❌ Migration 006_add_currency_to_laundries failed:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Rolling back migration: 006_add_currency_to_laundries');
  try {
    await query(`
      ALTER TABLE laundries 
      DROP COLUMN IF EXISTS currency
    `);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
