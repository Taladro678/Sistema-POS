#!/bin/bash
echo "============================================="
echo "   🚀 INSTALADOR INTELIGENTE SISTEMA POS"
echo "============================================="

# 1. Ir a HOME (Zona Segura de Termux)
# Esto soluciona el problema de permisos y "zona segura"
cd $HOME
echo "📂 Entrando a zona segura: $(pwd)"

# 2. Instalar dependencias del sistema (si faltan)
echo "🛠️ Verificando herramientas del sistema..."
pkg install git nodejs -y

# 3. Verificar si ya existe el proyecto
if [ -d "Sistema-POS" ]; then
    echo "✅ Carpeta del proyecto detectada."
    cd Sistema-POS
    
    # Reparar git si está roto
    if [ ! -d ".git" ]; then
        echo "⚠️ Reparando configuración de Git..."
        git init
        git remote add origin https://github.com/Taladro678/Sistema-POS
    fi
    
    echo "⬇️ Forzando actualización desde GitHub..."
    git fetch origin main
    git reset --hard origin/main
else
    echo "🆕 Proyecto no encontrado. Clonando desde cero..."
    git clone https://github.com/Taladro678/Sistema-POS
    cd Sistema-POS
fi

# 4. Instalar dependencias de Node
echo "📦 Instalando librerías del proyecto..."
npm install

# 5. Construir la App (Frontend)
echo "🔨 Construyendo la aplicación (esto puede tardar)..."
npm run build

# 6. Iniciar Servidor
echo "============================================="
echo "   ✅ TODO LISTO - INICIANDO SERVIDOR"
echo "============================================="
node server/index.js
