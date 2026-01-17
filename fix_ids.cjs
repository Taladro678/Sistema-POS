const fs = require('fs');
const db = JSON.parse(fs.readFileSync('/tmp/db_backup.json', 'utf8'));

console.log('📊 Procesando ' + db.products.length + ' productos...');

const uniqueProducts = new Map();
const timestamp = Date.now();
let counter = 0;

db.products.forEach(p => {
    const name = p.name.trim().toLowerCase();
    if (!uniqueProducts.has(name)) {
        // ID seguro: timestamp (13 digitos) + contador (3 digitos) = 16 digitos
        p.id = (timestamp * 1000) + (counter % 1000);
        counter++;
        uniqueProducts.set(name, p);
    }
});

const finalProducts = Array.from(uniqueProducts.values());
db.products = finalProducts;

console.log('✅ Restaurados ' + finalProducts.length + ' productos únicos.');
console.log('📝 Ejemplo de IDs:', finalProducts.slice(0, 5).map(p => p.id));
console.log('🛡️ MAX_SAFE_INTEGER:', Number.MAX_SAFE_INTEGER);

fs.writeFileSync('/tmp/db_final_fix.json', JSON.stringify(db, null, 2));
