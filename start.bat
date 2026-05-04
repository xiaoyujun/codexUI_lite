@echo off
setlocal EnableExtensions
chcp 65001 >nul

pushd "%~dp0" >nul
if errorlevel 1 (
  echo Failed to enter the project directory: %~dp0
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found in PATH.
  echo Install Node.js 18 or newer, then run this script again.
  popd >nul
  pause
  exit /b 1
)

set "PNPM_CMD=pnpm"
where pnpm >nul 2>nul
if errorlevel 1 (
  where corepack >nul 2>nul
  if errorlevel 1 (
    echo pnpm was not found in PATH, and Corepack is unavailable.
    echo Install pnpm or enable Corepack, then run this script again.
    popd >nul
    pause
    exit /b 1
  )
  set "PNPM_CMD=corepack pnpm"
)

if not defined CODEXUI_SANDBOX_MODE set "CODEXUI_SANDBOX_MODE=danger-full-access"
if not defined CODEXUI_APPROVAL_POLICY set "CODEXUI_APPROVAL_POLICY=never"

if not exist "node_modules\.bin\vite.cmd" (
  echo Dependencies are missing. Running pnpm install...
  call %PNPM_CMD% install
  if errorlevel 1 (
    set "EXIT_CODE=%ERRORLEVEL%"
    popd >nul
    echo.
    echo Dependency installation failed with exit code %EXIT_CODE%.
    pause
    exit /b %EXIT_CODE%
  )
)

echo Starting codexui from: %CD%

if "%~1"=="" (
  echo URL: http://127.0.0.1:5173
  echo Tip: pass Vite args after the script name, for example:
  echo   start.bat --host 0.0.0.0 --port 4173
  call %PNPM_CMD% exec vite --host 127.0.0.1 --port 5173
) else (
  echo Dev args: %*
  call %PNPM_CMD% exec vite %*
)

set "EXIT_CODE=%ERRORLEVEL%"
popd >nul

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Startup failed with exit code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%
