// ملف تهيئة البيانات - Database Seeding for PostgreSQL (Multi-Laundry)
const bcrypt = require('bcryptjs');
const { query } = require('./config/database');

async function seedDatabase() {
  console.log('🌱 Starting database seeding (Multi-Laundry)...');

  try {
    // ==============================
    // 1. إنشاء المغاسل الافتراضية
    // ==============================
    console.log('🏪 Seeding laundries...');
    const insertLaundryQuery = `
      INSERT INTO laundries (name, address, phone)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    const laundry1Result = await query(insertLaundryQuery, [
      'المغسلة الرئيسية',
      'الرياض، حي الياسمين',
      '0500000001'
    ]);

    const laundry2Result = await query(insertLaundryQuery, [
      'فرع جدة',
      'جدة، حي الروضة',
      '0500000002'
    ]);

    // الحصول على IDs المغاسل (سواء تم إنشاؤها أو كانت موجودة)
    const laundry1IdResult = await query(
      "SELECT id FROM laundries WHERE name = 'المغسلة الرئيسية' LIMIT 1"
    );
    const laundry2IdResult = await query(
      "SELECT id FROM laundries WHERE name = 'فرع جدة' LIMIT 1"
    );

    const laundry1Id = laundry1IdResult.rows[0]?.id;
    const laundry2Id = laundry2IdResult.rows[0]?.id;

    console.log(`✅ Laundries ready: [1]=${laundry1Id}, [2]=${laundry2Id}`);

    // ==============================
    // 2. إضافة المستخدمين
    // ==============================
    console.log('👥 Seeding users...');

    const superOwnerPasswordHash = bcrypt.hashSync('owner123', 10);
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const admin2PasswordHash = bcrypt.hashSync('admin123', 10);
    const cashierPasswordHash = bcrypt.hashSync('cashier123', 10);
    const workerPasswordHash = bcrypt.hashSync('worker123', 10);

    const insertUserQuery = `
      INSERT INTO users (name, email, password_hash, role, laundry_id, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;

    // صاحب السيستم (بدون مغسلة)
    const superOwnerResult = await query(insertUserQuery, [
      'صاحب النظام',
      'owner@system.com',
      superOwnerPasswordHash,
      'super_owner',
      null
    ]);

    // أدمن مغسلة 1
    const admin1Result = await query(insertUserQuery, [
      'مدير المغسلة الرئيسية',
      'admin@laundry.com',
      adminPasswordHash,
      'admin',
      laundry1Id
    ]);

    // أدمن مغسلة 2
    const admin2Result = await query(insertUserQuery, [
      'مدير فرع جدة',
      'admin2@laundry2.com',
      admin2PasswordHash,
      'admin',
      laundry2Id
    ]);

    // موظف استقبال مغسلة 1
    const cashierResult = await query(insertUserQuery, [
      'موظف الاستقبال',
      'cashier@laundry.com',
      cashierPasswordHash,
      'cashier',
      laundry1Id
    ]);

    // عامل مغسلة 1
    const workerResult = await query(insertUserQuery, [
      'عامل التشغيل',
      'worker@laundry.com',
      workerPasswordHash,
      'worker',
      laundry1Id
    ]);

    const usersCountResult = await query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Users seeded. Total: ${usersCountResult.rows[0].count}`);
    console.log(`   - Super Owner: ${superOwnerResult.rows.length > 0 ? '✅ new' : '⏭️ exists'}`);
    console.log(`   - Admin (Laundry 1): ${admin1Result.rows.length > 0 ? '✅ new' : '⏭️ exists'}`);
    console.log(`   - Admin (Laundry 2): ${admin2Result.rows.length > 0 ? '✅ new' : '⏭️ exists'}`);

    // ==============================
    // 3. الخدمات الافتراضية (لكل مغسلة)
    // ==============================
    console.log('✨ Seeding services...');

    const servicesCountResult = await query('SELECT COUNT(*) as count FROM services');
    if (parseInt(servicesCountResult.rows[0].count) === 0) {
      const insertServiceQuery = `
        INSERT INTO services (name, name_ar, price, unit, estimated_hours, is_active, laundry_id)
        VALUES ($1, $2, $3, $4, $5, true, $6)
      `;

      const defaultServices = [
        ['Wash Only', 'غسيل فقط', 10.0, 'piece', 24],
        ['Iron Only', 'كي فقط', 5.0, 'piece', 12],
        ['Wash & Iron', 'غسيل وكي', 15.0, 'piece', 24],
        ['Dry Clean', 'غسيل جاف', 25.0, 'piece', 48],
        ['Urgent Wash & Iron', 'غسيل وكي مستعجل', 25.0, 'piece', 6],
      ];

      // إضافة الخدمات لكل مغسلة
      for (const service of defaultServices) {
        await query(insertServiceQuery, [...service, laundry1Id]);
        if (laundry2Id) {
          await query(insertServiceQuery, [...service, laundry2Id]);
        }
      }

      console.log('✅ Services seeded for all laundries.');
    } else {
      console.log('⏭️  Services already exist. Skipping.');
    }

    // ==============================
    // 4. عملاء تجريبيون (لكل مغسلة)
    // ==============================
    console.log('👤 Seeding customers...');
    const customersCountResult = await query('SELECT COUNT(*) as count FROM customers');
    if (parseInt(customersCountResult.rows[0].count) === 0) {
      const insertCustomerQuery = `
        INSERT INTO customers (name, phone, address, laundry_id) VALUES ($1, $2, $3, $4)
      `;

      await query(insertCustomerQuery, ['محمد أحمد', '0501234567', 'الرياض، الياسمين', laundry1Id]);
      await query(insertCustomerQuery, ['أحمد خالد', '0557654321', 'الرياض، العليا', laundry1Id]);
      await query(insertCustomerQuery, ['سارة علي', '0549998887', 'جدة، الروضة', laundry2Id]);

      console.log('✅ Customers seeded.');
    } else {
      console.log('⏭️  Customers already exist. Skipping.');
    }

    console.log('\n✅ Database seeding finished successfully!');
    console.log('\n📋 Default Accounts:');
    console.log('   👑 Super Owner: owner@system.com / owner123');
    console.log('   🏪 Admin (Laundry 1): admin@laundry.com / admin123');
    console.log('   🏪 Admin (Laundry 2): admin2@laundry2.com / admin123');
    console.log('   👤 Cashier: cashier@laundry.com / cashier123');
    console.log('   🔧 Worker: worker@laundry.com / worker123');

    return true;

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => { console.log('✅ Seeding completed.'); process.exit(0); })
    .catch((error) => { console.error('❌ Seeding failed:', error); process.exit(1); });
}

module.exports = seedDatabase;
