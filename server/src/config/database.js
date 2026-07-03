// PostgreSQL Database Configuration - احترافي
const { Pool } = require('pg');

// إنشاء connection pool للـ PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // مطلوب لـ Railway/Heroku/etc
  } : false,
  max: 20, // عدد الاتصالات الأقصى
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// معالجة أخطاء الاتصال
pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('✅ New database connection established');
});

// دالة مساعدة لتنفيذ queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`⚠️ Slow query (${duration}ms):`, text);
    }
    
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
}

// دالة للحصول على client من pool (للـ transactions)
async function getClient() {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('❌ Failed to get database client:', error);
    throw error;
  }
}

// دالة لاختبار الاتصال
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful');
    console.log('📅 Server time:', result.rows[0].current_time);
    console.log('🗄️  PostgreSQL version:', result.rows[0].pg_version.split(',')[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// دالة لإغلاق pool بشكل آمن
async function closePool() {
  try {
    await pool.end();
    console.log('✅ Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
    throw error;
  }
}

// Helper function للـ transactions
async function transaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool,
  transaction
};
