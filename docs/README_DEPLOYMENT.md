# 🚀 دليل Deploy نظام إدارة المغسلة الذكي

## المشروع
نظام متكامل لإدارة المغاسل (Laundry Management System) يحتوي على:
- ✅ Backend (Node.js + Express + PostgreSQL)
- ✅ Frontend (React + Vite)
- ✅ Customer Portal (تتبع الطلبات)

---

## 📦 هيكل المشروع

```
Smart Laundry Management System/
├── server/               # Backend (Node.js)
│   ├── src/
│   │   ├── config/      # Database config
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Auth middleware
│   │   └── seed.js      # Database seeding
│   ├── schema.sql       # PostgreSQL schema
│   ├── setup-db.js      # Database setup script
│   ├── index.js         # Main server file
│   └── package.json
│
└── client/              # Frontend (React)
    ├── src/
    │   ├── components/  # UI components
    │   ├── pages/       # Application pages
    │   ├── services/    # API calls
    │   └── context/     # Auth context
    ├── .env.production  # Production env vars
    └── package.json
```

---

## 🌐 Deployment Architecture

```
┌─────────────────┐
│   Vercel        │  → Frontend (React)
│   (Client)      │     VITE_API_URL → Railway API
└─────────────────┘

         ↓ API Calls

┌─────────────────┐
│   Railway       │  → Backend (Node.js)
│   (Server)      │     PORT, JWT_SECRET, DATABASE_URL
└─────────────────┘

         ↓ Database Connection

┌─────────────────┐
│   Railway       │  → PostgreSQL Database
│   (Database)    │     Auto-managed by Railway
└─────────────────┘
```

---

## 🔧 خطوات Deploy الكاملة

### 1️⃣ تحضير الـ Repository

```bash
# تأكد من وجود .gitignore صحيح
cd "Smart Laundry Management System"

# في server/.gitignore
node_modules/
.env
*.db
*.log

# في client/.gitignore
node_modules/
dist/
.env.local
.env
```

```bash
# Push للـ GitHub
git add .
git commit -m "Prepare for deployment"
git push origin main
```

---

### 2️⃣ Deploy Backend على Railway

#### أ) إنشاء المشروع

1. اذهب إلى [Railway.app](https://railway.app)
2. اضغط **"New Project"**
3. اختر **"Deploy from GitHub repo"**
4. اختر repository المشروع
5. اختر **`server`** folder كـ Root Directory

#### ب) إعدادات Backend Service

**Root Directory:**
```
server
```

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm start
```

**Environment Variables:**
```env
PORT=8080
NODE_ENV=production
JWT_SECRET=laundry_smart_secret_key_2024_production_change_this
FRONTEND_URL=https://your-vercel-app.vercel.app
```

⚠️ **مهم:** غيّر `JWT_SECRET` لقيمة عشوائية آمنة

#### ج) إضافة PostgreSQL Database

1. في نفس المشروع على Railway
2. اضغط **"+ New"** → **"Database"** → **"PostgreSQL"**
3. انتظر حتى يكتمل Setup

#### د) ربط Database بالـ Backend

1. اذهب لـ **Backend Service** → **Variables**
2. اضغط **"+ New Variable"** → **"Add Reference"**
3. اختر **PostgreSQL** → **`DATABASE_URL`**
4. ✅ Save

#### هـ) إنشاء Schema والـ Seed

**الطريقة 1: من Railway Console (سريعة)**

1. Backend Service → **Terminal** (⌘)
2. شغّل:
```bash
npm run setup   # Creates tables
npm run seed    # Adds default data
```

**الطريقة 2: من Query Tab (موصى بها)**

1. اضغط على **PostgreSQL Service**
2. اذهب لـ **"Query"** tab
3. انسخ محتوى `server/schema.sql` بالكامل
4. الصق والضغط **Execute**
5. ثم من Backend Terminal: `npm run seed`

#### و) احصل على Backend URL

من Railway Dashboard:
```
Settings → Networking → Public URL

مثال: https://smart-laundry-production.up.railway.app
```

✅ **احفظ هذا الرابط للخطوة التالية**

---

### 3️⃣ Deploy Frontend على Vercel

#### أ) إنشاء المشروع

1. اذهب إلى [Vercel.com](https://vercel.com)
2. اضغط **"Add New"** → **"Project"**
3. اختر repository من GitHub
4. اختر **`client`** folder كـ Root Directory

#### ب) إعدادات Build

**Framework Preset:** Vite

**Root Directory:** `client`

**Build Command:**
```bash
npm run build
```

**Output Directory:**
```
dist
```

**Install Command:**
```bash
npm install
```

#### ج) Environment Variables

أضف في Vercel Dashboard → Settings → Environment Variables:

```env
VITE_API_URL=https://your-railway-backend.up.railway.app/api
```

⚠️ **استبدل برابط Railway الحقيقي من الخطوة السابقة**

#### د) Deploy

1. اضغط **"Deploy"**
2. انتظر حتى يكتمل Build (2-3 دقائق)
3. ✅ احصل على Vercel URL

---

### 4️⃣ ربط Frontend و Backend (CORS)

#### في Railway:

1. اذهب لـ Backend Service → **Variables**
2. عدّل `FRONTEND_URL`:
```env
FRONTEND_URL=https://your-actual-vercel-app.vercel.app
```

3. **Redeploy** Backend Service

---

## ✅ اختبار النظام

### 1. اختبر Backend:

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

### 2. اختبر Frontend:

1. افتح Vercel URL في المتصفح
2. يجب أن تظهر صفحة Login
3. استخدم:
   - **Email:** `admin@laundry.com`
   - **Password:** `admin123`
4. يجب أن تدخل للـ Dashboard ✅

### 3. اختبر إضافة عميل:

1. اذهب لصفحة **العملاء**
2. اضغط **+ إضافة عميل جديد**
3. أدخل بيانات تجريبية
4. اضغط **حفظ**
5. ✅ يجب أن يتم الحفظ بنجاح

---

## 🔍 Troubleshooting

### مشكلة: "حدث خطأ أثناء إضافة العميل"

**الحل:** 
1. افحص Railway Logs → Backend Service → View Logs
2. ابحث عن: `relation "customers" does not exist`
3. إذا وجدت الخطأ، شغّل: `npm run setup` من Railway Console

**الملفات المساعدة:**
- 📄 `QUICK_FIX_CUSTOMERS.md` - حل سريع مفصّل
- 📄 `RAILWAY_DATABASE_SETUP.md` - دليل قاعدة البيانات

### مشكلة: CORS Error في Browser

**الحل:**
1. تأكد من `FRONTEND_URL` في Railway صحيح
2. يجب أن يطابق Vercel URL **بالضبط** (بدون `/` في النهاية)
3. Redeploy Backend بعد التعديل

### مشكلة: 401 Unauthorized

**الحل:**
1. امسح Local Storage: `F12` → Application → Local Storage → Clear
2. سجل دخول مرة أخرى
3. تأكد من `JWT_SECRET` موجود في Railway Variables

### مشكلة: Database Connection Failed

**الحل:**
1. تأكد من PostgreSQL Service شغّال على Railway
2. تأكد من `DATABASE_URL` Reference صحيح
3. افحص SSL settings في `server/src/config/database.js`

---

## 📊 Environment Variables Summary

### Railway Backend:

| Variable | Value | مصدر |
|----------|-------|------|
| `PORT` | `8080` | يدوي |
| `NODE_ENV` | `production` | يدوي |
| `JWT_SECRET` | `your-secret-key` | يدوي |
| `FRONTEND_URL` | `https://your-vercel.vercel.app` | يدوي |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Reference |

### Vercel Frontend:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-railway.up.railway.app/api` |

---

## 🔐 Default Users (بعد Seed)

| الدور | Email | Password |
|------|-------|----------|
| Admin | `admin@laundry.com` | `admin123` |
| Cashier | `cashier@laundry.com` | `cashier123` |
| Worker | `worker@laundry.com` | `worker123` |

⚠️ **مهم:** غيّر هذه الباسوردات في الإنتاج!

---

## 📚 ملفات مساعدة إضافية

- 📄 `DEPLOYMENT_FIX.md` - حل مشاكل Deploy العامة
- 📄 `QUICK_FIX_CUSTOMERS.md` - حل سريع لمشكلة إضافة العملاء
- 📄 `RAILWAY_DATABASE_SETUP.md` - دليل مفصّل لقاعدة البيانات
- 📄 `RENDER_STEP_BY_STEP.md` - خطوات Deploy على Render (بديل)

---

## 🎯 Next Steps بعد Deploy

1. **أمان:**
   - غيّر `JWT_SECRET` لقيمة عشوائية قوية
   - غيّر passwords المستخدمين الافتراضية
   - فعّل Rate Limiting

2. **Monitoring:**
   - راقب Railway Logs بانتظام
   - راقب Vercel Analytics

3. **Backup:**
   - اعمل Backup دوري لـ PostgreSQL Database
   - احفظ Environment Variables في مكان آمن

4. **التطوير:**
   - أضف المزيد من الخدمات
   - حسّن واجهة المستخدم
   - أضف تقارير متقدمة

---

## 📞 الدعم

إذا واجهت أي مشاكل:

1. **افحص Logs أولاً:**
   - Railway: Backend Service → Deployments → View Logs
   - Vercel: Deployments → Function Logs
   - Browser: F12 → Console

2. **راجع ملفات الحل:**
   - ابدأ بـ `QUICK_FIX_CUSTOMERS.md`
   - ثم `DEPLOYMENT_FIX.md`
   - وأخيراً `RAILWAY_DATABASE_SETUP.md`

3. **ابحث عن الخطأ:**
   - انسخ رسالة الخطأ الكاملة
   - ابحث في Google أو Stack Overflow

---

## ✅ Deployment Checklist

- [ ] Repository pushed إلى GitHub
- [ ] Railway Backend Service created
- [ ] PostgreSQL Database added على Railway
- [ ] DATABASE_URL linked to Backend
- [ ] Schema created (`npm run setup`)
- [ ] Database seeded (`npm run seed`)
- [ ] Backend deployed بنجاح
- [ ] Railway Backend URL تم نسخه
- [ ] Vercel Frontend deployed
- [ ] VITE_API_URL تم تعيينه في Vercel
- [ ] FRONTEND_URL تم تعيينه في Railway
- [ ] `/api/health` endpoint يعمل
- [ ] تسجيل الدخول يعمل
- [ ] إضافة عميل تعمل
- [ ] إنشاء طلب يعمل

---

🎉 **مبروك! نظامك الآن LIVE على الإنترنت!**

**Backend:** https://your-railway-app.up.railway.app  
**Frontend:** https://your-vercel-app.vercel.app

---

آخر تحديث: ${new Date().toLocaleDateString('ar-EG', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
