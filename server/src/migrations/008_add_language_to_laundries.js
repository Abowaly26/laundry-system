const { query } = require('../config/database');

async function up() {
  console.log('🔄 Running migration: 008_add_language_to_laundries');
  try {
    await query(`
      ALTER TABLE laundries 
      ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'ar'
    `);
    console.log('✅ Migration 008_add_language_to_laundries completed!');
  } catch (error) {
    console.error('❌ Migration 008 failed:', error);
    throw error;
  }
}

async function down() {
  await query(`ALTER TABLE laundries DROP COLUMN IF EXISTS language`);
}

module.exports = { up, down };
