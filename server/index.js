import express from 'express';
import { createServer } from 'http';
import { Server } from "socket.io";
import cors from 'cors';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);

// Serve Static Files (Frontend)
// Serve Static Files (Frontend)
// Note: path and __dirname are defined below

// Serve static files from the 'dist' directory (one level up)
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React Routing (return index.html for all non-API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

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

// Save State Helper
const saveState = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(appState, null, 2));
    } catch (e) {
        console.error('❌ Error guardando estado:', e);
    }
};

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    // Send current FULL state on connection
    socket.emit('sync_update', appState);

    // --- GENERIC FULL SYNC (Primary Mechanism) ---
    // Clients send their full state (or partial updates) to be merged
    socket.on('full_state_update', (newState) => {
        console.log('🔄 Recibida actualización de estado desde cliente');

        // Merge Strategy: Overwrite server state with client state for matching keys
        // This assumes the client sending the update has the "latest" truth
        // In a more complex system, we would use timestamps per field/record

        Object.keys(newState).forEach(key => {
            if (newState[key] !== undefined) {
                appState[key] = newState[key];
            }
        });

        appState.lastModified = new Date().toISOString();
        saveState(); // Persist to disk

        // Broadcast the UPDATED state to all OTHER clients
        socket.broadcast.emit('sync_update', appState);
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
app.post('/api/sync', (req, res) => {
    // const { clientData } = req.body;
    // Logic to merge...
    res.json({ success: true, serverData: appState });
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
