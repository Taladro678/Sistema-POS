import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, writeBatch, onSnapshot, collection } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

// ⚠️ IMPORTANTE: SUSTITUIR ESTOS VALORES POR LOS DE TU PROYECTO FIREBASE REAL
const firebaseConfig = {
    apiKey: "AIzaSyDEV4p3NYy8c2fDlvCyICqHF5rOJgGax_s",
    authDomain: "sistema-pos-la-autentica-96610.firebaseapp.com",
    projectId: "sistema-pos-la-autentica-96610",
    storageBucket: "sistema-pos-la-autentica-96610.firebasestorage.app",
    messagingSenderId: "475856195440",
    appId: "1:475856195440:web:af653663b1487c662cc9b5"
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
    console.log('🔐 Encryption Key Set for Cloud Sync');
};

const encryptData = (data) => {
    if (!ENCRYPTION_KEY) return null;
    try {
        const jsonString = JSON.stringify(data);
        return CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
    } catch (e) {
        console.error('Encryption failed:', e);
        return null;
    }
};

const decryptData = (ciphertext) => {
    if (!ENCRYPTION_KEY || !ciphertext) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted ? JSON.parse(decrypted) : null;
    } catch (e) {
        console.error('Decryption failed:', e);
        return null;
    }
};

/**
 * Service to handle background sync with Firebase Cloud
 */
export const firebaseSyncService = {
    /**
     * Uploads the FULL APP STATE to a central backup document
     * @param {Object} fullState - The entire data state
     * @param {String} deviceId - Unique ID for this device/node
     */
    async syncFullState(fullState, deviceId = 'primary_pos') {
        if (!db) return false;
        try {
            const encryptedData = encryptData(fullState);
            if (!encryptedData) return false;

            await setDoc(doc(db, "backups", deviceId), {
                payload: encryptedData,
                lastModified: fullState.lastModified || new Date().toISOString(),
                _syncedAt: new Date().toISOString(),
                _isFullBackup: true
            });
            console.log(`☁️ Full state synced to Cloud (${deviceId})`);
            return true;
        } catch (error) {
            console.error('❌ Cloud Full Sync failed:', error);
            return false;
        }
    },

    /**
     * Fetches the FULL APP STATE from the cloud
     * @param {String} deviceId - Unique ID to fetch
     */
    async fetchFullState(deviceId = 'primary_pos') {
        if (!db) return null;
        try {
            const docRef = doc(db, "backups", deviceId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return decryptData(data.payload);
            }
            return null;
        } catch (error) {
            console.error('❌ Cloud Fetch failed:', error);
            return null;
        }
    },

    /**
     * Uploads a single sale record
     */
    async uploadSale(sale) {
        if (!db) return false;
        try {
            const encryptedData = encryptData(sale);
            if (!encryptedData) return false;

            await setDoc(doc(db, "sales", String(sale.id)), {
                payload: encryptedData,
                _syncedAt: new Date().toISOString(),
                _encrypted: true
            });
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Listens for changes in the FULL APP STATE for real-time remote monitoring
     * @param {String} deviceId - ID to listen to
     * @param {Function} callback - Function to run on change
     */
    subscribeToFullState(deviceId = 'primary_pos', callback) {
        if (!db) return () => { };
        const docRef = doc(db, "backups", deviceId);
        return onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const decrypted = decryptData(data.payload);
                if (decrypted) callback(decrypted);
            }
        }, (error) => {
            console.error('❌ Cloud Subscription failed:', error);
        });
    },

    /**
     * Sincroniza los carritos activos en tiempo real a la nube
     */
    async syncActiveCarts(activeCarts, deviceId = 'primary_pos') {
        if (!db) return false;
        try {
            await setDoc(doc(db, "live_status", deviceId), {
                activeCarts,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            return true;
        } catch (error) {
            console.error('❌ Sync Active Carts failed:', error);
            return false;
        }
    },

    /**
     * Escucha los carritos activos de otros dispositivos en la nube
     */
    subscribeToCloudCarts(callback) {
        if (!db) return () => { };
        const colRef = collection(db, "live_status");
        return onSnapshot(colRef, (snapshot) => {
            const allCarts = {};
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.activeCarts) {
                    Object.assign(allCarts, data.activeCarts);
                }
            });
            callback(allCarts);
        });
    },

    async checkConnection() {
        if (!db) return false;
        return navigator.onLine;
    }
};

export { db };
