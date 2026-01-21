#!/bin/bash
# Script para iniciar el Sistema POS en SEGUNDO PLANO (Linux)
# No deja terminal abierta. Notifica por escritorio.

# 1. Limpieza de procesos (Kill Switches)
pkill -f "node server/index.js" || true
fuser -k 3001/tcp >/dev/null 2>&1 || true
fuser -k 41234/udp >/dev/null 2>&1 || true

# 2. Iniciar en Segundo Plano (Silencioso)
# Guardamos log en 'pos_background.log' para debug si hace falta
# 2. Iniciar en Segundo Plano (Modo Indestructible - setsid)
# setsid crea una nueva sesión, desligando totalmente el proceso de la terminal
setsid npm run dev > pos_background.log 2>&1 < /dev/null &
PID=$!


echo "⚙️  Cargando motores del sistema..."
sleep 1
echo "🔌 Conectando base de datos y módulos..."
sleep 1
echo "🚀 Preparando interfaz gráfica..."
sleep 1

# 3. Obtener IP y Abrir Navegador
IP=$(hostname -I | awk '{print $1}')
URL="http://localhost:5174"
URL_NETWORK="http://$IP:5174"

# Asegurar variable de entorno gráfica
export DISPLAY=:0

echo "🔍 Intentando abrir navegador..." >> pos_background.log

# Intentar abrir navegador (Orden priorizado incluyendo XFCE)
if command -v exo-open > /dev/null; then
    # Método nativo XFCE (detectado en capturas)
    echo "Usando exo-open..." >> pos_background.log
    nohup exo-open --launch WebBrowser "$URL" >/dev/null 2>&1 &
elif command -v xdg-open > /dev/null; then
    echo "Usando xdg-open..." >> pos_background.log
    nohup xdg-open "$URL" >/dev/null 2>&1 &
elif command -v google-chrome > /dev/null; then
    echo "Usando google-chrome..." >> pos_background.log
    nohup google-chrome "$URL" >/dev/null 2>&1 &
elif command -v firefox > /dev/null; then
    echo "Usando firefox..." >> pos_background.log
    nohup firefox "$URL" >/dev/null 2>&1 &
else
    echo "❌ No se encontró navegador." >> pos_background.log
    # Fallback final: Notificar que abra manualmente
    notify-send -u critical "⚠️ Abre el navegador" "Haz click aquí o entra a: $URL"
fi

# 4. Notificar al Usuario
# Usamos notify-send (común en Ubuntu/Debian/Arch/Fedora)
notify-send -u normal -t 10000 \
    "🚀 Sistema POS Iniciado" \
    "El servidor corre en fondo (PID $PID).\nAbriendo navegador...\nAccede en: $URL_NETWORK"

echo "Sistema iniciado en background (PID $PID). Revisa las notificaciones."
exit 0
