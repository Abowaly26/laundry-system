// Migration Script - Initial Schema for PostgreSQL
// تحويل احترافي من SQLite إلى PostgreSQL

const { query } = require('../config/database');

async function up() {
  console.log('🔄 Running migration: 001_initial_schema');

  try {
    // Enable UUID extension (optional, for future use)
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // 1. جدول المستخدمين (مدير، كاشير، عامل)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'cashier', 'worker')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table created: users');

    // 2. جدول العملاء
    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        address TEXT DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table created: customers');

    // 3. جدول الخدمات
    await query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        unit VARCHAR(20) NOT NULL DEFAULT 'piece' CHECK(unit IN ('piece', 'kg')),
        estimated_hours INTEGER NOT NULL DEFAULT 24,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table created: services');

    // 4. جدول الطلبات
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' 
          CHECK(status IN ('pending', 'processing', 'ready', 'delivered', 'cancelled')),
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        remaining_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expected_delivery_at TIMESTAMP,
        delivered_at TIMESTAMP,
        notes TEXT DEFAULT '',
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      )
    `);
    console.log('✅ Table created: orders');

    // 5. جدول عناصر الطلب (القطع)
    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        item_type VARCHAR(255) NOT NULL,
        qr_code VARCHAR(255) UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'received' 
          CHECK(status IN ('received', 'washing', 'drying', 'ironing', 'ready', 'delivered')),
        notes TEXT DEFAULT '',
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
      )
    `);
    console.log('✅ Table created: order_items');

    // 6. جدول المدفوعات
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        method VARCHAR(50) NOT NULL DEFAULT 'cash' CHECK(method IN ('cash', 'electronic')),
        type VARCHAR(50) NOT NULL DEFAULT 'full' CHECK(type IN ('deposit', 'balance', 'full')),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Table created: payments');

    // 7. جدول سجل حالة القطع
    await query(`
      CREATE TABLE IF NOT EXISTS item_status_log (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        updated_by INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES order_items(id) ON DELETE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Table created: item_status_log');

    // إنشاء الفهارس لتحسين الأداء
    console.log('🔄 Creating indexes...');

    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    
    await query(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`);
    
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`);
    
    await query(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_order_items_qr_code ON order_items(qr_code)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status)`);
    
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC)`);
    
    await query(`CREATE INDEX IF NOT EXISTS idx_item_status_log_item_id ON item_status_log(item_id)`);

    console.log('✅ All indexes created');

    // إنشاء trigger لتحديث updated_at تلقائياً
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await query(`
      CREATE TRIGGER update_order_items_updated_at 
      BEFORE UPDATE ON order_items 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column()
    `);

    console.log('✅ Trigger created for auto-updating timestamps');

    console.log('✅ Migration completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Rolling back migration: 001_initial_schema');

  try {
    // حذف الجداول بالترتيب العكسي
    await query(`DROP TABLE IF EXISTS item_status_log CASCADE`);
    await query(`DROP TABLE IF EXISTS payments CASCADE`);
    await query(`DROP TABLE IF EXISTS order_items CASCADE`);
    await query(`DROP TABLE IF EXISTS orders CASCADE`);
    await query(`DROP TABLE IF EXISTS services CASCADE`);
    await query(`DROP TABLE IF EXISTS customers CASCADE`);
    await query(`DROP TABLE IF EXISTS users CASCADE`);
    
    // حذف الـ function
    await query(`DROP FUNCTION IF EXISTS update_updated_at_column CASCADE`);

    console.log('✅ Rollback completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
