@echo off
set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "PROJECT_ROOT=%~dp0"
set "SERVER_FILE=%PROJECT_ROOT%backend\src\server.js"

if exist "%BUNDLED_NODE%" (
  "%BUNDLED_NODE%" "%SERVER_FILE%"
  exit /b %ERRORLEVEL%
)

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
  node "%SERVER_FILE%"
  exit /b %ERRORLEVEL%
)

echo Node.js was not found.
echo Install Node.js LTS from https://nodejs.org/
exit /b 1
