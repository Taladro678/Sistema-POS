#!/bin/bash
# Script para Termux:Widget (Android)

# 1. Ir a la carpeta del script
cd "$(dirname "$0")"

# 2. Iniciar el servidor
echo "Iniciando Sistema POS..."
node index.js
