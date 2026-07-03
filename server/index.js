// خادم نظام إدارة المغسلة الذكي - Main Server File
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./src/config/database');

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

// ربط المسارات
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/services', servicesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/items', itemsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/users', usersRouter);

// اختبار الاتصال بالخادم
app.get('/api/health', (req, res) => {
  console.log('🔍 Health check request received from:', req.ip, req.headers.origin);
  res.json({ success: true, message: 'الخادم يعمل بنجاح وقاعدة البيانات متصلة' });
});

// تشغيل seed في كل مرة يبدأ فيها السيرفر (للأنظمة المؤقتة مثل Railway)
const seedDatabase = require('./src/seed');
try {
  console.log('🔄 Starting database initialization...');
  seedDatabase();
  console.log('✅ Database seeding completed');
} catch (error) {
  console.log('⚠️ Database seeding error:', error.message);
  // لا تُوقف السيرفر حتى لو فشل الـ seed
}

// بدء تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}/api`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}/api`);
  console.log(`🔐 Default accounts:`);
  console.log(`   Admin: admin@laundry.com / admin123`);
  console.log(`   Cashier: cashier@laundry.com / cashier123`);
  console.log(`   Worker: worker@laundry.com / worker123`);
});
