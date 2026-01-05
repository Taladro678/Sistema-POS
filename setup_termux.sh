#!/bin/bash

echo "========================================"
echo "   INSTALADOR SERVIDOR POS (ANDROID)    "
echo "========================================"
echo ""

echo "1. Solicitando acceso al almacenamiento..."
termux-setup-storage
sleep 2

echo "2. Actualizando paquetes..."
pkg update -y && pkg upgrade -y

echo "3. Instalando Node.js y Git..."
pkg install nodejs git -y

echo "4. Verificando carpeta del proyecto..."
if [ ! -f "package.json" ]; then
    echo "❌ No se encontró package.json."
    echo "⚠️ Asegúrate de estar dentro de la carpeta del proyecto."
    exit 1
fi

echo "5. Instalando dependencias..."
npm install

echo "6. Construyendo aplicación web (Frontend)..."
echo "   Esto puede tardar unos minutos..."
npm run build

echo ""
echo "========================================"
echo "   ✅ INSTALACIÓN COMPLETADA"
echo "========================================"
echo ""
echo "Para iniciar el servidor en el futuro, usa:"
echo "node server/index.js"
echo ""
echo "Iniciando ahora..."
node server/index.js
