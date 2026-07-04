# ⚡ رفع سريع على Render (15 دقيقة)

## البديل السريع لـ Railway - مجاني 100%

---

## 🚀 الخطوات:

### 1️⃣ GitHub (نفس الخطوات السابقة)
```bash
git push -u origin main
```

---

### 2️⃣ Render - Backend (6 دقائق)

1. **روح**: https://render.com
2. **Sign Up** → Continue with GitHub
3. **New +** → **Web Service**
4. **Connect GitHub** → اختار `laundry-system`
5. **Settings**:
   ```
   Name: laundry-backend
   Root Directory: server
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```
6. **Environment Variables**:
   ```
   PORT=5000
   JWT_SECRET=laundry_secret_2024
   NODE_ENV=production
   ```
7. **Free Plan** → Create Web Service
8. **انتظر 2-3 دقائق**
9. **احفظ URL**: مثل `https://laundry-backend.onrender.com`

---

### 3️⃣ Vercel - Frontend (3 دقائق)

1. **روح**: https://vercel.com
2. **New Project** → Import `laundry-system`
3. **Root Directory**: `client`
4. **Environment Variable**:
   ```
   VITE_API_URL = https://laundry-backend.onrender.com/api
   ```
5. **Deploy**
6. **احفظ URL**

---

### 4️⃣ CORS Update (30 ثانية)

**ارجع Render**:
1. Environment → Add:
   ```
   FRONTEND_URL = https://your-app.vercel.app
   ```
2. Save → Manual Deploy

---

## ✅ تم! - مجاني 100%

### الفرق بين Render و Railway:

| المقارنة | Render | Railway |
|---------|--------|---------|
| **السعر** | مجاني للأبد | $5/month |
| **السرعة** | أبطأ (auto-sleep) | أسرع |
| **الوقت** | 15 دقيقة | 10 دقائق |
| **الأفضل لـ** | الميزانية صفر | السرعة |

---

## ⚠️ ملحوظة مهمة عن Render:

**Auto-sleep:**
- البرنامج ينام بعد 15 دقيقة من عدم الاستخدام
- أول request بعد النوم يأخذ ~30 ثانية
- بعدها يعمل عادي

**الحل:**
استخدم cron-job.org (مجاني) لعمل ping كل 10 دقائق:
1. روح: https://cron-job.org
2. أنشئ حساب
3. New Cron Job:
   ```
   URL: https://laundry-backend.onrender.com/api/health
   Schedule: Every 10 minutes
   ```
4. الموقع يفضل شغال دايماً!

---

**🚀 ابدأ دلوقتي!**
