const fs = require('fs');
// Siempre leer del backup original si existe para evitar arrastrar basura
const dbPath = fs.existsSync('/tmp/db_backup.json') ? '/tmp/db_backup.json' : '/home/luvin/.gemini/antigravity/scratch/Sistema-POS/server/server_db.json';
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('📊 total products:', db.products.length);

// IDs secuenciales simples para 0% de probabilidad de colisión o error de precisión
let nextId = 10001;

// Palabras clave de bebidas corregidas (sin 'agua' genérico para evitar 'aguacate')
const drinksKeywords = ['bebida', 'refresco', 'jugo', 'cerveza', 'licor', 'malta', 'soda', 'vino', 'whisky', 'ron', 'leche', 'lipton', 'pepsi', 'coca', 'frescolita', 'hit', 'chinotto', 'solera', 'polar', 'regional', 'caroreña', 'sangria'];
const waterKeywords = ['agua mineral', 'agua minalba', 'agua eva', 'agua placer', 'agua 5 litros', 'agua de botella', 'agua natural'];

const uniqueProducts = new Map();

db.products.forEach(p => {
    const name = p.name ? p.name.trim().toLowerCase() : '';
    const nameWords = name.split(' ');

    if (!name) return;

    if (!uniqueProducts.has(name)) {
        // ID Secuencial Garantizado
        p.id = nextId++;

        // Categorización Estricta
        const isDrink = drinksKeywords.some(kw => nameWords.includes(kw) || name.startsWith(kw + ' ')) ||
            waterKeywords.some(kw => name.includes(kw)); // Para agua somos un poco mas flexibles pero específicos

        const isAguacate = nameWords.includes('aguacate');

        if (isDrink && !isAguacate) {
            p.category = 'drinks';
        } else if (p.category === 'drinks') {
            console.log('🔄 Cleaning category for:', p.name);
            p.category = ''; // Limpiar si no es bebida
        }

        uniqueProducts.set(name, p);
    }
});

db.products = Array.from(uniqueProducts.values());
db.lastModified = new Date().toISOString(); // Forzar actualización

console.log('✅ Final unique products:', db.products.length);
console.log('📝 Sample IDs:', db.products.slice(0, 3).map(p => p.id));

fs.writeFileSync('/tmp/db_v217.json', JSON.stringify(db, null, 2));
