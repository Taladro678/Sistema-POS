@echo off
title SERVIDOR POS - La Autentica
color 0A
echo ===================================================
echo   INICIANDO SERVIDOR DE SINCRONIZACION LOCAL
echo   (No cierres esta ventana mientras uses el POS)
echo ===================================================
echo.
cd server
if not exist node_modules (
    echo Instalando dependencias del servidor...
    npm install
)
node index.js
pause
