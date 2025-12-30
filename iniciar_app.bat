@echo off
title Sistema POS - LA AUTENTICA
echo ==========================================
echo      INICIANDO SISTEMA POS
echo ==========================================

if exist "node_modules" (
    echo [1/3] Dependencias ya instaladas. Saltando verificacion...
) else (
    echo [1/3] Verificando dependencias por primera vez...
    call npm install
)

echo [2/3] Iniciando SERVIDOR DE DATOS (Socket.io)...
start "SERVIDOR POS (NO CERRAR)" cmd /k "node server/index.js"

echo [3/3] Iniciando INTERFAZ GRAFICA (Vite)...
echo Espere mientras se abre el navegador...
start http://localhost:5174
call npm run dev

pause
