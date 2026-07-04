# ⚡ دليل البدء السريع - Quick Start

## 🎯 تشغيل النظام في 30 ثانية

### الطريقة الأسهل 🚀
1. **افتح المجلد الرئيسي**
2. **انقر نقراً مزدوجاً على:** `start.bat`
3. **انتظر 5 ثوانٍ**
4. **افتح المتصفح:** `http://localhost:3001/`
5. **سجل الدخول:** `admin@laundry.com` / `admin123`

**🎉 انتهى!**

---

## 📋 الخطوات التفصيلية

### 1️⃣ التشغيل

#### طريقة Windows (سهلة):
```
انقر مرتين على: start.bat
```

#### طريقة Terminal (يدوية):
```bash
# نافذة 1: Backend
cd server
npm run dev

# نافذة 2: Frontend (في terminal جديد)
cd client
npm run dev
```

### 2️⃣ التأكد من التشغيل

يجب أن ترى:

**Backend (نافذة 1):**
```
Server is running on port 5000
API URL: http://localhost:5000/api
```

**Frontend (نافذة 2):**
```
VITE v8.x.x ready in xxx ms
➜  Local:   http://localhost:3001/
```

### 3️⃣ فتح التطبيق

افتح المتصفح على: **http://localhost:3001/**

### 4️⃣ تسجيل الدخول

| المستخدم | البريد | كلمة المرور |
|----------|--------|-------------|
| المدير | admin@laundry.com | admin123 |
| الكاشير | cashier@laundry.com | cashier123 |
| العامل | worker@laundry.com | worker123 |

---

## 🛑 إيقاف النظام

### طريقة Windows:
```
انقر مرتين على: stop.bat
```

### طريقة Terminal:
اضغط `Ctrl+C` في كل نافذة

---

## 🧪 اختبار النظام

### الطريقة 1: اختبار تلقائي
```bash
node test-api.js
```

يجب أن ترى:
```
✅ صحة السيرفر: نجح
✅ تسجيل الدخول: نجح
✅ بيانات المستخدم: نجح
🎉 جميع الاختبارات نجحت!
```

### الطريقة 2: اختبار يدوي
افتح في المتصفح: `client/test-api.html`

---

## ❓ مشاكل شائعة

### 🔴 المشكلة: "Port already in use"
**الحل:**
```bash
# شغل stop.bat
# أو
netstat -ano | findstr :5000
taskkill /PID <الرقم> /F
```

### 🔴 المشكلة: "Failed to fetch"
**الحل:**
1. تأكد من تشغيل Backend أولاً
2. انتظر 5 ثوانٍ قبل فتح Frontend
3. شغل: `node test-api.js` للتشخيص

### 🔴 المشكلة: "بيانات الدخول غير صحيحة"
**الحل:**
```bash
cd server
npm run seed
```

---

## 📊 معلومات النظام

### المنافذ (Ports)
- Backend API: `5000`
- Frontend: `3001`

### قاعدة البيانات
- النوع: SQLite
- المكان: `server/database.db`
- إعادة التهيئة: `npm run seed` في مجلد server

### البيئة
- Backend: Node.js + Express
- Frontend: React + Vite
- قاعدة البيانات: SQLite

---

## 📁 الملفات المهمة

| الملف | الاستخدام |
|------|-----------|
| `start.bat` | تشغيل النظام |
| `stop.bat` | إيقاف النظام |
| `test-api.js` | اختبار API |
| `client/test-api.html` | اختبار متصفح |
| `TROUBLESHOOTING.md` | حل المشاكل |
| `README_FIXED.md` | التوثيق الكامل |

---

## 🎓 الخطوات التالية

بعد التشغيل بنجاح:

1. ✅ **استكشف النظام**: جرب الميزات المختلفة
2. ✅ **أضف بيانات**: عملاء، خدمات، طلبات
3. ✅ **اختبر الأدوار**: سجل دخول بحسابات مختلفة
4. ✅ **راجع الكود**: للتعلم والتطوير

---

## 💡 نصائح

### للمطورين:
- استخدم React DevTools للتطوير
- تابع Console (F12) للأخطاء
- Backend يحتاج إعادة تشغيل بعد التعديل
- Frontend يحدث تلقائياً (HMR)

### للمستخدمين:
- احفظ بياناتك بانتظام
- استخدم Chrome أو Edge للأداء الأفضل
- لا تغلق نوافذ Terminal

---

## ✅ Checklist

قبل البدء، تأكد من:
- [ ] Node.js مثبت (v16+)
- [ ] npm موجود
- [ ] تم تشغيل `npm install` في server و client
- [ ] المنافذ 5000 و 3001 متاحة

---

## 📞 الدعم

واجهت مشكلة؟

1. شغل: `node test-api.js`
2. راجع: `TROUBLESHOOTING.md`
3. تحقق من: Console في المتصفح (F12)
4. راجع: Terminal logs

---

**⏱️ وقت التشغيل المتوقع:** 30 ثانية  
**🎯 مستوى الصعوبة:** سهل جداً  
**✨ الحالة:** ✅ كل شيء يعمل!
