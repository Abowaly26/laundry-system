// اختبار اتصال Railway
require('dotenv').config();
const { Pool } = require('pg');

async function testRailwayConnection() {
  console.log('🔍 Testing Railway Database Connection...\n');
  
  // تحقق من وجود DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env file!');
    console.log('📋 Please add this line to server/.env:');
    console.log('   DATABASE_URL=postgresql://user:pass@host:port/database');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL found');
  console.log('🔗 Connecting to:', process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@'));
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // اختبار الاتصال
    const result = await pool.query('SELECT NOW() as time, version() as version');
    console.log('\n✅ Connection successful!');
    console.log('📅 Server time:', result.rows[0].time);
    console.log('🗄️  PostgreSQL:', result.rows[0].version.split(',')[0]);
    
    // فحص الجداول الموجودة
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables in database:', tables.rows.length);
    if (tables.rows.length === 0) {
      console.log('⚠️  No tables found. You need to run schema.sql!');
    } else {
      tables.rows.forEach(row => {
        console.log('   -', row.table_name);
      });
    }
    
    await pool.end();
    console.log('\n✅ Test completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Check DATABASE_URL is correct in .env');
    console.error('   2. Make sure PostgreSQL database exists on Railway');
    console.error('   3. Check network/firewall settings');
    process.exit(1);
  }
}

testRailwayConnection();
