@echo off
cls
echo.
echo 🚀 Matripuntos Setup
echo ====================
echo.

REM Check if Node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js no está instalado. Instálalo desde: https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i

echo ✅ Node.js %NODE_VERSION%
echo ✅ npm %NPM_VERSION%
echo.

REM Install dependencies
echo 📦 Instalando dependencias...
echo.
call npm install

echo.
echo ✅ Setup completado!
echo.
echo Ahora abre DOS terminales (Command Prompt):
echo.
echo Terminal 1 (Frontend):
echo   npm run dev
echo.
echo Terminal 2 (Backend):
echo   npm run server
echo.
echo Luego abre en el navegador:
echo   http://localhost:5173
echo.
echo Para más info: type GETTING_STARTED.md
echo.
pause
