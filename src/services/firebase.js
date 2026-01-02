import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

// ⚠️ IMPORTANTE: SUSTITUIR ESTOS VALORES POR LOS DE TU PROYECTO FIREBASE REAL
// Ve a https://console.firebase.google.com/ > Configuración del Proyecto > General > Tus Apps > SDK setup
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
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

// Encryption Helper
let ENCRYPTION_KEY = null;

export const setEncryptionKey = (key) => {
    ENCRYPTION_KEY = key;
    console.log('🔐 Encryption Key Set');
};

const encryptData = (data) => {
    if (!ENCRYPTION_KEY) {
        console.warn('⚠️ No encryption key set. Data will NOT be encrypted.');
        return null;
    }
    try {
        const jsonString = JSON.stringify(data);
        return CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
    } catch (e) {
        console.error('Encryption failed:', e);
        return null;
    }
};

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
            const encryptedData = encryptData(sale);
            if (!encryptedData) return false;

            // Use setDoc with sale ID to ensure idempotency (avoid duplicates)
            // We store the encrypted string in a field called 'payload'
            await setDoc(doc(db, "sales", String(sale.id)), {
                payload: encryptedData,
                _syncedAt: new Date().toISOString(),
                _encrypted: true
            });
            console.log(`☁️ Sale ${sale.id} synced to Cloud (Encrypted)`);
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
                const encryptedData = encryptData(sale);
                if (encryptedData) {
                    const saleRef = doc(db, "sales", String(sale.id));
                    batch.set(saleRef, {
                        payload: encryptedData,
                        _syncedAt: new Date().toISOString(),
                        _encrypted: true
                    });
                }
            });

            await batch.commit();
            successCount = sales.length;
            console.log(`☁️ Batch synced ${successCount} sales to Cloud (Encrypted)`);
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
