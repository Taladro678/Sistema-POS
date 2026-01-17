const fs = require('fs');
const db = JSON.parse(fs.readFileSync('/tmp/db_backup.json', 'utf8'));

console.log('📊 total products:', db.products.length);

// 13-digit safe IDs: timestamp in seconds (10 digits) + counter (3 digits)
const timestampSec = Math.floor(Date.now() / 1000);
let counter = 0;

const drinksKeywords = ['bebida', 'refresco', 'jugo', 'agua', 'cerveza', 'licor', 'malta', 'soda', 'vino', 'whisky', 'ron', 'zelle', 'leche', 'te ', 'te#', 'lipton', 'pepsi', 'coca', 'frescolita', 'hit', 'chinotto', 'solera', 'polar', 'regional', 'caroreña', 'sangria'];

const uniqueProducts = new Map();

db.products.forEach(p => {
    const name = p.name ? p.name.trim().toLowerCase() : '';
    if (!name) return;

    if (!uniqueProducts.has(name)) {
        // Safe ID
        p.id = (timestampSec * 1000) + (counter % 1000);
        counter++;

        // Categorization Fix
        const words = name.split(' ');
        const isDrink = drinksKeywords.some(kw => words.includes(kw) || name.startsWith(kw + ' '));

        if (p.category === 'drinks' && !isDrink) {
            console.log('🔄 De-categorizing:', p.name);
            p.category = '';
        } else if (isDrink) {
            p.category = 'drinks';
        }

        uniqueProducts.set(name, p);
    }
});

db.products = Array.from(uniqueProducts.values());

console.log('✅ Final unique products:', db.products.length);
console.log('📝 IDs are 13 digits like:', db.products[0].id);

fs.writeFileSync('/tmp/db_final_final.json', JSON.stringify(db, null, 2));
