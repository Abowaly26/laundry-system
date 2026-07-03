// ملف تهيئة البيانات - Database Seeding for PostgreSQL
const bcrypt = require('bcryptjs');
const { query } = require('./config/database');

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // التحقق من قاعدة البيانات أولاً
    const usersCountResult = await query('SELECT COUNT(*) as count FROM users');
    const usersCountBefore = parseInt(usersCountResult.rows[0].count);
    console.log(`👥 Current users count: ${usersCountBefore}`);

    // 1. إضافة المستخدمين الافتراضيين
    console.log('🔄 Seeding users...');
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const cashierPasswordHash = bcrypt.hashSync('cashier123', 10);
    const workerPasswordHash = bcrypt.hashSync('worker123', 10);

    // إدخال المستخدمين إذا لم يكونوا موجودين (باستخدام ON CONFLICT)
    const insertUserQuery = `
      INSERT INTO users (name, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;

    const adminResult = await query(insertUserQuery, [
      'صاحب المغسلة (المدير)',
      'admin@laundry.com',
      adminPasswordHash,
      'admin'
    ]);

    const cashierResult = await query(insertUserQuery, [
      'موظف الاستقبال',
      'cashier@laundry.com',
      cashierPasswordHash,
      'cashier'
    ]);

    const workerResult = await query(insertUserQuery, [
      'عامل التشغيل',
      'worker@laundry.com',
      workerPasswordHash,
      'worker'
    ]);

    const usersCountAfterResult = await query('SELECT COUNT(*) as count FROM users');
    const usersCountAfter = parseInt(usersCountAfterResult.rows[0].count);
    
    console.log(`✅ Users seeded successfully. Total users: ${usersCountAfter}`);
    console.log(`   - Admin inserted: ${adminResult.rows.length > 0}`);
    console.log(`   - Cashier inserted: ${cashierResult.rows.length > 0}`);
    console.log(`   - Worker inserted: ${workerResult.rows.length > 0}`);

    // 2. إضافة الخدمات الافتراضية
    console.log('🔄 Seeding services...');
    const servicesCountResult = await query('SELECT COUNT(*) as count FROM services');
    const servicesCount = parseInt(servicesCountResult.rows[0].count);

    if (servicesCount === 0) {
      const insertServiceQuery = `
        INSERT INTO services (name, name_ar, price, unit, estimated_hours, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
      `;

      await query(insertServiceQuery, ['Regular Wash', 'غسيل عادي', 10.0, 'piece', 24]);
      await query(insertServiceQuery, ['Dry Clean', 'غسيل جاف', 25.0, 'piece', 48]);
      await query(insertServiceQuery, ['Ironing', 'كي فقط', 5.0, 'piece', 12]);
      await query(insertServiceQuery, ['Carpet Cleaning', 'تنظيف سجاد', 15.0, 'kg', 72]);
      await query(insertServiceQuery, ['Blanket Cleaning', 'تنظيف بطانيات', 30.0, 'piece', 48]);

      console.log('✅ Services seeded successfully.');
    } else {
      console.log('⏭️  Services already exist. Skipping.');
    }

    // 3. إضافة عملاء افتراضيين لتجربة النظام
    console.log('🔄 Seeding customers...');
    const customersCountResult = await query('SELECT COUNT(*) as count FROM customers');
    const customersCount = parseInt(customersCountResult.rows[0].count);

    if (customersCount === 0) {
      const insertCustomerQuery = `
        INSERT INTO customers (name, phone, address)
        VALUES ($1, $2, $3)
      `;

      await query(insertCustomerQuery, ['محمد أحمد', '0501234567', 'الرياض، الياسمين']);
      await query(insertCustomerQuery, ['أحمد خالد', '0557654321', 'جدة، الروضة']);
      await query(insertCustomerQuery, ['سارة علي', '0549998887', 'الدمام، الزهور']);

      console.log('✅ Customers seeded successfully.');
    } else {
      console.log('⏭️  Customers already exist. Skipping.');
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
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
