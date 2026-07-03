# 🔧 حل مشكلة Railway - Failed to fetch

## 🚨 المشكلة:
**"فشل الاتصال بالخادم"** على Railway

## ✅ الحل:

### 1️⃣ في Railway Dashboard:

#### أ. احذف متغير PORT:
1. اذهب لـ Railway Dashboard
2. اختار الـ service (Backend)
3. Variables
4. **احذف**: `PORT=5000` ❌
5. Save

#### ب. تأكد من المتغيرات الصحيحة فقط:
```
JWT_SECRET=laundry_2024_production_secret
NODE_ENV=production
FRONTEND_URL=https://your-frontend-app.vercel.app
```

---

### 2️⃣ تحديث Build Settings:

في Railway → Settings:

**Start Command** يجب أن يكون:
```
npm start
```

**أو:**
```
node index.js
```

**Root Directory:**
```
/server
```

---

### 3️⃣ Re-deploy:

بعد التعديلات:
1. اضغط "Deploy" مرة تانية
2. انتظر 2-3 دقائق
3. اختبر الـ health endpoint:
   ```
   https://your-backend.railway.app/api/health
   ```

---

## 🔍 اختبار:

### في المتصفح:
افتح:
```
https://your-backend-name.up.railway.app/api/health
```

**المفروض ترجع:**
```json
{
  "success": true,
  "message": "الخادم يعمل بنجاح وقاعدة البيانات متصلة"
}
```

---

## 📊 Railway Logs:

لو لسه فيه مشكلة:

1. Railway Dashboard
2. اختار الـ Service
3. **Deployments** → اختار آخر deployment
4. **View Logs**
5. ابحث عن:
   ```
   Server is running on port XXXX
   ```

الـ PORT لازم يكون **رقم ديناميكي** (مش 5000 ثابت)

---

## ⚠️ أخطاء شائعة:

### ❌ الخطأ 1: PORT=5000 في Variables
**الحل**: احذفه - Railway يحدد PORT تلقائياً

### ❌ الخطأ 2: app.listen(5000)
**الحل**: لازم `app.listen(process.env.PORT || 5000)`
(الكود بتاعك صح ✅)

### ❌ الخطأ 3: Root Directory غلط
**الحل**: لازم يكون `/server` بالظبط

### ❌ الخطأ 4: Start Command غلط
**الحل**: `npm start` أو `node index.js`

---

## 🎯 الترتيب الصحيح:

1. ✅ الكود يستخدم `process.env.PORT`
2. ✅ **لا تحدد** PORT في Railway Variables
3. ✅ Root Directory = `/server`
4. ✅ Start Command = `npm start`
5. ✅ Re-deploy

---

## 💡 نصيحة:

بعد كل تعديل في Railway:
- انتظر 1-2 دقيقة
- اختبر الـ health endpoint
- لو نجح، حدث VITE_API_URL في Vercel

---

## 🆘 لو لسه مش شغال:

جرب **Render** بدلاً من Railway:
- أسهل في الإعدادات
- مجاني 100%
- أقل مشاكل مع PORT

اقرأ: `RENDER_QUICK_DEPLOY.md`

---

**🚀 بالتوفيق!**
