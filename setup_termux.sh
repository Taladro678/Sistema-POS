#!/bin/bash

echo "========================================"
echo "   INSTALADOR SERVIDOR POS (ANDROID)    "
echo "========================================"
echo ""
echo "1. Actualizando paquetes..."
pkg update -y && pkg upgrade -y

echo "2. Instalando Node.js y Git..."
pkg install nodejs git -y

echo "3. Verificando carpeta del proyecto..."
# Check if we are in the project folder, if not, try to clone or ask user
if [ ! -f "package.json" ]; then
    echo "No se encontró package.json. Clonando repositorio..."
    # Replace with your actual repo URL if needed, or assume user copied files
    # For now, we assume user might have copied files or is running this inside the folder
    echo "⚠️ Por favor, ejecuta este script DENTRO de la carpeta del proyecto."
    echo "   Si acabas de abrir Termux, usa 'cd' para ir a la carpeta."
    exit 1
fi

echo "4. Instalando dependencias del servidor..."
npm install

echo ""
echo "========================================"
echo "   ✅ INSTALACIÓN COMPLETADA"
echo "========================================"
echo ""
echo "Iniciando Servidor..."
echo "----------------------------------------"
node server/index.js
