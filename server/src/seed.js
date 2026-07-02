// ملف تهيئة البيانات - Database Seeding
const bcrypt = require('bcryptjs');
const db = require('./config/database');

function seedDatabase() {
  console.log('Starting database seeding...');

  // 1. إضافة المستخدمين الافتراضيين
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const cashierPasswordHash = bcrypt.hashSync('cashier123', 10);
  const workerPasswordHash = bcrypt.hashSync('worker123', 10);

  // إدخال المستخدمين إذا لم يكونوا موجودين
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);

  insertUser.run('صاحب المغسلة (المدير)', 'admin@laundry.com', adminPasswordHash, 'admin');
  insertUser.run('موظف الاستقبال', 'cashier@laundry.com', cashierPasswordHash, 'cashier');
  insertUser.run('عامل التشغيل', 'worker@laundry.com', workerPasswordHash, 'worker');

  console.log('Users seeded successfully.');

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

  console.log('Database seeding finished successfully!');
}

// تشغيل الـ seed إذا تم تشغيل الملف مباشرة
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
