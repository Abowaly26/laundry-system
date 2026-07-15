const { query } = require('../config/database');

async function up() {
  console.log('🔄 Running migration: 011_allow_cancelled_item_status');
  try {
    // 1. Drop existing check constraints on order_items.status
    const constraintsResult = await query(`
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conclass
      WHERE rel.relname = 'order_items' AND con.contype = 'c' AND con.conname LIKE '%status%';
    `);

    for (let row of constraintsResult.rows) {
      await query(`ALTER TABLE order_items DROP CONSTRAINT IF EXISTS "${row.conname}"`);
    }

    // 2. Add the new CHECK constraint allowing 'cancelled'
    await query(`
      ALTER TABLE order_items 
      ADD CONSTRAINT order_items_status_check 
      CHECK (status IN ('pending', 'processing', 'ready', 'delivered', 'cancelled'))
    `);

    console.log('✅ Migration 011_allow_cancelled_item_status completed successfully!');
  } catch (error) {
    console.error('❌ Migration 011_allow_cancelled_item_status failed:', error);
    throw error;
  }
}

async function down() {
  try {
    // Revert check constraint back to not containing 'cancelled'
    const constraintsResult = await query(`
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conclass
      WHERE rel.relname = 'order_items' AND con.contype = 'c' AND con.conname LIKE '%status%';
    `);

    for (let row of constraintsResult.rows) {
      await query(`ALTER TABLE order_items DROP CONSTRAINT IF EXISTS "${row.conname}"`);
    }

    await query(`
      ALTER TABLE order_items 
      ADD CONSTRAINT order_items_status_check 
      CHECK (status IN ('pending', 'processing', 'ready', 'delivered'))
    `);
  } catch (error) {
    console.error('❌ Migration 011 rollback failed:', error);
  }
}

module.exports = { up, down };
