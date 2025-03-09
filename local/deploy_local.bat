@echo off
cls
cd deploy/project

call npm run build
IF %ERRORLEVEL% NEQ 0 (
    echo Build failed
    exit /b %ERRORLEVEL%
)

timeout /t 3 /nobreak
npx serve dist
