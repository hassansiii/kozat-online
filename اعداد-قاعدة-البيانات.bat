@echo off
chcp 65001 >nul
echo ========================================
echo   اعداد قاعدة بيانات كوزات اونلاين
echo ========================================
echo.
echo يجب تشغيل هذا الملف كمسؤول (Run as administrator)
echo.

net session >nul 2>&1
if errorlevel 1 (
  echo الرجاء: اضغط يمين على الملف واختر "تشغيل كمسؤول"
  pause
  exit /b 1
)

set PATH=C:\Program Files\PostgreSQL\16\bin;%PATH%
set HBA=C:\Program Files\PostgreSQL\16\data\pg_hba.conf

echo [1/5] نسخ احتياطي وتسهيل الدخول مؤقتا...
copy /Y "%HBA%" "%HBA%.bak-setup" >nul
powershell -NoProfile -Command "(Get-Content '%HBA%' -Raw) -replace 'scram-sha-256','trust' | Set-Content '%HBA%' -Encoding Ascii"

echo [2/5] اعادة تشغيل PostgreSQL...
net stop postgresql-x64-16
net start postgresql-x64-16
timeout /t 3 >nul

echo [3/5] انشاء المستخدم وقاعدة البيانات...
psql -U postgres -h 127.0.0.1 -d postgres -c "ALTER USER postgres WITH PASSWORD 'kozat123';"
psql -U postgres -h 127.0.0.1 -d postgres -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kozat') THEN CREATE USER kozat WITH PASSWORD 'kozat123' SUPERUSER; ELSE ALTER USER kozat WITH PASSWORD 'kozat123' SUPERUSER; END IF; END $$;"
psql -U postgres -h 127.0.0.1 -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='kozat_online'" | findstr 1 >nul
if errorlevel 1 (
  psql -U postgres -h 127.0.0.1 -d postgres -c "CREATE DATABASE kozat_online OWNER kozat;"
)

echo [4/5] ارجاع الحماية...
copy /Y "%HBA%.bak-setup" "%HBA%" >nul
net stop postgresql-x64-16
net start postgresql-x64-16
timeout /t 3 >nul

echo [5/5] اختبار الاتصال...
set PGPASSWORD=kozat123
psql -U kozat -h 127.0.0.1 -d kozat_online -c "SELECT 'OK' AS status, current_user, current_database();"
if errorlevel 1 (
  echo فشل الاتصال. راجع الرسائل اعلاه.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   تم بنجاح
echo   كلمة المرور الجديدة لقاعدة البيانات: kozat123
echo ========================================
echo.
echo الان ارجع الى Cursor واكتب: تم
pause
