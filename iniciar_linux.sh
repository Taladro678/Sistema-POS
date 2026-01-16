#!/bin/bash
# Script para iniciar el Sistema POS en Linux

# Colores para la terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}      INICIANDO SISTEMA POS (LINUX)      ${NC}"
echo -e "${BLUE}==========================================${NC}"

# 1. Verificar dependencias
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}[1/3]${NC} Instalando dependencias del frontend..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo -e "${BLUE}[1/3]${NC} Instalando dependencias del servidor..."
    cd server && npm install && cd ..
fi

# 2. Iniciar el Servidor de Datos en segundo plano
echo -e "${BLUE}[2/3]${NC} Iniciando SERVIDOR DE DATOS..."
node server/index.js &
SERVER_PID=$!

# 3. Iniciar el Frontend (Vite)
echo -e "${BLUE}[3/3]${NC} Iniciando INTERFAZ GRAFICA..."
echo -e "${GREEN}La aplicación se abrirá en tu navegador en breve...${NC}"
npm run dev

# Al cerrar el script, matar el proceso del servidor
trap "kill $SERVER_PID" EXIT
