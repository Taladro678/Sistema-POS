#!/bin/bash
echo "==================================="
echo "   ACTUALIZADOR AUTOMATICO POS"
echo "==================================="

# 1. Asegurar que git sepa de donde bajar
git remote add origin https://github.com/Taladro678/Sistema-POS 2>/dev/null

# 2. Bajar cambios (forzando para evitar errores de historia)
echo "⬇️ Descargando cambios..."
git fetch origin main
git reset --hard origin/main

# 3. Instalar y Construir
echo "📦 Instalando librerías..."
npm install
echo "🔨 Construyendo App (esto tarda un poco)..."
npm run build

# 4. Iniciar
echo "✅ Todo listo. Iniciando servidor..."
node server/index.js
