#!/bin/bash
echo "========================================"
echo "   DIAGNÓSTICO SISTEMA POS (ANDROID)    "
echo "========================================"
echo ""

# 1. Verificaciones Básicas
echo "1. Verificando entorno..."
echo "   Node.js: $(node -v 2>/dev/null || echo 'No instalado')"
echo "   NPM: $(npm -v 2>/dev/null || echo 'No instalado')"
echo "   Directorio: $(pwd)"
echo ""

# 2. Verificando Archivos Críticos
echo "2. Verificando archivos..."
if [ -f "package.json" ]; then echo "   ✅ package.json encontrado"; else echo "   ❌ FALTA package.json"; fi
if [ -f "server/index.js" ]; then echo "   ✅ server/index.js encontrado"; else echo "   ❌ FALTA server/index.js"; fi
if [ -d "node_modules" ]; then echo "   ✅ node_modules encontrado"; else echo "   ❌ FALTA node_modules (ejecuta setup_termux.sh)"; fi
if [ -d "dist" ]; then echo "   ✅ carpeta dist encontrada"; else echo "   ⚠️ FALTA carpeta dist (la web no cargará, pero el server debería iniciar)"; fi
echo ""

# 3. Prueba de Ejecución
echo "3. Intentando iniciar servidor (Prueba de 5 segundos)..."
echo "   Si ves errores abajo, por favor compártelos."
echo "----------------------------------------"

# Ejecutar y matar después de 5 segundos si no falla antes
timeout 5s node server/index.js

EXIT_CODE=$?
echo "----------------------------------------"
if [ $EXIT_CODE -eq 124 ]; then
    echo "✅ El servidor parece haber iniciado correctamente (se detuvo la prueba)."
elif [ $EXIT_CODE -eq 0 ]; then
    echo "⚠️ El servidor se cerró inesperadamente sin código de error."
else
    echo "❌ El servidor falló con código de error: $EXIT_CODE"
fi
