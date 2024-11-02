@echo off
:start
node src/server.js
if %ERRORLEVEL% EQU 0 goto end
timeout /t 5 /nobreak > nul
goto start
:end