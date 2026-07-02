# 🔧 دليل حل المشاكل - Smart Laundry Management System

## 📌 نظرة عامة
هذا الدليل يشرح المشاكل الشائعة وكيفية حلها في نظام إدارة المغسلة الذكية.

---

## ✅ الحل الذي تم تطبيقه

### المشكلة الأصلية: "Failed to fetch"
عند محاولة تسجيل الدخول، كانت تظهر رسالة **"Failed to fetch"**.

### الأسباب الجذرية:

#### 1️⃣ **مشكلة CORS**
- **السبب**: السيرفر كان يسمح فقط بالطلبات من `http://localhost:5173`
- **الواقع**: Vite يعمل على `http://localhost:3001`
- **النتيجة**: المتصفح يمنع الطلب لأسباب أمنية (CORS Policy)

**الحل المطبق:**
```javascript
// في server/index.js
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));
```

#### 2️⃣ **عدم تطابق هيكل البيانات**
- **Backend يرجع:**
  ```json
  {
    "success": true,
    "message": "تم تسجيل الدخول بنجاح",
    "data": {
      "token": "...",
      "user": {...}
    }
  }
  ```

- **Frontend يتوقع:**
  ```json
  {
    "token": "...",
    "user": {...}
  }
  ```

**الحل المطبق:**
```javascript
// في client/src/services/api.js
// الدالة الآن تفك التغليف تلقائياً
return data?.data || data;
```

#### 3️⃣ **عدم معالجة أخطاء الشبكة**
- **السبب**: لا يوجد try-catch للـ fetch نفسه
- **النتيجة**: رسائل خطأ غامضة من المتصفح

**الحل المطبق:**
```javascript
try {
  response = await fetch(`${API_BASE}${endpoint}`, config);
} catch (networkError) {
  throw new Error('فشل الاتصال بالخادم. تأكد من أن الخادم يعمل على المنفذ 5000');
}
```

---

## 🚀 كيفية تشغيل المشروع

### 1. تشغيل Backend (Server)
```bash
cd "d:\work\Smart Laundry Management System\server"
npm run dev
```
**يجب أن ترى:**
```
Server is running on port 5000
API URL: http://localhost:5000/api
```

### 2. تشغيل Frontend (Client)
```bash
cd "d:\work\Smart Laundry Management System\client"
npm run dev
```
**يجب أن ترى:**
```
VITE v8.x.x ready in xxx ms
➜  Local:   http://localhost:3001/
```

### 3. اختبار النظام
افتح المتصفح على: `http://localhost:3001/`

**أو استخدم ملف الاختبار:**
افتح: `client/test-api.html` في المتصفح مباشرة

---

## 🔐 بيانات تسجيل الدخول

| الدور | البريد الإلكتروني | كلمة المرور |
|------|-------------------|-------------|
| المدير (Admin) | admin@laundry.com | admin123 |
| الكاشير (Cashier) | cashier@laundry.com | cashier123 |
| العامل (Worker) | worker@laundry.com | worker123 |

---

## 🐛 حل المشاكل الشائعة

### المشكلة: "Failed to fetch"
**الأسباب المحتملة:**
1. Backend غير مشغل
2. Backend يعمل على منفذ مختلف
3. مشكلة في CORS

**الحل:**
```bash
# تحقق من أن Backend يعمل
curl http://localhost:5000/api/health

# يجب أن ترى:
# {"success":true,"message":"الخادم يعمل بنجاح وقاعدة البيانات متصلة"}
```

### المشكلة: "بيانات الدخول غير صحيحة"
**الحل:**
```bash
# أعد تشغيل seed لإنشاء البيانات
cd server
npm run seed
```

### المشكلة: Port مستخدم
**الحل:**
```bash
# Windows - إيقاف العملية على المنفذ 5000
netstat -ano | findstr :5000
taskkill /PID <رقم_العملية> /F

# أو غير المنفذ في server/.env
PORT=5001
```

### المشكلة: CORS Error في Console
**تحقق من:**
1. Frontend URL في `server/index.js` ضمن قائمة CORS
2. أعد تشغيل Backend بعد أي تغيير في CORS

---

## 📁 هيكل المشروع

```
Smart Laundry Management System/
├── server/                    # Backend (Node.js + Express)
│   ├── src/
│   │   ├── routes/           # API Routes
│   │   ├── middleware/       # Middleware (auth, etc.)
│   │   ├── config/           # Database config
│   │   └── seed.js           # Database seeding
│   ├── index.js              # Server entry point
│   └── package.json
│
├── client/                   # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/       # UI Components
│   │   ├── pages/            # Page Components
│   │   ├── context/          # React Context (Auth)
│   │   ├── services/         # API Services
│   │   └── main.jsx          # App entry point
│   ├── test-api.html         # ملف اختبار API
│   └── package.json
│
├── TROUBLESHOOTING.md        # هذا الملف
└── client/AUTHENTICATION_FIX.md  # تفاصيل الإصلاح
```

---

## 🔍 أدوات التشخيص

### 1. اختبار Backend مباشرة
```bash
# اختبار الصحة
curl http://localhost:5000/api/health

# اختبار تسجيل الدخول
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@laundry.com\",\"password\":\"admin123\"}"
```

### 2. فحص Console في المتصفح
افتح Developer Tools (F12) وتابع:
- **Console**: لرؤية أخطاء JavaScript
- **Network**: لرؤية الطلبات وحالتها
- **Application > Local Storage**: لرؤية Token المحفوظ

### 3. استخدام ملف الاختبار
افتح `client/test-api.html` في المتصفح للاختبار السريع

---

## 📞 الدعم الفني

إذا واجهت مشكلة لم تُذكر هنا:

1. **تحقق من Console** في المتصفح (F12)
2. **تحقق من Terminal** للـ Backend و Frontend
3. **راجع ملف** `client/AUTHENTICATION_FIX.md` للتفاصيل التقنية

---

## ⚡ نصائح لتطوير سريع

### Hot Reload
- Frontend: تحديث تلقائي عند تغيير الملفات
- Backend: يحتاج إعادة تشغيل يدوية (أو استخدم nodemon)

### تثبيت Nodemon للـ Backend
```bash
cd server
npm install --save-dev nodemon

# عدل package.json
"scripts": {
  "dev": "nodemon index.js"
}
```

### استخدام React DevTools
ثبت إضافة React Developer Tools في متصفحك لتسهيل debugging

---

## ✨ الميزات المطبقة

- ✅ معالجة احترافية للأخطاء
- ✅ رسائل خطأ واضحة بالعربية
- ✅ دعم عدة منافذ (CORS)
- ✅ فك تغليف تلقائي للـ API responses
- ✅ Validation للبيانات
- ✅ Console logging للـ debugging
- ✅ ملفات اختبار وتوثيق شاملة

---

**آخر تحديث:** 2026-07-03  
**الإصدار:** 1.0.0  
**الحالة:** ✅ تم الحل بنجاح
