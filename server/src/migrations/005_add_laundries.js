// Migration 005: إضافة نظام المغاسل المتعددة + حساب Super Owner
const { query } = require('../config/database');

async function up() {
  console.log('  → Creating laundries table...');

  // 1. إنشاء جدول المغاسل
  await query(`
    CREATE TABLE IF NOT EXISTS laundries (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      phone VARCHAR(50),
      logo_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Trigger لتحديث updated_at
  await query(`
    CREATE OR REPLACE TRIGGER update_laundries_updated_at
    BEFORE UPDATE ON laundries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);

  console.log('  → Adding laundry_id to users table...');

  // 2. إضافة laundry_id لجدول users (nullable لأن super_owner ليس له مغسلة)
  await query(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS laundry_id INTEGER REFERENCES laundries(id) ON DELETE SET NULL
  `);

  // 3. تحديث CHECK constraint لدور users ليشمل super_owner
  await query(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check
  `);
  await query(`
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('super_owner', 'admin', 'cashier', 'worker'))
  `);

  console.log('  → Adding laundry_id to customers table...');

  // 4. إضافة laundry_id للعملاء
  await query(`
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS laundry_id INTEGER REFERENCES laundries(id) ON DELETE CASCADE
  `);

  console.log('  → Adding laundry_id to services table...');

  // 5. إضافة laundry_id للخدمات
  await query(`
    ALTER TABLE services
    ADD COLUMN IF NOT EXISTS laundry_id INTEGER REFERENCES laundries(id) ON DELETE CASCADE
  `);

  console.log('  → Adding laundry_id to orders table...');

  // 6. إضافة laundry_id للطلبات
  await query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS laundry_id INTEGER REFERENCES laundries(id) ON DELETE CASCADE
  `);

  // 7. إضافة indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_users_laundry ON users(laundry_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_laundry ON customers(laundry_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_services_laundry ON services(laundry_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_laundry ON orders(laundry_id)`);

  console.log('  → Inserting default laundries...');

  // 8. إدراج مغسلة افتراضية للبيانات الموجودة
  const laundry1Result = await query(`
    INSERT INTO laundries (name, address, phone)
    VALUES ('المغسلة الرئيسية', 'الرياض، الياسمين', '0500000001')
    ON CONFLICT DO NOTHING
    RETURNING id
  `);

  const laundry2Result = await query(`
    INSERT INTO laundries (name, address, phone)
    VALUES ('فرع جدة', 'جدة، الروضة', '0500000002')
    ON CONFLICT DO NOTHING
    RETURNING id
  `);

  // 9. تحديث البيانات الموجودة لربطها بالمغسلة الرئيسية
  if (laundry1Result.rows.length > 0) {
    const laundry1Id = laundry1Result.rows[0].id;
    await query(`UPDATE users SET laundry_id = $1 WHERE laundry_id IS NULL AND role != 'super_owner'`, [laundry1Id]);
    await query(`UPDATE customers SET laundry_id = $1 WHERE laundry_id IS NULL`, [laundry1Id]);
    await query(`UPDATE services SET laundry_id = $1 WHERE laundry_id IS NULL`, [laundry1Id]);
    await query(`UPDATE orders SET laundry_id = $1 WHERE laundry_id IS NULL`, [laundry1Id]);
  }

  console.log('  ✅ Migration 005 completed successfully');
}

async function down() {
  // التراجع: حذف الأعمدة والجدول
  await query(`ALTER TABLE orders DROP COLUMN IF EXISTS laundry_id`);
  await query(`ALTER TABLE services DROP COLUMN IF EXISTS laundry_id`);
  await query(`ALTER TABLE customers DROP COLUMN IF EXISTS laundry_id`);
  await query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
  await query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'cashier', 'worker'))`);
  await query(`ALTER TABLE users DROP COLUMN IF EXISTS laundry_id`);
  await query(`DROP TABLE IF EXISTS laundries CASCADE`);
}

module.exports = { up, down };
