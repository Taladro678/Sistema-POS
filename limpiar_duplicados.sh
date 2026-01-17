#!/bin/bash
# Script para limpiar productos duplicados en el dispositivo Android

echo "🔧 Limpiando productos duplicados..."

# Pull DB
adb -s YBZ2350WYDB3000839 shell "run-as com.sistemapos.app cat files/www/nodejs-project/server/server_db.json" > /tmp/db_backup.json

# Run cleanup with Node
node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('/tmp/db_backup.json', 'utf8'));

console.log('📊 Productos antes:', db.products.length);

// Remove duplicates by ID (keep first occurrence)
const seen = new Set();
db.products = db.products.filter(p => {
    if (seen.has(p.id)) {
        console.log('❌ Eliminando duplicado:', p.name, 'ID:', p.id);
        return false;
    }
    seen.add(p.id);
    return true;
});

console.log('✅ Productos después:', db.products.length);
fs.writeFileSync('/tmp/db_clean.json', JSON.stringify(db, null, 2));
"

# Push back
adb -s YBZ2350WYDB3000839 push /tmp/db_clean.json /data/local/tmp/db_clean.json
adb -s YBZ2350WYDB3000839 shell "run-as com.sistemapos.app cp /data/local/tmp/db_clean.json files/www/nodejs-project/server/server_db.json"

# Restart app
adb -s YBZ2350WYDB3000839 shell am force-stop com.sistemapos.app
adb -s YBZ2350WYDB3000839 shell am start -n com.sistemapos.app/.MainActivity

echo "✅ Limpieza completa. Reiniciando app..."
