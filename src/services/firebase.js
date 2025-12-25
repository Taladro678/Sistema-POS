import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';

// ⚠️ IMPORTANTE: SUSTITUIR ESTOS VALORES POR LOS DE TU PROYECTO FIREBASE REAL
// Ve a https://console.firebase.google.com/ > Configuración del Proyecto > General > Tus Apps > SDK setup
const firebaseConfig = {
    apiKey: "AIzaSyD_PLACEHOLDER_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
let app;
let db;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase initialized globally');
} catch (error) {
    console.error('❌ Error initializing Firebase:', error);
}

/**
 * Service to handle background sync with Firebase Cloud
 */
export const firebaseSyncService = {
    /**
     * Uploads a single sale record to Firestore
     * @param {Object} sale - The sale object
     */
    async uploadSale(sale) {
        if (!db) return false;
        try {
            // Use setDoc with sale ID to ensure idempotency (avoid duplicates)
            await setDoc(doc(db, "sales", String(sale.id)), {
                ...sale,
                _syncedAt: new Date().toISOString()
            });
            console.log(`☁️ Sale ${sale.id} synced to Cloud`);
            return true;
        } catch (error) {
            console.warn(`⚠️ Cloud Sync failed for sale ${sale.id} (will retry later):`, error);
            return false;
        }
    },

    /**
     * Batch upload for multiple sales (efficient bulk sync)
     * @param {Array} sales - Array of sale objects
     */
    async uploadSalesBatch(sales) {
        if (!db || sales.length === 0) return 0;

        // const batchSize = 500; // Firestore batch limit (preserved as comment for context)
        let successCount = 0;

        try {
            // Process in chunks if needed, for now assuming reasonably small batches for sync
            const batch = writeBatch(db);

            sales.forEach(sale => {
                const saleRef = doc(db, "sales", String(sale.id));
                batch.set(saleRef, {
                    ...sale,
                    _syncedAt: new Date().toISOString()
                });
            });

            await batch.commit();
            successCount = sales.length;
            console.log(`☁️ Batch synced ${successCount} sales to Cloud`);
        } catch (error) {
            console.error('❌ Batch cloud sync failed:', error);
        }
        return successCount;
    },

    /**
     * Minimal health check for internet/firebase connection
     */
    async checkConnection() {
        if (!db) return false;
        try {
            // Dummy read to check connectivity (optional)
            // For now, assume if app initialized, we try. 
            // Real check implies network state mostly.
            return navigator.onLine;
        } catch {
            return false;
        }
    }
};

export { db };
