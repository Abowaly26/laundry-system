const { query } = require('../config/database');

async function up() {
  console.log('🔄 Running migration: 003_align_item_statuses');

  try {
    // 1. Update order_items status: 'received' => 'pending'
    const res1 = await query("UPDATE order_items SET status = 'pending' WHERE status = 'received'");
    console.log(`✅ Updated received => pending: ${res1.rowCount} items.`);

    // 2. Update order_items status: 'washing', 'drying', 'ironing' => 'processing'
    const res2 = await query("UPDATE order_items SET status = 'processing' WHERE status IN ('washing', 'drying', 'ironing')");
    console.log(`✅ Updated washing/drying/ironing => processing: ${res2.rowCount} items.`);

    console.log('✅ Migration 003_align_item_statuses completed successfully!');
  } catch (error) {
    console.error('❌ Migration 003_align_item_statuses failed:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Rolling back migration: 003_align_item_statuses');
  // No strict rollback needed or possible without information loss, keep it as empty success
}

module.exports = { up, down };
