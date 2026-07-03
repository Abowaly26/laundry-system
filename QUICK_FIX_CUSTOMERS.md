# 🚨 حل سريع: "حدث خطأ أثناء إضافة العميل"

## المشكلة
عند الضغط على "حفظ وتحديد العميل" → رسالة خطأ

---

## ✅ الحل السريع (3 خطوات)

### 1️⃣ إضافة PostgreSQL على Railway

1. افتح **Railway Dashboard**
2. اضغط **+ New** → **Database** → **PostgreSQL**
3. انتظر حتى يكتمل الإنشاء (30 ثانية تقريباً)

---

### 2️⃣ ربط Database بالـ Backend

1. اذهب إلى **Backend Service** (Node.js)
2. اضغط **Variables** tab
3. اضغط **+ New Variable** → **Add Reference**
4. اختر **PostgreSQL** → اختر **`DATABASE_URL`**
5. ✅ Save

شكل المتغير النهائي:
```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

---

### 3️⃣ إنشاء الجداول (اختر واحدة)

#### ⚡ الطريقة الأسرع: من Railway Query Tab

1. في Railway Dashboard، اضغط على **PostgreSQL Database**
2. اذهب لتبويب **"Query"** أو **"Data"**
3. انسخ الكود التالي والصقه:

```sql
-- إنشاء جدول العملاء
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'cashier', 'worker')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول الخدمات
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) DEFAULT 'piece',
    estimated_hours INTEGER DEFAULT 24,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول الطلبات
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    user_id INTEGER REFERENCES users(id),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    remaining_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'pending',
    status VARCHAR(50) DEFAULT 'pending',
    delivery_date TIMESTAMP,
    notes TEXT,
    tracking_code VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول عناصر الطلب
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    qr_code VARCHAR(255) UNIQUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول المدفوعات
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    notes TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إضافة Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
```

4. اضغط **Execute** أو **Run**
5. ✅ انتظر رسالة "Query executed successfully"

---

#### 🔧 الطريقة البديلة: من Railway Console

1. في Railway Dashboard → Backend Service
2. اضغط على **Terminal** icon (⌘)
3. شغّل:

```bash
npm run setup
npm run seed
```

---

### 4️⃣ Redeploy Backend

1. في Railway → Backend Service
2. اضغط **Settings** → **Redeploy**
3. أو:
   - عدّل أي ملف في Git
   - Push للـ repo
   - Railway هيعمل deploy تلقائي

---

## 🧪 اختبار

### 1. اختبر الـ Backend:

```bash
curl https://your-railway-app.up.railway.app/api/health
```

يجب أن ترجع:
```json
{"success": true, "message": "الخادم يعمل بنجاح..."}
```

### 2. اختبر من الموقع:

1. افتح الموقع على Vercel
2. سجل دخول
3. اذهب لصفحة **العملاء**
4. اضغط **+ إضافة عميل جديد**
5. أدخل البيانات:
   - الاسم: عبدالرحمن
   - الجوال: 500000000
   - العنوان: حي الصحافة
6. اضغط **حفظ وتحديد العميل**

✅ **يجب أن يعمل الآن!**

---

## 🔍 إذا استمرت المشكلة

### افحص Railway Logs:

1. Railway Dashboard → Backend Service
2. اضغط **Deployments**
3. اختر آخر deployment
4. اضغط **View Logs**

ابحث عن:
- `❌ Database query error`
- `relation "customers" does not exist`
- `password authentication failed`

### افحص Browser Console:

اضغط `F12` → Console

ابحث عن:
- `Failed to fetch`
- `401 Unauthorized`
- `500 Internal Server Error`

---

## 💡 نصائح إضافية

### تأكد من Environment Variables:

في Railway Backend Service → Variables:

```env
DATABASE_URL = ${{Postgres.DATABASE_URL}}  ✅
PORT = 8080                                ✅
NODE_ENV = production                      ✅
JWT_SECRET = your-secret-here             ✅
FRONTEND_URL = https://your-app.vercel.app ✅
```

### تأكد من CORS:

في Vercel Frontend → Environment Variables:

```env
VITE_API_URL = https://your-railway-app.up.railway.app/api  ✅
```

---

## ✅ Checklist سريع

- [ ] PostgreSQL تم إنشاؤه على Railway
- [ ] DATABASE_URL تم ربطه بالـ Backend
- [ ] الجداول تم إنشاؤها (schema.sql)
- [ ] Backend تم عمل Redeploy
- [ ] /api/health يعمل
- [ ] تسجيل الدخول يعمل
- [ ] إضافة عميل تعمل ✅

---

## 🎉 بعد النجاح

جرّب:
- إضافة أكثر من عميل
- البحث عن عميل
- تعديل بيانات عميل
- إنشاء طلب جديد

---

**وقت التنفيذ المتوقع:** 5-10 دقائق ⏱️

**مستوى الصعوبة:** سهل 🟢

---

💬 **محتاج مساعدة؟** اكتب المشكلة بالتفصيل مع screenshot من:
- Railway Logs
- Browser Console
- الرسالة الكاملة للخطأ

---

تاريخ آخر تحديث: ${new Date().toLocaleDateString('ar-EG')}
