#!/usr/bin/env node
// 🗄️ Database Setup Script for Railway PostgreSQL
// يقوم بإنشاء الجداول وتهيئة البيانات الأولية

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// تحميل متغيرات البيئة
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');
  
  try {
    // 1. اختبار الاتصال
    console.log('📡 Testing database connection...');
    const testResult = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Connected to PostgreSQL');
    console.log(`   Time: ${testResult.rows[0].current_time}`);
    console.log(`   Version: ${testResult.rows[0].pg_version.split(',')[0]}\n`);

    // 2. قراءة ملف Schema
    console.log('📄 Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error('schema.sql file not found!');
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Schema file loaded\n');

    // 3. تنفيذ Schema
    console.log('🔨 Creating database schema...');
    await pool.query(schema);
    console.log('✅ Schema created successfully\n');

    // 4. التحقق من الجداول
    console.log('🔍 Verifying tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('✅ Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    console.log('');

    // 5. تشغيل Seed (اختياري)
    console.log('🌱 Do you want to seed the database with initial data?');
    console.log('   Run: npm run seed');
    console.log('');

    console.log('✅ Database setup completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Run: npm run seed (to add default users & services)');
    console.log('   2. Start your server: npm start');
    console.log('   3. Test the API: /api/health\n');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Check DATABASE_URL in .env');
    console.error('   2. Verify PostgreSQL service is running on Railway');
    console.error('   3. Check Railway logs for connection errors\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// معالجة أخطاء غير متوقعة
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// تشغيل Setup
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = setupDatabase;
