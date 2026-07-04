# 🔧 خطوات حل مشكلة "فشل الاتصال بالخادم"

## ✅ الحل السريع (5 دقائق)

### الخطوة 1: افتح صفحة التشخيص
افتح في المتصفح:
```
http://localhost:3001/test.html
```

هذه الصفحة ستختبر الاتصال تلقائياً وتخبرك بالمشكلة.

### الخطوة 2: إذا Backend غير متصل
1. افتح Terminal جديد
2. انتقل لمجلد server:
   ```bash
   cd "d:\work\Smart Laundry Management System\server"
   ```
3. شغل Backend:
   ```bash
   npm run dev
   ```
4. انتظر حتى ترى:
   ```
   Server is running on port 5000
   ```
5. ارجع لصفحة التشخيص واضغط "اختبار Backend"

### الخطوة 3: إذا ظهرت مشاكل في التخزين
افتح:
```
http://localhost:3001/clear-cache.html
```
اضغط "مسح كل البيانات"

### الخطوة 4: اضغط F5 في صفحة تسجيل الدخول
أو اضغط `Ctrl+Shift+R` لعمل Hard Refresh

---

## 🔍 تشخيص متقدم

### تحقق من Backend يدوياً:
```bash
curl http://localhost:5000/api/health
```

**النتيجة المتوقعة:**
```json
{"success":true,"message":"الخادم يعمل بنجاح وقاعدة البيانات متصلة"}
```

### تحقق من المنفذ 5000:
```bash
netstat -ano | findstr :5000
```

**إذا لم تظهر نتائج:** Backend غير مشغل - شغله!

---

## 🚨 المشاكل الشائعة والحلول

### المشكلة 1: "Port 5000 is already in use"
**الحل:**
```bash
netstat -ano | findstr :5000
taskkill /PID <الرقم_الذي_ظهر> /F
```

ثم أعد تشغيل Backend

### المشكلة 2: "Failed to fetch"
**الأسباب:**
1. ❌ Backend غير مشغل → شغله
2. ❌ Firewall يمنع الاتصال → عطله مؤقتاً
3. ❌ Frontend يستخدم URL خاطئ → تحقق من api.js

**الحل:**
1. افتح `client/src/services/api.js`
2. تأكد من:
   ```javascript
   const API_BASE = 'http://localhost:5000/api';
   ```

### المشكلة 3: "CORS Error"
**الحل:** تم حله بالفعل في `server/index.js`

تأكد من السطر:
```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));
```

### المشكلة 4: البيانات القديمة في المتصفح
**الحل:**
1. افتح: http://localhost:3001/clear-cache.html
2. اضغط "مسح كل البيانات"
3. اضغط F5

---

## 📊 التحقق من الحالة الحالية

### 1. تحقق من Processes
```bash
# في مجلد المشروع الرئيسي
node test-api.js
```

**يجب أن ترى:**
```
✅ صحة السيرفر: نجح
✅ تسجيل الدخول: نجح
✅ بيانات المستخدم: نجح
```

### 2. تحقق من Console في المتصفح
1. افتح صفحة تسجيل الدخول
2. اضغط F12
3. اذهب لـ Console
4. ابحث عن أخطاء حمراء

**إذا رأيت:**
- `Failed to fetch` → Backend غير مشغل
- `CORS error` → مشكلة في CORS (تم حلها)
- `401 Unauthorized` → بيانات خاطئة

---

## 🎯 الحل النهائي (إذا لم يعمل أي شيء)

### أعد تشغيل كل شيء من الصفر:

#### 1. أوقف كل شيء:
```bash
# اضغط Ctrl+C في كل Terminal مفتوح
```

#### 2. امسح الذاكرة المؤقتة:
افتح: http://localhost:3001/clear-cache.html

#### 3. أعد تشغيل Backend:
```bash
cd "d:\work\Smart Laundry Management System\server"
npm run dev
```

انتظر 5 ثوانٍ

#### 4. أعد تشغيل Frontend:
```bash
cd "d:\work\Smart Laundry Management System\client"
npm run dev
```

انتظر 5 ثوانٍ

#### 5. افتح صفحة التشخيص:
```
http://localhost:3001/test.html
```

#### 6. إذا نجح الاختبار، اذهب لـ:
```
http://localhost:3001/
```

---

## 📞 معلومات الاتصال

### URLs المهمة:
- **الصفحة الرئيسية:** http://localhost:3001/
- **صفحة التشخيص:** http://localhost:3001/test.html
- **مسح الذاكرة:** http://localhost:3001/clear-cache.html
- **Backend Health:** http://localhost:5000/api/health

### بيانات تسجيل الدخول:
- البريد: `admin@laundry.com`
- كلمة المرور: `admin123`

---

## ✅ Checklist

قبل أن تقول "لا يعمل"، تأكد من:

- [ ] Backend يعمل (تحقق من Terminal)
- [ ] Frontend يعمل (تحقق من Terminal)
- [ ] صفحة التشخيص تظهر ✅ للـ Backend
- [ ] المنفذ 5000 غير مستخدم بعملية أخرى
- [ ] مسحت الذاكرة المؤقتة
- [ ] عملت Hard Refresh (Ctrl+Shift+R)
- [ ] لا يوجد أخطاء في Console

---

**إذا اتبعت كل هذه الخطوات ولم يعمل، اتصل بي مع:**
1. Screenshot من Console (F12)
2. Screenshot من Terminal للـ Backend
3. Screenshot من Terminal للـ Frontend
4. Screenshot من صفحة التشخيص
