import express from 'express';
import { createServer } from 'http';
import { Server } from "socket.io";
import cors from 'cors';
import os from 'os';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);

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

// In-Memory State (Simple storage)
let appState = {
    sales: [],
    heldOrders: [],
    kitchenOrders: [],
    barOrders: [],
    tables: []
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'server_db.json');

// Load State from File
if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        appState = { ...appState, ...JSON.parse(data) };
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

    // Send current state on connection
    socket.emit('sync_update', appState);

    // --- KITCHEN & BAR ---
    socket.on('new_kitchen_order', (order) => {
        console.log('👨‍🍳 Nueva Orden Cocina:', order.id);
        // Add to state if not exists
        if (!appState.kitchenOrders.find(o => o.id === order.id)) {
            appState.kitchenOrders.push(order);
            saveState(); // Save
        }
        // Broadcast to ALL clients (Kitchen screens)
        io.emit('kitchen_order_received', order);
        io.emit('sync_update', appState); // Sync full state
    });

    socket.on('new_bar_order', (order) => {
        console.log('🍹 Nueva Orden Barra:', order.id);
        if (!appState.barOrders.find(o => o.id === order.id)) {
            appState.barOrders.push(order);
            saveState(); // Save
        }
        io.emit('bar_order_received', order); // (If we add specific event later)
        io.emit('sync_update', appState);
    });

    // --- HELD ORDERS ---
    socket.on('add_held_order', (order) => {
        console.log('📝 Orden en Espera:', order.id);
        const exists = appState.heldOrders.find(o => o.id === order.id);
        if (exists) {
            appState.heldOrders = appState.heldOrders.map(o => o.id === order.id ? order : o);
        } else {
            appState.heldOrders.push(order);
        }
        saveState(); // Save
        io.emit('sync_update', appState);
    });

    socket.on('delete_held_order', (orderId) => {
        console.log('🗑️ Eliminar Orden:', orderId);
        appState.heldOrders = appState.heldOrders.filter(o => o.id !== orderId);
        saveState(); // Save
        io.emit('held_order_deleted', orderId);
        io.emit('sync_update', appState);
    });

    // --- FULL SYNC ---
    socket.on('full_state_update', (newState) => {
        // Merge strategy: simpler to just trust the latest sender in a small local setup
        // But let's be careful not to wipe data if newState is empty
        if (newState.heldOrders) appState.heldOrders = newState.heldOrders;
        if (newState.kitchenOrders) appState.kitchenOrders = newState.kitchenOrders;
        if (newState.barOrders) appState.barOrders = newState.barOrders;
        if (newState.tables) appState.tables = newState.tables;

        saveState(); // Save

        // Broadcast Update
        socket.broadcast.emit('sync_update', appState);
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
