// ملف تهيئة البيانات - Database Seeding
const bcrypt = require('bcryptjs');
const db = require('./config/database');

function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // التحقق من قاعدة البيانات أولاً
    const usersCountBefore = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    console.log(`👥 Current users count: ${usersCountBefore}`);

    // 1. إضافة المستخدمين الافتراضيين
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const cashierPasswordHash = bcrypt.hashSync('cashier123', 10);
    const workerPasswordHash = bcrypt.hashSync('worker123', 10);

    // إدخال المستخدمين إذا لم يكونوا موجودين
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (name, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);

    const admin = insertUser.run('صاحب المغسلة (المدير)', 'admin@laundry.com', adminPasswordHash, 'admin');
    const cashier = insertUser.run('موظف الاستقبال', 'cashier@laundry.com', cashierPasswordHash, 'cashier');
    const worker = insertUser.run('عامل التشغيل', 'worker@laundry.com', workerPasswordHash, 'worker');

    const usersCountAfter = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    console.log(`✅ Users seeded successfully. Total users: ${usersCountAfter}`);
    console.log(`   - Admin inserted: ${admin.changes > 0}`);
    console.log(`   - Cashier inserted: ${cashier.changes > 0}`);
    console.log(`   - Worker inserted: ${worker.changes > 0}`);

  // 2. إضافة الخدمات الافتراضية
  const insertService = db.prepare(`
    INSERT OR IGNORE INTO services (name, name_ar, price, unit, estimated_hours, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  // التحقق من وجود خدمات أولاً لتفادي التكرار
  const servicesCount = db.prepare('SELECT COUNT(*) as count FROM services').get().count;
  if (servicesCount === 0) {
    insertService.run('Regular Wash', 'غسيل عادي', 10.0, 'piece', 24);
    insertService.run('Dry Clean', 'غسيل جاف', 25.0, 'piece', 48);
    insertService.run('Ironing', 'كي فقط', 5.0, 'piece', 12);
    insertService.run('Carpet Cleaning', 'تنظيف سجاد', 15.0, 'kg', 72);
    insertService.run('Blanket Cleaning', 'تنظيف بطانيات', 30.0, 'piece', 48);
    console.log('Services seeded successfully.');
  } else {
    console.log('Services already exist. Skipping.');
  }

  // 3. إضافة عملاء افتراضيين لتجربة النظام
  const customersCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  if (customersCount === 0) {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (name, phone, address)
      VALUES (?, ?, ?)
    `);

    insertCustomer.run('محمد أحمد', '0501234567', 'الرياض، الياسمين');
    insertCustomer.run('أحمد خالد', '0557654321', 'جدة، الروضة');
    insertCustomer.run('سارة علي', '0549998887', 'الدمام، الزهور');
    console.log('Customers seeded successfully.');
  }

  console.log('✅ Database seeding finished successfully!');
  return true;
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// تشغيل الـ seed إذا تم تشغيل الملف مباشرة
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
