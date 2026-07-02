#!/usr/bin/env node

/**
 * 🧪 سكريبت اختبار API
 * يستخدم لاختبار الـ Backend API بشكل مباشر
 */

const API_BASE = 'http://localhost:5000/api';

// ألوان للـ console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testHealth() {
  log('\n🔍 اختبار صحة السيرفر...', 'cyan');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    if (response.ok) {
      log('✅ السيرفر يعمل بنجاح!', 'green');
      log(JSON.stringify(data, null, 2), 'yellow');
      return true;
    } else {
      log('❌ فشل اختبار الصحة', 'red');
      log(JSON.stringify(data, null, 2), 'red');
      return false;
    }
  } catch (error) {
    log('❌ فشل الاتصال بالسيرفر!', 'red');
    log(`الخطأ: ${error.message}`, 'red');
    return false;
  }
}

async function testLogin() {
  log('\n🔐 اختبار تسجيل الدخول...', 'cyan');
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@laundry.com',
        password: 'admin123',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      log('✅ نجح تسجيل الدخول!', 'green');
      log('\n📦 البيانات الأصلية من Backend:', 'yellow');
      log(JSON.stringify(data, null, 2), 'yellow');
      
      // اختبار فك التغليف (كما يفعل الـ Frontend)
      const unwrapped = data?.data || data;
      log('\n📤 بعد فك التغليف (كما يراها Frontend):', 'blue');
      log(JSON.stringify(unwrapped, null, 2), 'blue');
      
      // التحقق من وجود token و user
      if (unwrapped.token && unwrapped.user) {
        log('\n✅ البنية صحيحة: token و user موجودان', 'green');
        return true;
      } else {
        log('\n❌ البنية غير صحيحة: token أو user مفقود', 'red');
        return false;
      }
    } else {
      log('❌ فشل تسجيل الدخول', 'red');
      log(JSON.stringify(data, null, 2), 'red');
      return false;
    }
  } catch (error) {
    log('❌ خطأ في الشبكة!', 'red');
    log(`الخطأ: ${error.message}`, 'red');
    return false;
  }
}

async function testGetMe(token) {
  log('\n👤 اختبار الحصول على بيانات المستخدم...', 'cyan');
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      log('✅ نجح الحصول على البيانات!', 'green');
      log(JSON.stringify(data, null, 2), 'yellow');
      return true;
    } else {
      log('❌ فشل الحصول على البيانات', 'red');
      log(JSON.stringify(data, null, 2), 'red');
      return false;
    }
  } catch (error) {
    log('❌ خطأ في الشبكة!', 'red');
    log(`الخطأ: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('═══════════════════════════════════════', 'cyan');
  log('   🧪 اختبار API نظام المغسلة الذكية', 'cyan');
  log('═══════════════════════════════════════', 'cyan');

  const results = {
    health: false,
    login: false,
    getMe: false,
  };

  // 1. اختبار الصحة
  results.health = await testHealth();
  
  if (!results.health) {
    log('\n❌ فشل اختبار الصحة. تأكد من تشغيل السيرفر.', 'red');
    process.exit(1);
  }

  // 2. اختبار تسجيل الدخول
  results.login = await testLogin();

  // 3. اختبار الحصول على بيانات المستخدم (إذا نجح تسجيل الدخول)
  if (results.login) {
    // إعادة تسجيل الدخول للحصول على token
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@laundry.com', password: 'admin123' }),
    });
    const loginData = await loginResponse.json();
    const token = loginData?.data?.token;
    
    if (token) {
      results.getMe = await testGetMe(token);
    }
  }

  // النتيجة النهائية
  log('\n═══════════════════════════════════════', 'cyan');
  log('           📊 ملخص النتائج', 'cyan');
  log('═══════════════════════════════════════', 'cyan');
  
  log(`صحة السيرفر: ${results.health ? '✅ نجح' : '❌ فشل'}`, results.health ? 'green' : 'red');
  log(`تسجيل الدخول: ${results.login ? '✅ نجح' : '❌ فشل'}`, results.login ? 'green' : 'red');
  log(`بيانات المستخدم: ${results.getMe ? '✅ نجح' : '❌ فشل'}`, results.getMe ? 'green' : 'red');
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    log('\n🎉 جميع الاختبارات نجحت!', 'green');
    log('✅ الـ API جاهز للاستخدام', 'green');
  } else {
    log('\n⚠️  بعض الاختبارات فشلت', 'yellow');
    log('راجع الأخطاء أعلاه', 'yellow');
  }
  
  log('═══════════════════════════════════════\n', 'cyan');
}

// تشغيل الاختبارات
runTests().catch(error => {
  log('\n💥 خطأ غير متوقع:', 'red');
  log(error.message, 'red');
  log(error.stack, 'red');
  process.exit(1);
});
