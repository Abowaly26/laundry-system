@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════════
echo    🚀 تشغيل نظام إدارة المغسلة الذكية
echo ═══════════════════════════════════════════════════
echo.

echo [1/3] 🔧 تشغيل Backend Server...
start "Backend Server" cmd /k "cd /d "%~dp0server" && npm run dev"
timeout /t 3 >nul

echo [2/3] 🎨 تشغيل Frontend Client...
start "Frontend Client" cmd /k "cd /d "%~dp0client" && npm run dev"
timeout /t 3 >nul

echo [3/3] ✅ تم بنجاح!
echo.
echo ═══════════════════════════════════════════════════
echo   📌 معلومات مهمة:
echo ═══════════════════════════════════════════════════
echo.
echo   Backend:  http://localhost:5000/api
echo   Frontend: http://localhost:3001/
echo.
echo   🔐 بيانات الدخول:
echo   - المدير:  admin@laundry.com / admin123
echo   - الكاشير: cashier@laundry.com / cashier123
echo   - العامل:  worker@laundry.com / worker123
echo.
echo ═══════════════════════════════════════════════════
echo.
echo 💡 نصيحة: لا تغلق النوافذ المفتوحة للحفاظ على السيرفرات
echo.
pause
