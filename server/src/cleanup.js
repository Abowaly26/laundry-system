require('dotenv').config();
const { query, closePool } = require('./config/database');

async function cleanup() {
  console.log('🧹 Starting Database Cleanup of Duplicate Laundries...');
  try {
    // 1. Get all duplicate laundry groupings
    const groupsRes = await query(`
      SELECT name, array_agg(id ORDER BY id) as ids
      FROM laundries
      GROUP BY name
      HAVING count(id) > 1
    `);

    console.log(`🔍 Found ${groupsRes.rows.length} groups of duplicate laundries.`);

    for (const group of groupsRes.rows) {
      const name = group.name;
      const ids = group.ids; // array of IDs, first one is primary, rest are duplicates
      const primaryId = ids[0];
      const duplicateIds = ids.slice(1);

      console.log(` Laundry: "${name}" | Primary ID: ${primaryId} | Duplicates: ${duplicateIds.join(', ')}`);

      // 2. Re-link users
      const usersRes = await query(`
        UPDATE users 
        SET laundry_id = $1 
        WHERE laundry_id = ANY($2::int[])
      `, [primaryId, duplicateIds]);
      console.log(`   - Re-linked ${usersRes.rowCount} users.`);

      // 3. Re-link customers
      const customersRes = await query(`
        UPDATE customers 
        SET laundry_id = $1 
        WHERE laundry_id = ANY($2::int[])
      `, [primaryId, duplicateIds]);
      console.log(`   - Re-linked ${customersRes.rowCount} customers.`);

      // 4. Re-link services
      const servicesRes = await query(`
        UPDATE services 
        SET laundry_id = $1 
        WHERE laundry_id = ANY($2::int[])
      `, [primaryId, duplicateIds]);
      console.log(`   - Re-linked ${servicesRes.rowCount} services.`);

      // 5. Re-link orders
      const ordersRes = await query(`
        UPDATE orders 
        SET laundry_id = $1 
        WHERE laundry_id = ANY($2::int[])
      `, [primaryId, duplicateIds]);
      console.log(`   - Re-linked ${ordersRes.rowCount} orders.`);

      // 6. Delete duplicate laundries
      const deleteRes = await query(`
        DELETE FROM laundries 
        WHERE id = ANY($1::int[])
      `, [duplicateIds]);
      console.log(`   - Deleted ${deleteRes.rowCount} duplicate laundry rows.`);
    }

    console.log('✅ Database cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  } finally {
    await closePool();
  }
}

cleanup();
