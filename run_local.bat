@echo off
cls
cd deploy/project

call npm run dev
IF %ERRORLEVEL% NEQ 0 (
    echo Build failed
    exit /b %ERRORLEVEL%
)