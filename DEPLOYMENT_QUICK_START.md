# ⚡ دليل الرفع السريع - 15 دقيقة

## 🎯 الخلاصة:
**Frontend** → Vercel (مجاني)  
**Backend** → Render.com (مجاني)

---

## 📝 الخطوات (بالترتيب):

### 1️⃣ تجهيز المشروع (دقيقتان)
```bash
# شغل الملف ده
prepare-deployment.bat
```

### 2️⃣ رفع على GitHub (3 دقائق)
1. روح على: https://github.com/new
2. أنشئ repository اسمه: `laundry-system`
3. في Terminal:
```bash
git remote add origin https://github.com/YOUR_USERNAME/laundry-system.git
git push -u origin main
```

### 3️⃣ رفع Backend على Render (5 دقائق)
1. روح: https://render.com (سجل حساب)
2. New + → Web Service
3. Connect GitHub → اختار `laundry-system`
4. **Settings**:
   - Root Directory: `server`
   - Build: `npm install`
   - Start: `npm run dev`
5. Add Environment Variables:
   ```
   PORT=5000
   JWT_SECRET=your_secret_here_123
   NODE_ENV=production
   ```
6. Create Web Service
7. **احفظ الـ URL**: `https://laundry-backend-xxxx.onrender.com`

### 4️⃣ رفع Frontend على Vercel (5 دقائق)
1. روح: https://vercel.com (سجل بـ GitHub)
2. Add New Project
3. Import `laundry-system`
4. **Settings**:
   - Root Directory: `client`
   - Framework: Vite
5. Add Environment Variable:
   ```
   VITE_API_URL=https://laundry-backend-xxxx.onrender.com/api
   ```
   (استبدل بالـ URL من Render)
6. Deploy

### 5️⃣ تحديث CORS (دقيقة)
1. ارجع لـ Render
2. Environment
3. أضف:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
4. Save (سيعيد Deploy)

---

## ✅ تم!

افتح: `https://your-app.vercel.app`

**بيانات الدخول:**
- admin@laundry.com
- admin123

---

## ⚠️ ملاحظات مهمة:

### 1. Render Free Tier:
- Backend ينام بعد 15 دقيقة من عدم الاستخدام
- أول request بعد النوم ياخد 30 ثانية

### 2. Database:
- SQLite على Render يتمسح عند كل deploy
- **الحل**: استخدم Railway أو PostgreSQL

### 3. أمان:
- غير JWT_SECRET في production
- لا ترفع ملف `.env` على GitHub

---

## 🔄 إذا عملت تحديثات:

```bash
git add .
git commit -m "تحديث"
git push
```

Vercel و Render هيعملوا auto-deploy!

---

## 🆘 مشاكل؟

### Backend لا يستجيب:
- تحقق من Render logs
- تأكد من Environment Variables

### CORS Error:
- تأكد من FRONTEND_URL صحيح في Render
- تأكد من VITE_API_URL صحيح في Vercel

### Database فاضية:
- شغل seed على الـ production database
- أو استخدم Railway

---

## 💡 نصيحة:
**للـ production الجاد**, استخدم:
- **Railway** للـ Backend (أفضل من Render)
- **PostgreSQL** بدل SQLite

---

**🚀 بالتوفيق!**

📖 للتفاصيل الكاملة: اقرأ `DEPLOYMENT_GUIDE.md`
