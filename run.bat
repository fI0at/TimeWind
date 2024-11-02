@echo off
:start
npm start
if %ERRORLEVEL% EQU 0 goto end
timeout /t 5 /nobreak > nul
goto start
:end