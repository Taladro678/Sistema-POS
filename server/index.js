import express from 'express';
import { createServer } from 'http';
import { Server } from "socket.io";
import cors from 'cors';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkForUpdates } from './updater.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION = '2.1.9'; // Versión base del APK

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

const DB_FILE = path.join(__dirname, 'server_db.json');

// Load State from File
if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        const loadedState = JSON.parse(data);
        // Merge loaded state with default structure to ensure all fields exist
        appState = { ...appState, ...loadedState };
        console.log('📂 Estado restaurado desde server_db.json');
    } catch (e) {
        console.error('⚠️ Error cargando base de datos local:', e);
    }
}

// Save State Helper (Atomic)
const saveState = () => {
    try {
        const tempFile = `${DB_FILE}.tmp`;
        const jsonData = JSON.stringify(appState, null, 2);

        // Write to temp file first
        fs.writeFileSync(tempFile, jsonData);

        // Rename temp file to actual file (Atomic operation)
        fs.renameSync(tempFile, DB_FILE);
    } catch (e) {
        console.error('❌ Error guardando estado (Atomic):', e);
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
        version: VERSION
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
        // Pass 'io' to updater for progress reporting
        const result = await checkForUpdates(VERSION, io);
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

// Initial Update Check
if (isAndroid) {
    // Check for updates 5 seconds after startup to allow stabilization
    setTimeout(() => {
        checkForUpdates(VERSION).then(result => {
            if (result.updated) {
                console.log('🔄 Actualización aplicada. Reiniciando Servidor...');
                console.log(`📦 Nueva versión: ${result.newVersion}`);

                // Multiple aggressive restart attempts
                setTimeout(() => {
                    console.log('♻️ FORZANDO REINICIO INMEDIATO...');
                    process.exit(0);
                }, 500);

                // Fallback: throw error to crash if exit doesn't work
                setTimeout(() => {
                    throw new Error('RESTART_REQUIRED');
                }, 1000);
            }
        }).catch(err => {
            console.error('❌ Error durante auto-update:', err);
        });
    }, 5000);
}

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
