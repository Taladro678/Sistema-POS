const express = require('express');
const { createServer } = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const os = require('os');
const fs = require('fs');
const path = require('path');
const CryptoJS = require('crypto-js');
// const { checkForUpdates } = require('./updater.mjs'); // Commented out for now if updater is ESM

const VERSION = '2.3.2'; // UI Fixes + Encryption

// Solo activar auto-update si se detecta entorno Android (o se fuerza por config)
const isAndroid = process.env.NODE_PLATFORM === 'android';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);

// Serve Static Files (Frontend)
const distPath = process.env.FRONTEND_DIST_PATH || path.join(__dirname, '../dist');
app.use(express.static(distPath));



// Get Local IP
const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
};

const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for local network access
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

// In-Memory State (Centralized Source of Truth)
let appState = {
    // Core Data
    inventory: [],
    products: [],
    suppliers: [],
    personnel: [],
    users: [],
    categories: [],
    customers: [],

    // Transactional Data
    sales: [],
    heldOrders: [],
    kitchenOrders: [],
    barOrders: [],
    tables: [],
    cancelledOrders: [],

    // Financial Data
    tips: 0,
    tipHistory: [],
    tipDistributions: [],
    exchangeRate: 60,
    rateHistory: [],
    cashRegister: {},
    defaultForeignCurrencyDiscountPercent: 0,

    // Metadata
    lastModified: new Date().toISOString()
};

let serverPassword = null;
let isLocked = false;

const INTERNAL_DATA_DIR = path.join(__dirname, '../data');
const EXTERNAL_DATA_DIR = '/sdcard/Documents/SistemaPOS_Data';
let DATA_DIR = INTERNAL_DATA_DIR;

// Determinamos la carpeta de datos principal (Estrategia Termux-Bridge)
if (isAndroid) {
    try {
        if (!fs.existsSync(EXTERNAL_DATA_DIR)) {
            fs.mkdirSync(EXTERNAL_DATA_DIR, { recursive: true });
        }
        DATA_DIR = EXTERNAL_DATA_DIR;
        console.log('📱 ANDROID (nodejs-project): Usando almacenamiento externo en:', DATA_DIR);
    } catch (e) {
        console.warn('⚠️ No se pudo acceder a /sdcard. Usando almacenamiento interno:', e.message);
        DATA_DIR = INTERNAL_DATA_DIR;
    }
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'server_db.json');
const INTERNAL_DB_FILE = path.join(INTERNAL_DATA_DIR, 'server_db.json');
const OLD_DB_FILE = path.join(__dirname, 'server_db.json');

// Migration Logic: If old DB exists and new one doesn't, move it.
if (fs.existsSync(OLD_DB_FILE) && !fs.existsSync(DB_FILE)) {
    try {
        fs.copyFileSync(OLD_DB_FILE, DB_FILE);
        console.log('🚚 Base de datos migrada a ubicación persistente');
    } catch (e) {
        console.error('⚠️ Error migrando base de datos:', e);
    }
}

// Encryption Helpers
const encrypt = (text) => MASTER_KEY ? CryptoJS.AES.encrypt(text, MASTER_KEY).toString() : text;
const decrypt = (cipherText) => {
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, MASTER_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) { return null; }
};

// Load State Logic
const loadState = () => {
    let sourceFile = DB_FILE;

    // Auto-recuperación: si no hay externo pero hay interno
    if (isAndroid && !fs.existsSync(DB_FILE) && fs.existsSync(INTERNAL_DB_FILE)) {
        console.log('🔄 Recuperando base de datos desde almacenamiento interno...');
        try { fs.copyFileSync(INTERNAL_DB_FILE, DB_FILE); } catch (e) { }
    }

    if (fs.existsSync(sourceFile)) {
        try {
            const data = fs.readFileSync(sourceFile, 'utf8');
            if (data.trim().startsWith('{')) {
                const loadedState = JSON.parse(data);
                appState = { ...appState, ...loadedState };
                isLocked = false;
                console.log('📂 Estado cargado (Texto Plano)');
            } else {
                if (!MASTER_KEY) {
                    isLocked = true;
                    console.log('🔒 Base de datos cifrada. Esperando clave...');
                    return false;
                }
                const decrypted = decrypt(data);
                if (decrypted) {
                    appState = { ...appState, ...JSON.parse(decrypted) };
                    isLocked = false;
                    console.log('🔓 Estado descifrado con éxito');
                } else {
                    console.error('❌ Clave maestra incorrecta');
                    return false;
                }
            }
            return true;
        } catch (e) {
            console.error('⚠️ Error cargando base de datos:', e);
            return false;
        }
    }
    isLocked = false;
    return true;
};

loadState();

const decryptState = (password) => {
    if (!rawFileContent) return true;
    try {
        const bytes = CryptoJS.AES.decrypt(rawFileContent, password);
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedData) return false;

        const loadedState = JSON.parse(decryptedData);
        appState = { ...appState, ...loadedState };
        console.log('🔓 Base de datos DESCIFRADA correctamente');
        isLocked = false;
        rawFileContent = null; // Clear buffer
        return true;
    } catch (e) {
        console.error('❌ Error al descifrar:', e.message);
        return false;
    }
};

// Save State Helper (Atomic)
const saveState = () => {
    try {
        const tempFile = `${DB_FILE}.tmp`;
        let jsonData = JSON.stringify(appState, null, 2);

        if (MASTER_KEY) {
            jsonData = encrypt(jsonData);
        }

        fs.writeFileSync(tempFile, jsonData);
        fs.renameSync(tempFile, DB_FILE);

        // Backup redundante en almacenamiento interno para seguridad extra
        if (isAndroid && DATA_DIR === EXTERNAL_DATA_DIR) {
            try {
                if (!fs.existsSync(INTERNAL_DATA_DIR)) fs.mkdirSync(INTERNAL_DATA_DIR, { recursive: true });
                fs.copyFileSync(DB_FILE, INTERNAL_DB_FILE);
            } catch (e) { }
        }
    } catch (e) {
        console.error('❌ Error guardando estado:', e);
    }
};

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    // Send current FULL state on connection
    socket.emit('sync_update', appState);

    // Send Server IP info for other devices to connect
    socket.emit('server_info', {
        ip: getLocalIp(),
        port: PORT,
        version: VERSION,
        isLocked: isLocked
    });

    // Provide Encryption Key
    socket.on('provide_encryption_key', (key) => {
        console.log('🔑 Recibida clave de cifrado');
        MASTER_KEY = key;
        if (loadState()) {
            socket.emit('encryption_unlock_success');
            io.emit('sync_update', appState);
        } else {
            MASTER_KEY = null;
            socket.emit('encryption_unlock_error', { message: 'Clave incorrecta' });
        }
    });

    socket.on('force_external_recovery', () => {
        console.log('🔄 Solicitud de recuperación forzada recibida');
        if (loadState()) {
            isLocked = false;
            socket.emit('encryption_unlock_success');
            io.emit('sync_update', appState);
        } else {
            socket.emit('encryption_unlock_error', { message: 'No se encontraron datos externos' });
        }
    });

    socket.on('change_master_key', ({ oldKey, newKey }) => {
        if (oldKey === MASTER_KEY || !isLocked) {
            MASTER_KEY = newKey;
            saveState();
            socket.emit('encryption_key_changed');
            console.log('🗝️ Clave maestra cambiada con éxito');
        } else {
            socket.emit('encryption_unlock_error', { message: 'La clave actual es incorrecta' });
        }
    });

    // --- GENERIC FULL SYNC (Primary Mechanism) ---
    socket.on('full_state_update', (newState) => {
        console.log('🔄 Recibida actualización de estado desde cliente');

        let hasChanges = false;

        // Critical arrays to protect against accidental wipe
        const criticalKeys = ['inventory', 'products', 'categories', 'sales', 'users', 'personnel', 'customers', 'kitchenOrders', 'heldOrders', 'tables'];

        Object.keys(newState).forEach(key => {
            if (newState[key] === undefined) return;

            // PROTECTION: Do not overwrite existing server data with empty arrays from client
            // unless the server data is also empty or it's an intentional clear (hard to distinguish, so err on safety)
            if (criticalKeys.includes(key) && Array.isArray(newState[key]) && newState[key].length === 0) {
                if (Array.isArray(appState[key]) && appState[key].length > 0) {
                    console.warn(`🛡️ RECHAZADO overwrite de '${key}' con array vacío. Conservando ${appState[key].length} registros del servidor.`);
                    return;
                }
            }

            // Simple Deep Compare to avoid writing if nothing changed
            if (JSON.stringify(appState[key]) !== JSON.stringify(newState[key])) {
                appState[key] = newState[key];
                hasChanges = true;
            }
        });

        if (hasChanges) {
            appState.lastModified = new Date().toISOString();
            saveState(); // Persist to disk safely

            // Broadcast the UPDATED state to all OTHER clients
            socket.broadcast.emit('sync_update', appState);
        }
    });

    // --- EPHEMERAL EVENTS (Live Carts) ---
    socket.on('active_cart_update', (data) => {
        // data: { userId, username, cart, timestamp }
        socket.broadcast.emit('remote_cart_update', data);
    });

    // --- LEGACY/SPECIFIC EVENTS (Kept for compatibility or specific triggers) ---
    // These now just update the specific part of the state and broadcast full sync

    socket.on('new_kitchen_order', (order) => {
        console.log('👨‍🍳 Nueva Orden Cocina:', order.id);
        if (!appState.kitchenOrders.find(o => o.id === order.id)) {
            appState.kitchenOrders.push(order);
            saveState();
        }
        io.emit('kitchen_order_received', order);
        io.emit('sync_update', appState);
    });

    socket.on('new_bar_order', (order) => {
        console.log('🍹 Nueva Orden Barra:', order.id);
        if (!appState.barOrders.find(o => o.id === order.id)) {
            appState.barOrders.push(order);
            saveState();
        }
        io.emit('bar_order_received', order);
        io.emit('sync_update', appState);
    });

    socket.on('add_held_order', (order) => {
        console.log('📝 Orden en Espera:', order.id);
        const exists = appState.heldOrders.find(o => o.id === order.id);
        if (exists) {
            appState.heldOrders = appState.heldOrders.map(o => o.id === order.id ? order : o);
        } else {
            appState.heldOrders.push(order);
        }
        saveState();
        io.emit('sync_update', appState);
    });

    socket.on('delete_held_order', (orderId) => {
        console.log('🗑️ Eliminar Orden:', orderId);
        appState.heldOrders = appState.heldOrders.filter(o => o.id !== orderId);
        saveState();
        io.emit('held_order_deleted', orderId);
        io.emit('sync_update', appState);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// API Routes (Optional fallback)
app.get('/api/check-update', async (req, res) => {
    try {
        console.log('🔍 Manual update check requested...');
        const result = await checkForUpdates(VERSION);
        res.json(result);

        // If update was applied and we are on Android, restart after delay
        if (result.updated && isAndroid) {
            console.log('♻️ Update applied manually. Restarting in 2s...');
            setTimeout(() => process.exit(0), 2000);
        }
    } catch (error) {
        console.error('❌ Error in manual update check:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sync', (req, res) => {
    // const { clientData } = req.body;
    // Logic to merge...
    res.json({ success: true, serverData: appState });
});

// Initial Update Check - DISABLED to prevent rollbacks during development
/*
if (isAndroid) {
    console.log(`🤖 Android detectado. VERSION local: ${VERSION}. Iniciando guardia OTA...`);
    // Check for updates 60 seconds after startup to allow full stability
    setTimeout(() => {
        checkForUpdates(VERSION).then(result => {
            console.log('📡 Resultado de auto-update:', JSON.stringify(result));
            if (result.updated) {
                console.log('🔄 Actualización aplicada con éxito. Reiniciando servidor en 2s...');
                setTimeout(() => process.exit(0), 2000);
            } else {
                console.log('✅ No se requiere actualización OTA.');
            }
        }).catch(err => {
            console.error('❌ Error fatal en flujo de auto-update:', err);
        });
    }, 60000); // Subido a 60s
}
*/

// Handle React Routing (return index.html for all non-API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIp();
    console.log(`
    🚀 SERVIDOR POS LISTO
    -----------------------------------------
    Local:   http://localhost:${PORT}
    Network: http://${ip}:${PORT}
    -----------------------------------------
    `);
});
