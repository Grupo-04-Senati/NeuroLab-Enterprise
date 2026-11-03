@echo off
setlocal EnableExtensions EnableDelayedExpansion
title NeuroLab Enterprise - Launcher
cd /d "%~dp0"

echo ============================================
echo   NeuroLab Enterprise - Inicio del proyecto
echo ============================================
echo.

REM ---------- Requisitos ----------
where node >nul 2>nul
if errorlevel 1 goto no_node
where npm >nul 2>nul
if errorlevel 1 goto no_npm

REM ---------- Dependencias del frontend ----------
if exist "apps\web\node_modules" goto check_api

echo [web] node_modules no encontrado. Instalando dependencias...
pushd "apps\web"
call npm install
if errorlevel 1 (
    echo [ERROR] Fallo npm install en apps\web.
    popd
    pause
    exit /b 1
)
popd
echo [web] Dependencias instaladas.
echo.

REM ---------- Backend FastAPI ----------
:check_api
set "API_ENTRY=services\api\app\main.py"

if not exist "%API_ENTRY%" goto skip_api

where python >nul 2>nul
if errorlevel 1 (
    echo [AVISO] Python no encontrado. Se omite el backend.
    goto start_web
)

if exist "venv\Scripts\python.exe" goto start_api

echo [api] Creando entorno virtual venv...
python -m venv venv
if errorlevel 1 (
    echo [AVISO] No se pudo crear el entorno virtual. Se omite el backend.
    goto start_web
)

echo [api] Instalando dependencias del backend...
"venv\Scripts\python.exe" -m pip install --upgrade pip
"venv\Scripts\python.exe" -m pip install -r services\api\requirements.txt
if errorlevel 1 (
    echo [AVISO] Fallo la instalacion de requirements. Se omite el backend.
    goto start_web
)

:start_api
echo [api] Iniciando FastAPI en una ventana nueva...
start "NeuroLab API" /D "%~dp0" cmd /k venv\Scripts\python.exe %API_ENTRY%
goto start_web

:skip_api
echo [AVISO] Backend sin punto de entrada "%API_ENTRY%".
echo         Se inicia unicamente el frontend.
echo.

REM ---------- Frontend Vite ----------
:start_web
echo [web] Iniciando Vite en una ventana nueva...
start "NeuroLab Web" /D "%~dp0apps\web" cmd /k npm run dev

echo.
echo ============================================
echo   Web:  http://localhost:5173
echo   API:  http://localhost:8000/docs
echo ============================================
echo.
echo Cierra las ventanas abiertas para detener los servicios.
pause
exit /b 0

:no_node
echo [ERROR] Node.js no esta instalado o no esta en el PATH.
echo         Descargalo en https://nodejs.org/
echo.
pause
exit /b 1

:no_npm
echo [ERROR] npm no esta disponible en el PATH.
echo.
pause
exit /b 1
