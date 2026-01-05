#!/bin/bash
# Cambiar al directorio donde está este script
cd "$(dirname "$0")"

echo "Iniciando Servidor POS..."
node server/index.js
