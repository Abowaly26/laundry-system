@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════════
echo    🚀 تجهيز المشروع للرفع على Vercel
echo ═══════════════════════════════════════════════════
echo.

echo [1/5] 📦 تثبيت Dependencies...
cd client
call npm install
cd ..

cd server
call npm install
cd ..

echo.
echo [2/5] 🧪 اختبار Build...
cd client
call npm run build
if errorlevel 1 (
    echo ❌ فشل Build! راجع الأخطاء
    pause
    exit /b 1
)
cd ..

echo.
echo [3/5] 📝 إنشاء .gitignore...
(
echo node_modules
echo dist
echo .env
echo .env.local
echo *.log
echo .DS_Store
echo database.db
echo .vercel
) > .gitignore

echo.
echo [4/5] 🔧 تهيئة Git...
git init
git add .
git commit -m "Initial commit - Ready for deployment"

echo.
echo [5/5] ✅ تم التجهيز!
echo.
echo ═══════════════════════════════════════════════════
echo   📋 الخطوات التالية:
echo ═══════════════════════════════════════════════════
echo.
echo 1. أنشئ repository على GitHub
echo 2. اربط الـ repository:
echo    git remote add origin https://github.com/YOUR_USERNAME/laundry-system.git
echo    git push -u origin main
echo.
echo 3. Backend: ارفع على Render.com (راجع DEPLOYMENT_GUIDE.md)
echo 4. Frontend: ارفع على Vercel.com
echo.
echo 📖 اقرأ DEPLOYMENT_GUIDE.md للتفاصيل الكاملة
echo.
pause
