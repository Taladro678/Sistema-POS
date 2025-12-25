import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = 3001;
const app = express();
const httpServer = createServer(app);

// Enable CORS for all local requests
app.use(cors({
    origin: "*", // Allow all origins for local network ease
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());

// Serve Static Frontend (Production/Android Mode)
const distPath = join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    console.log('📂 Serving static files from:', distPath);
    app.use(express.static(distPath));
} else {
    console.log('⚠️ Static files not found. Run "npm run build" in root folder first.');
}

// Socket.io Setup
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST"]
    }
});

// Simple In-Memory "Database" (Persisted to JSON for recovery)
const DB_FILE = 'local_db.json';
let db = {
    sales: [],
    heldOrders: [],
    inventory: [],
    kitchenOrders: [],
    lastUpdated: new Date().toISOString()
};

// Load DB
if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        db = JSON.parse(data);
        console.log('📦 Database loaded from file');
    } catch (e) {
        console.error('Error loading DB, starting fresh', e);
    }
}

const saveDB = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error('Error saving DB', e);
    }
};

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Sync Endpoint: Client pushes its data, Server merges and returns latest
app.post('/api/sync', (req, res) => {
    const { clientData, lastSyncTime } = req.body;

    // TODO: Implement smart merging logic
    // For now, simpler "Server Authority" for shared lists, but "Append" for transactions (Sales)

    // 1. New Transactional Data (Append Only)
    if (clientData?.sales?.length > 0) {
        const newSales = clientData.sales.filter(s => !db.sales.find(ds => ds.id === s.id));
        if (newSales.length > 0) {
            db.sales = [...db.sales, ...newSales];
            console.log(`💰 Received ${newSales.length} new sales`);
        }
    }

    // 2. State Data (Replace/Update)
    // Kitchen Orders
    if (clientData?.kitchenOrders) {
        db.kitchenOrders = clientData.kitchenOrders; // Simplified: Last writer wins for now
    }
    // Held Orders
    if (clientData?.heldOrders) {
        db.heldOrders = clientData.heldOrders;
    }
    if (clientData?.tables) {
        db.tables = clientData.tables;
    }

    saveDB();

    // Notify everyone else that data changed
    io.emit('sync_update', {
        type: 'general',
        timestamp: new Date().toISOString()
    });

    res.json({
        success: true,
        serverData: db
    });
});

// --- SOCKET EVENTS ---
io.on('connection', (socket) => {
    console.log('⚡ Client connected:', socket.id);

    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`Client joined room: ${room}`);
    });

    // Real-time Kitchen Order
    socket.on('new_kitchen_order', (order) => {
        console.log('👨‍🍳 New Kitchen Order:', order.id);

        // Add to DB
        db.kitchenOrders.push(order);
        saveDB();

        // Broadcast to Kitchen
        io.to('kitchen').emit('kitchen_order_received', order);
        // Broadcast to everyone to update pending lists
        io.emit('sync_updated_needed');
    });

    // Real-time Table Update
    socket.on('update_table', (tableData) => {
        io.emit('table_updated', tableData);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Catch-All Route for SPA (Must be last)
app.get('*', (req, res) => {
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        res.status(404).send('Frontend not built. Please run npm run build.');
    }
});

// Start Server
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 POS Local Server running!
    --------------------------
    - Local:   http://localhost:${PORT}
    - Network: http://<YOUR_PC_IP>:${PORT}
    `);
});
