const { query } = require('../config/database');

async function up() {
  console.log('🔄 Running migration: 004_fix_item_status_check_constraint');

  try {
    // 1. Drop existing check constraints on order_items.status
    // We dynamically search for the constraint name checking status on order_items table.
    const constraintsResult = await query(`
      SELECT con.conname
      FROM pg_catalog.pg_constraint con
      INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
      INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'order_items' AND con.contype = 'c' AND con.conname LIKE '%status%';
    `);

    for (const row of constraintsResult.rows) {
      console.log(`   - Dropping constraint: ${row.conname}`);
      await query(`ALTER TABLE order_items DROP CONSTRAINT IF EXISTS "${row.conname}"`);
    }

    // 2. Update existing legacy statuses if any remain to pending or processing
    const res1 = await query("UPDATE order_items SET status = 'pending' WHERE status = 'received'");
    console.log(`   - Updated received => pending: ${res1.rowCount} items.`);
    
    const res2 = await query("UPDATE order_items SET status = 'processing' WHERE status IN ('washing', 'drying', 'ironing')");
    console.log(`   - Updated washing/drying/ironing => processing: ${res2.rowCount} items.`);

    // Also update history status log
    await query("UPDATE item_status_log SET old_status = 'pending' WHERE old_status = 'received'");
    await query("UPDATE item_status_log SET new_status = 'pending' WHERE new_status = 'received'");
    await query("UPDATE item_status_log SET old_status = 'processing' WHERE old_status IN ('washing', 'drying', 'ironing')");
    await query("UPDATE item_status_log SET new_status = 'processing' WHERE new_status IN ('washing', 'drying', 'ironing')");

    // 3. Alter default value of status column
    await query("ALTER TABLE order_items ALTER COLUMN status SET DEFAULT 'pending'");

    // 4. Add the new CHECK constraint
    await query(`
      ALTER TABLE order_items 
      ADD CONSTRAINT order_items_status_check 
      CHECK (status IN ('pending', 'processing', 'ready', 'delivered'))
    `);

    console.log('✅ Migration 004_fix_item_status_check_constraint completed successfully!');
  } catch (error) {
    console.error('❌ Migration 004_fix_item_status_check_constraint failed:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Rolling back migration: 004_fix_item_status_check_constraint');
  try {
    const constraintsResult = await query(`
      SELECT con.conname
      FROM pg_catalog.pg_constraint con
      INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
      INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'order_items' AND con.contype = 'c' AND con.conname = 'order_items_status_check';
    `);

    for (const row of constraintsResult.rows) {
      await query(`ALTER TABLE order_items DROP CONSTRAINT IF EXISTS "${row.conname}"`);
    }
    
    await query("ALTER TABLE order_items ALTER COLUMN status SET DEFAULT 'received'");
    
    await query(`
      ALTER TABLE order_items 
      ADD CONSTRAINT order_items_status_check 
      CHECK (status IN ('received', 'washing', 'drying', 'ironing', 'ready', 'delivered'))
    `);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
