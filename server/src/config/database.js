// إعداد قاعدة البيانات - Database Configuration
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// تحديد مسار قاعدة البيانات
const DB_PATH = process.env.DB_PATH || './database/laundry.db';
const dbPath = path.resolve(__dirname, '../../', DB_PATH);

// إنشاء مجلد قاعدة البيانات إذا لم يكن موجوداً
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// إنشاء اتصال قاعدة البيانات
const db = new Database(dbPath);

// تفعيل المفاتيح الأجنبية و WAL mode للأداء الأفضل
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * إنشاء جميع الجداول - Create all tables
 */
function createTables() {
  db.exec(`
    -- جدول المستخدمين (مدير، كاشير، عامل)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'cashier', 'worker')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- جدول العملاء
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- جدول الخدمات
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'piece' CHECK(unit IN ('piece', 'kg')),
      estimated_hours INTEGER NOT NULL DEFAULT 24,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- جدول الطلبات
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'ready', 'delivered', 'cancelled')),
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      remaining_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      expected_delivery_at TEXT,
      delivered_at TEXT,
      notes TEXT DEFAULT '',
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    );

    -- جدول عناصر الطلب (القطع)
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      qr_code TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received', 'washing', 'drying', 'ironing', 'ready', 'delivered')),
      notes TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
    );

    -- جدول المدفوعات
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL DEFAULT 'cash' CHECK(method IN ('cash', 'electronic')),
      type TEXT NOT NULL DEFAULT 'full' CHECK(type IN ('deposit', 'balance', 'full')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      created_by INTEGER,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- جدول سجل حالة القطع
    CREATE TABLE IF NOT EXISTS item_status_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      updated_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (item_id) REFERENCES order_items(id) ON DELETE CASCADE,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- فهارس لتحسين الأداء
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_qr_code ON order_items(qr_code);
    CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);
    CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_item_status_log_item_id ON item_status_log(item_id);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  `);
}

// تشغيل إنشاء الجداول
createTables();

module.exports = db;
