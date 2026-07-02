@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════════
echo    🛑 إيقاف نظام إدارة المغسلة الذكية
echo ═══════════════════════════════════════════════════
echo.

echo [1/3] 🔍 البحث عن عمليات Node.js...
echo.

echo [2/3] 🛑 إيقاف Backend (Port 5000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    taskkill /PID %%a /F 2>nul
    if not errorlevel 1 (
        echo     ✅ تم إيقاف Backend
    )
)

echo.
echo [3/3] 🛑 إيقاف Frontend (Port 3001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    taskkill /PID %%a /F 2>nul
    if not errorlevel 1 (
        echo     ✅ تم إيقاف Frontend
    )
)

echo.
echo ═══════════════════════════════════════════════════
echo   ✅ تم إيقاف جميع الخوادم
echo ═══════════════════════════════════════════════════
echo.
pause
