@echo off
title Sistema POS - LA AUTENTICA
echo ==========================================
echo      INICIANDO SISTEMA POS
echo ==========================================

echo [1/3] Verificando dependencias...
call npm install

echo [2/3] Iniciando SERVIDOR DE DATOS (Socket.io)...
start "SERVIDOR POS (NO CERRAR)" cmd /k "node server/index.js"

echo [3/3] Iniciando INTERFAZ GRAFICA (Vite)...
echo Espere mientras se abre el navegador...
start http://localhost:5174
call npm run dev

pause
