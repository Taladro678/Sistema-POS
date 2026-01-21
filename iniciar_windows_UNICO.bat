@echo off
:: Script Unificado para Iniciar POS en Windows (Oculto)
:: Este script se relanza a sí mismo de forma oculta usando VBScript temporal.

if "%1"=="h" goto :hidden

:: --- BLOQUE DE LANZAMIENTO OCULTO ---
echo Creando lanzador invisible...
set "TEMP_VBS=%temp%\pos_launcher.vbs"
echo Set WshShell = CreateObject("WScript.Shell") > "%TEMP_VBS%"
echo WshShell.Run chr(34) ^& "%~nx0" ^& chr(34) ^& " h", 0 >> "%TEMP_VBS%"
echo Set WshShell = Nothing >> "%TEMP_VBS%"

echo Iniciando sistema...
wscript "%TEMP_VBS%"
del "%TEMP_VBS%"
exit

:hidden
:: --- BLOQUE DE EJECUCIÓN PRINCIPAL (Ya oculto) ---
cd /d "%~dp0"

:: 1. Limpieza de procesos anteriores
taskkill /F /IM node.exe >nul 2>&1

:: 2. Iniciar Servidor y Cliente
:: Usamos start /B para que corra en este mismo proceso oculto
start "" /B npm run dev > pos_windows.log 2>&1

:: 3. Esperar arranque
timeout /t 10 >nul

:: 4. Abrir Navegador
start http://localhost:5174

:: 5. Notificar al Usuario
powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('El Sistema POS se está ejecutando en segundo plano.' + [Environment]::NewLine + 'Accede en: http://localhost:5174', 'Sistema POS Iniciado')"

exit
