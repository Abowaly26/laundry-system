# 🗄️ إعداد قاعدة البيانات على Railway

## المشكلة
❌ "حدث خطأ أثناء إضافة العميل"

**السبب:** قاعدة البيانات PostgreSQL غير معدّة أو الجداول غير موجودة على Railway

---

## ✅ الحل الكامل (اتبع الخطوات بالترتيب)

### 1️⃣ إضافة PostgreSQL Database على Railway

#### أ) اذهب إلى Railway Dashboard
1. افتح مشروعك على Railway
2. اضغط على **"+ New"**
3. اختر **"Database"** → **"PostgreSQL"**
4. انتظر حتى يتم إنشاء قاعدة البيانات

#### ب) ربط Database بالـ Backend Service
1. اذهب إلى **Backend Service** (اللي شغّال فيه الـ Node.js)
2. اضغط على **Variables**
3. اضغط **"+ New Variable"**
4. اختر **"Add Reference"** → اختر الـ **PostgreSQL**
5. اختر **`DATABASE_URL`**

هيكون شكله كده:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

✅ كده الـ Backend هيقدر يتصل بقاعدة البيانات

---

### 2️⃣ إنشاء الجداول (Schema)

#### الطريقة 1: من Railway Dashboard (أسهل)

1. في Railway Dashboard، اضغط على **PostgreSQL Database**
2. اذهب إلى تبويب **"Data"** أو **"Query"**
3. انسخ محتوى ملف `server/schema.sql` بالكامل
4. الصق المحتوى في نافذة Query
5. اضغط **Execute** أو **Run**

✅ دي أسرع طريقة!

#### الطريقة 2: من Terminal (محترف)

إذا عندك PostgreSQL Client محلي:

```bash
# من مجلد server
cd server

# احصل على DATABASE_URL من Railway
# Format: postgres://user:pass@host:port/dbname

# شغّل Schema
psql "postgresql://your-railway-db-url" < schema.sql
```

#### الطريقة 3: من Node.js Script (أفضل للـ production)

أنشئ ملف `server/setup-db.js`:

```javascript
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  try {
    const schema = fs.readFileSync('./schema.sql', 'utf8');
    await pool.query(schema);
    console.log('✅ Database schema created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to setup database:', error);
    process.exit(1);
  }
}

setupDatabase();
```

ثم شغله:
```bash
node setup-db.js
```

---

### 3️⃣ إضافة البيانات الافتراضية (Seeding)

بعد إنشاء الجداول، شغّل seed script:

#### من Railway Console:

1. اذهب إلى **Backend Service**
2. افتح **"Settings"** → **"Deploy"**
3. في **Build Command** أضف:
   ```bash
   npm install && npm run seed
   ```

أو شغّله يدوياً من Terminal:

```bash
# من مجلد server محلياً
npm run seed
```

أو من Railway Console (اضغط على Terminal icon):
```bash
cd /app
npm run seed
```

---

### 4️⃣ التحقق من نجاح الإعداد

#### اختبار الاتصال:

```bash
curl https://your-railway-app.up.railway.app/api/health
```

**النتيجة المتوقعة:**
```json
{
  "success": true,
  "message": "الخادم يعمل بنجاح وقاعدة البيانات متصلة"
}
```

#### اختبار إضافة عميل:

من Postman أو Frontend:

```bash
curl -X POST https://your-railway-app.up.railway.app/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "عبدالرحمن",
    "phone": "500000000",
    "address": "حي الصحافة"
  }'
```

---

## 📋 Environment Variables المطلوبة على Railway

تأكد من وجود هذه المتغيرات:

```env
# Database (تم إضافته تلقائياً من PostgreSQL service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Server
PORT=8080
NODE_ENV=production

# JWT
JWT_SECRET=laundry_smart_secret_key_2024_production

# Frontend (للـ CORS)
FRONTEND_URL=https://your-vercel-app.vercel.app
```

---

## 🔍 Troubleshooting

### مشكلة: "relation does not exist"
**الحل:** الجداول مش موجودة، شغّل `schema.sql` مرة تانية

### مشكلة: "password authentication failed"
**الحل:** تأكد من `DATABASE_URL` صحيح في Variables

### مشكلة: "connect ECONNREFUSED"
**الحل:** Database service مش شغال، تأكد إنه deployed

### مشكلة: "SSL required"
**الحل:** تأكد من إعدادات SSL في `database.js`:
```javascript
ssl: process.env.NODE_ENV === 'production' ? {
  rejectUnauthorized: false
} : false
```

---

## ✅ Checklist نهائي

- [ ] PostgreSQL Database تم إنشاؤه على Railway
- [ ] `DATABASE_URL` تم ربطه بالـ Backend Service
- [ ] ملف `schema.sql` تم تنفيذه بنجاح
- [ ] Seed script (`npm run seed`) تم تشغيله
- [ ] `/api/health` يعمل بدون أخطاء
- [ ] تجربة إضافة عميل من Frontend نجحت ✅

---

## 📞 إذا استمرت المشكلة

1. **افحص Railway Logs:**
   - اذهب إلى Backend Service → Deployments → View Logs
   - ابحث عن أخطاء Database

2. **افحص Browser Console:**
   - F12 → Console
   - ابحث عن أخطاء API

3. **تأكد من Token:**
   - تسجيل الدخول صحيح
   - Token موجود في localStorage

---

## 🚀 الخطوة التالية

بعد إعداد Database بنجاح، ارجع للـ Frontend وجرب إضافة عميل جديد.

المفروض يشتغل تمام! ✅

---

تاريخ التحديث: ${new Date().toLocaleDateString('ar-EG')}
