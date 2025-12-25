@echo off
echo ===================================================
echo   SISTEMA POS - INICIANDO SERVIDORES
echo ===================================================
echo.
echo 1. Iniciando Servidor Local (Node.js)...
start "POS SERVER" cmd /k "cd server && npm start"
echo.
echo 2. Iniciando Cliente React (Vite)...
start "POS CLIENT" cmd /k "npm run dev"
echo.
echo ===================================================
echo   SISTEMA INICIADO
echo   - Localhost: http://localhost:5173
echo   - Server API: http://localhost:3001
echo ===================================================
timeout /t 5
start http://localhost:5173
exit
