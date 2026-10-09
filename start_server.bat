@echo off
title Dekthep Panel - Starting Server
chcp 65001 >nul
cls
echo ==========================================================
echo       DEKTHEP PANEL - SYSTEM REST API & WEB SERVER
echo ==========================================================
echo กำลังเริ่มต้นระบบเซิร์ฟเวอร์บนพอร์ต 8080...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_server.ps1"

pause
