# 🚨 مشكلة قاعدة البيانات على Railway

## المشكلة
Railway يستخدم نظام ملفات مؤقت، وبالتالي فإن قاعدة بيانات SQLite ستُحذف عند كل deployment جديد!

## ✅ الحل الموصى به: استخدام PostgreSQL

### الخيار 1: Railway PostgreSQL (أفضل حل)

#### الخطوات:

1. **إضافة PostgreSQL إلى مشروعك على Railway:**
   - افتح Railway Dashboard
   - اضغط على "+ New"
   - اختر "Database" → "PostgreSQL"
   - سيتم إنشاء قاعدة بيانات تلقائياً

2. **ربط قاعدة البيانات بـ Backend:**
   - Railway سيضيف متغيرات البيئة تلقائياً:
     - `DATABASE_URL`
     - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

3. **تحديث الكود ليدعم PostgreSQL:**
   - تثبيت `pg` بدلاً من `better-sqlite3`
   - تحديث ملف `database.js`

---

### الخيار 2: Supabase (مجاني تماماً)

1. **إنشاء حساب على Supabase:**
   - اذهب إلى: https://supabase.com
   - أنشئ مشروع جديد

2. **الحصول على Connection String:**
   - من Project Settings → Database
   - انسخ `Connection string` → `URI`

3. **إضافة المتغير في Railway:**
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[HOST]:[PORT]/postgres
   ```

---

## 🛠️ هل تريدني أن:

### A. أحول الكود من SQLite إلى PostgreSQL
- سأقوم بتحديث جميع الملفات
- سأضيف migration scripts
- سأحافظ على نفس الوظائف

### B. أستخدم Supabase
- أعطيني connection string من Supabase
- سأحول الكود بسرعة

### C. حل سريع مؤقت
- سأضيف auto-seed عند كل تشغيل
- لكن البيانات ستُفقد عند كل deployment

---

## 📝 ملاحظات

- SQLite لا يعمل بشكل دائم على منصات Cloud مثل Railway/Vercel/Render
- PostgreSQL هو الخيار الأمثل للإنتاج
- التحويل سيأخذ 10-15 دقيقة فقط

