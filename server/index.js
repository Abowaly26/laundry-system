// خادم نظام إدارة المغسلة الذكي - Main Server File (PostgreSQL)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection, query } = require('./src/config/database');
const { runPendingMigrations } = require('./src/migrations');
const seedDatabase = require('./src/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// تفعيل CORS للسماح بالطلبات من واجهة الـ React (Vite)
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3001',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    
    // السماح لكل طلب من Vercel أو Railway أو localhost
    if (!origin || 
        allowedOrigins.includes(origin) || 
        origin.includes('vercel.app') ||
        origin.includes('railway.app') ||
        origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));

// معالجة بيانات الـ JSON والـ Form URL Encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// مجلد لتخزين ملفات الـ QR أو الصور إذا لزم الأمر
app.use('/public', express.static(path.join(__dirname, 'public')));

// استيراد مسارات الـ API
const authRouter = require('./src/routes/auth');
const customersRouter = require('./src/routes/customers');
const servicesRouter = require('./src/routes/services');
const ordersRouter = require('./src/routes/orders');
const itemsRouter = require('./src/routes/items');
const paymentsRouter = require('./src/routes/payments');
const dashboardRouter = require('./src/routes/dashboard');
const usersRouter = require('./src/routes/users');
const itemTypesRouter = require('./src/routes/itemTypes');

// ربط المسارات
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/services', servicesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/items', itemsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/users', usersRouter);
app.use('/api/item-types', itemTypesRouter);

// اختبار الاتصال بالخادم
app.get('/api/health', async (req, res) => {
  console.log('🔍 Health check request received from:', req.ip, req.headers.origin);
  
  try {
    // التحقق من وجود بيانات في قاعدة البيانات
    const usersCount = await query('SELECT COUNT(*) as count FROM users');
    
    res.json({ 
      success: true, 
      message: 'الخادم يعمل بنجاح وقاعدة البيانات متصلة',
      database: 'PostgreSQL',
      usersCount: parseInt(usersCount.rows[0].count),
      seeded: parseInt(usersCount.rows[0].count) > 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'الخادم يعمل لكن قاعدة البيانات غير متصلة',
      error: error.message
    });
  }
});

// Endpoint لإعادة seed يدوياً (للطوارئ)
app.post('/api/seed', async (req, res) => {
  try {
    console.log('🔄 Manual seed requested');
    
    await seedDatabase();
    
    const usersCount = await query('SELECT COUNT(*) as count FROM users');
    const users = await query('SELECT id, name, email, role FROM users');
    
    res.json({ 
      success: true, 
      message: 'تم تهيئة قاعدة البيانات بنجاح',
      usersCount: parseInt(usersCount.rows[0].count),
      users: users.rows
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'فشل في تهيئة قاعدة البيانات',
      error: error.message 
    });
  }
});

// Endpoint للتحقق من المستخدمين الموجودين
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await query('SELECT id, name, email, role, is_active, created_at FROM users');
    res.json({ 
      success: true, 
      count: users.rows.length,
      users: users.rows
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// دالة تهيئة قاعدة البيانات
async function initializeDatabase() {
  console.log('\n🚀 Starting database initialization...\n');
  
  try {
    // 1. اختبار الاتصال
    console.log('1️⃣ Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }
    
    // 2. تشغيل migrations
    console.log('\n2️⃣ Running database migrations...');
    await runPendingMigrations();
    
    // 3. Seed البيانات الافتراضية
    console.log('\n3️⃣ Seeding default data...');
    await seedDatabase();
    
    console.log('\n✅ Database initialization completed successfully!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    console.error('Stack:', error.stack);
    
    // في production، لا نوقف السيرفر حتى لو فشل الـ seed
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Continuing despite database initialization errors (production mode)');
      return false;
    }
    
    throw error;
  }
}

// بدء تشغيل الخادم
async function startServer() {
  try {
    // تهيئة قاعدة البيانات أولاً
    await initializeDatabase();
    
    // ثم بدء الخادم
    app.listen(PORT, '0.0.0.0', () => {
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║                                                           ║');
      console.log('║       ✨ Smart Laundry Management System ✨              ║');
      console.log('║                                                           ║');
      console.log('╠═══════════════════════════════════════════════════════════╣');
      console.log('║                                                           ║');
      console.log(`║  ✅ Server Status: RUNNING                                ║`);
      console.log(`║  🌐 Port: ${PORT.toString().padEnd(47)}║`);
      console.log(`║  📡 Local: http://localhost:${PORT}/api`.padEnd(60) + '║');
      console.log(`║  🗄️  Database: PostgreSQL                                 ║`);
      console.log('║                                                           ║');
      console.log('╠═══════════════════════════════════════════════════════════╣');
      console.log('║                                                           ║');
      console.log('║  🔐 Default Accounts:                                     ║');
      console.log('║     👨‍💼 Admin: admin@laundry.com / admin123              ║');
      console.log('║     👤 Cashier: cashier@laundry.com / cashier123         ║');
      console.log('║     🔧 Worker: worker@laundry.com / worker123            ║');
      console.log('║                                                           ║');
      console.log('╚═══════════════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// معالجة إيقاف التشغيل بشكل آمن
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM signal received: closing server gracefully');
  const { closePool } = require('./src/config/database');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT signal received: closing server gracefully');
  const { closePool } = require('./src/config/database');
  await closePool();
  process.exit(0);
});

// بدء التشغيل
startServer();
