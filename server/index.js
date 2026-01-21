import express from 'express';
import { createServer } from 'http';
import { Server } from "socket.io";
import cors from 'cors';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CryptoJS from 'crypto-js';
import multer from 'multer';
import { checkForUpdates } from './updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION = '2.3.6'; // Data Immortality Update

// Solo activar auto-update si se detecta entorno Android (o se fuerza por config)
const isAndroid = process.env.NODE_PLATFORM === 'android';

// --- ESTABILIDAD DEL PROCESO ---
process.on('uncaughtException', (err) => {
    console.error('🔥 CRITICAL UNCAUGHT EXCEPTION:', err);
    // No salimos del proceso para evitar que la app POS se quede sin servidor
    // A menos que sea un error fatal de memoria u otro irrecuperable
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);

// Serve Static Files (Frontend)
const distPath = process.env.FRONTEND_DIST_PATH || path.join(__dirname, '../dist');
app.use(express.static(distPath));

// --- FILE UPLOAD PERSISTENCE ---
const PROOFS_DIR = () => path.join(DATA_DIR, 'proofs');

const initializeProofsDir = () => {
    try {
        const dir = PROOFS_DIR();
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log('📁 Carpeta de comprobantes creada:', dir);
        }
    } catch (e) {
        console.error('❌ Error creando carpeta de comprobantes:', e.message);
    }
};

// Configuración de Multer para almacenamiento local
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        initializeProofsDir();
        cb(null, PROOFS_DIR());
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'comprobante-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Endpoint para subir comprobantes localmente
app.post('/api/upload-proof', upload.single('proof'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/proofs/${req.file.filename}`;

    console.log('✅ Archivo guardado localmente:', req.file.filename);
    res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// --- 🔥 EXTERNAL BACKUP ENDPOINT (Survives App Reinstalls) ---
app.post('/save-external-backup', async (req, res) => {
    try {
        const backupData = req.body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupFilename = `sistema_pos_backup_${timestamp}.json`;
        const backupPath = path.join(DATA_DIR, backupFilename);

        // Save backup
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
        console.log(`💾 External backup saved: ${backupPath}`);

        // Rotate backups: keep only last 5
        const allBackups = fs.readdirSync(DATA_DIR)
            .filter(f => f.startsWith('sistema_pos_backup_') && f.endsWith('.json'))
            .map(f => ({ name: f, path: path.join(DATA_DIR, f), time: fs.statSync(path.join(DATA_DIR, f)).mtime }))
            .sort((a, b) => b.time - a.time);

        // Delete old backups (keep 5 most recent)
        if (allBackups.length > 5) {
            allBackups.slice(5).forEach(backup => {
                fs.unlinkSync(backup.path);
                console.log(`🗑️ Deleted old backup: ${backup.name}`);
            });
        }

        res.json({ success: true, path: backupPath });
    } catch (error) {
        console.error('❌ Failed to save external backup:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- EXTERNAL ID LOOKUP (CNE/SENIAT Mirror Proxy) ---
app.get('/api/lookup/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    console.log(`🔍 Lookup request: ${type} - ${id}`);

    try {
        // We use a community mirror API that is usually more stable than the official one
        // Note: Venezuelan public services are often unstable, so we use a mirror.
        const response = await fetch(`https://api.cedulave.com/v1/cedula/${id}`);

        if (!response.ok) {
            throw new Error(`Mirror returned status ${response.status}`);
        }

        const data = await response.json();

        if (data && data.data) {
            const p = data.data;
            const fullName = `${p.primer_nombre} ${p.segundo_nombre || ''} ${p.primer_apellido} ${p.segundo_apellido || ''}`.replace(/\s+/g, ' ').trim();

            return res.json({
                success: true,
                source: 'cedulave_mirror',
                name: fullName,
                idNumber: id
            });
        }

        res.status(404).json({ success: false, error: 'No se encontraron datos para este ID.' });
    } catch (e) {
        console.error('❌ Error en lookup proxy:', e.message);
        res.status(500).json({ success: false, error: 'Error al consultar el servicio externo. Inténtalo de nuevo.' });
    }
});

// Servir la carpeta de comprobantes estáticamente
app.use('/proofs', (req, res, next) => {
    // Middleware para asegurar que la carpeta existe antes de servir
    const dir = PROOFS_DIR();
    if (fs.existsSync(dir)) {
        express.static(dir)(req, res, next);
    } else {
        next();
    }
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

// --- DATA SECURITY (AES-256) ---
let MASTER_KEY = null;
let isLocked = true;

const encrypt = (text) => {
    if (!MASTER_KEY) return text;
    return CryptoJS.AES.encrypt(text, MASTER_KEY).toString();
};

const decrypt = (ciphertext) => {
    if (!MASTER_KEY) return ciphertext;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, MASTER_KEY);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        if (!originalText) throw new Error("Decryption result is empty");
        return originalText;
    } catch (e) {
        console.error('❌ Error decrypting data:', e.message);
        return null;
    }
};

const INTERNAL_DATA_DIR = path.join(__dirname, '../data');
const EXTERNAL_ROOTS = [
    '/storage/emulated/0/Documents/SistemaPOS_Data',
    '/sdcard/Documents/SistemaPOS_Data',
    path.join(os.homedir(), 'Documents/SistemaPOS_Data') // PC Fallback
];

let DATA_DIR = INTERNAL_DATA_DIR;

const DB_FILE = () => path.join(DATA_DIR, 'server_db.json');
const INTERNAL_DB_FILE = path.join(INTERNAL_DATA_DIR, 'server_db.json');

// --- PERSISTENT LOGGING ---
const logToPersistence = (msg) => {
    const logMsg = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    try {
        const logFile = path.join(DATA_DIR, 'server_persistence.log');
        fs.appendFileSync(logFile, logMsg);
    } catch (e) { }
};

// --- ESTRATEGIA DE INMORTALIDAD PARA ANDROID ---
const tryInitializeStorage = () => {
    // 1. Encontrar la mejor ruta externa disponible
    let foundExternal = null;
    if (isAndroid) {
        for (const root of EXTERNAL_ROOTS) {
            try {
                if (!fs.existsSync(root)) {
                    fs.mkdirSync(root, { recursive: true });
                }
                // Si llegamos aquí, esta ruta es escribible
                foundExternal = root;
                break;
            } catch (e) {
                console.debug(`🚫 Ruta no disponible: ${root}`);
            }
        }
    }

    if (foundExternal) {
        const externalDb = path.join(foundExternal, 'server_db.json');

        // MIGRACION CRITICA: 
        // Si hay datos en el interno pero NO en el externo, migramos.
        // Esto pasa en instalaciones limpias donde Android borró la app pero guardaste el DB interno en assets/data.
        if (fs.existsSync(INTERNAL_DB_FILE) && !fs.existsSync(externalDb)) {
            try {
                fs.copyFileSync(INTERNAL_DB_FILE, externalDb);
                logToPersistence(`🚚 Migración exitosa: Interno -> Externo (${foundExternal})`);
            } catch (e) {
                logToPersistence(`❌ Falló migración a externo: ${e.message}`);
            }
        }

        DATA_DIR = foundExternal;
        logToPersistence(`🏠 Almacenamiento persistente activo en: ${DATA_DIR}`);
        return true;
    }

    // Fallback al interno si nada funciona
    if (!fs.existsSync(INTERNAL_DATA_DIR)) {
        fs.mkdirSync(INTERNAL_DATA_DIR, { recursive: true });
    }
    DATA_DIR = INTERNAL_DATA_DIR;
    logToPersistence(`⚠️ Usando almacenamiento INTERNO (Riesgo de pérdida al reinstalar): ${DATA_DIR}`);
    return false;
};

// Inicializar almacenamiento
tryInitializeStorage();

const OLD_DB_FILE = path.join(__dirname, 'server_db.json');

// Migration Logic
if (fs.existsSync(OLD_DB_FILE) && !fs.existsSync(DB_FILE())) {
    try {
        fs.copyFileSync(OLD_DB_FILE, DB_FILE());
        console.log('🚚 Base de datos migrada a ubicación persistente');
    } catch (e) {
        console.error('⚠️ Error migrando base de datos:', e);
    }
}

// Load State from File
const loadState = () => {
    tryInitializeStorage();
    let sourceFile = DB_FILE();

    // Si estamos en Android y el archivo externo no existe, intentamos recuperar del interno
    if (isAndroid && !fs.existsSync(DB_FILE()) && fs.existsSync(INTERNAL_DB_FILE)) {
        console.log('🔄 Recuperando base de datos desde almacenamiento interno...');
        try {
            fs.copyFileSync(INTERNAL_DB_FILE, DB_FILE());
            sourceFile = DB_FILE(); // Now DB_FILE should exist
        } catch (e) {
            console.error('❌ Error copiando backup interno:', e.message);
        }
    }

    if (fs.existsSync(sourceFile)) {
        try {
            const fileContent = fs.readFileSync(sourceFile, 'utf8');

            // If it starts with '{', it's plain text (legacy or unencrypted)
            if (fileContent.trim().startsWith('{')) {
                console.log('📂 Archivo de base de datos detectado como texto plano.');
                const loadedState = JSON.parse(fileContent);
                appState = { ...appState, ...loadedState };
                isLocked = false;
                // Si la cargamos en plano, guardamos inmediatamente para asegurar que se cifre si hay clave
                return true;
            } else {
                // It's encrypted
                if (!MASTER_KEY) {
                    console.log('🔒 Base de datos cifrada detectada. Esperando clave maestra...');
                    isLocked = true;
                    return false;
                }

                const decrypted = decrypt(fileContent);
                if (decrypted) {
                    const loadedState = JSON.parse(decrypted);
                    appState = { ...appState, ...loadedState };
                    isLocked = false;
                    console.log(`🔓 Estado descifrado y restaurado correctamente.`);
                } else {
                    console.error('❌ Falló la clave maestra o el archivo está corrupto.');
                    return false;
                }
            }
            return true;
        } catch (e) {
            console.error('⚠️ Error cargando base de datos local:', e);
            return false;
        }
    }
    // No file exists yet, we are not locked
    isLocked = false;
    return true;
};

loadState();

// Save State Helper (Atomic)
const saveState = () => {
    try {
        tryInitializeStorage();
        const destFile = DB_FILE();
        const tempFile = `${destFile}.tmp`;
        let jsonData = JSON.stringify(appState, null, 2);

        // Encrypt before saving if we have a key
        if (MASTER_KEY) {
            jsonData = encrypt(jsonData);
        }

        // Write to temp file first
        fs.writeFileSync(tempFile, jsonData);

        // Rename temp file to actual file (Atomic operation)
        fs.renameSync(tempFile, destFile);

        // --- BACKUP REDUNDANTE (Interno) ---
        if (isAndroid && DATA_DIR !== INTERNAL_DATA_DIR) {
            try {
                if (!fs.existsSync(INTERNAL_DATA_DIR)) fs.mkdirSync(INTERNAL_DATA_DIR, { recursive: true });
                fs.copyFileSync(destFile, INTERNAL_DB_FILE);
            } catch (backupErr) {
                console.debug('⚠️ No se pudo crear backup interno redundante:', backupErr.message);
            }
        }
    } catch (e) {
        console.error('❌ Error guardando estado (Atomic):', e);
    }
};

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    // Send current FULL state on connection (only if UNLOCKED)
    if (!isLocked) {
        socket.emit('sync_update', appState);
    } else {
        socket.emit('encryption_required', { message: 'El servidor está cifrado. Proporcione la clave maestra.' });
    }

    // Send Server IP info for other devices to connect
    socket.emit('server_info', {
        ip: getLocalIp(),
        port: PORT,
        version: VERSION,
        isLocked
    });

    // --- ENCRYPTION KEY HANDLER ---
    socket.on('provide_encryption_key', (key) => {
        console.log('🔑 Intento de desbloqueo recibido...');
        MASTER_KEY = key;

        if (loadState()) {
            isLocked = false;
            socket.emit('encryption_unlock_success');
            io.emit('sync_update', appState);
            io.emit('server_info', { ip: getLocalIp(), port: PORT, version: VERSION, isLocked: false });
            console.log('🔓 Servidor DESBLOQUEADO con éxito.');
        } else {
            MASTER_KEY = null;
            socket.emit('encryption_unlock_error', { message: 'Clave maestra incorrecta o archivo corrupto.' });
            console.warn('❌ Intento de desbloqueo fallido.');
        }
    });

    socket.on('force_external_recovery', () => {
        console.log('🔄 Solicitud de recuperación forzada recibida desde el cliente.');
        if (loadState()) {
            isLocked = false;
            socket.emit('encryption_unlock_success');
            io.emit('sync_update', appState);
            console.log('✅ Recuperación forzada completada.');
        } else {
            socket.emit('encryption_unlock_error', { message: 'No se pudo recuperar desde el almacenamiento externo.' });
        }
    });

    socket.on('change_master_key', ({ oldKey, newKey }) => {
        if (oldKey === MASTER_KEY || !isLocked) {
            MASTER_KEY = newKey;
            saveState(); // Will re-encrypt with new key
            socket.emit('encryption_key_changed');
            console.log('🔐 Clave maestra actualizada correctamente.');
        } else {
            socket.emit('encryption_unlock_error', { message: 'Clave actual incorrecta.' });
        }
    });

    // --- GENERIC FULL SYNC (Primary Mechanism) ---
    socket.on('update_exchange_rate', (rate) => {
        const clientIp = socket.handshake.address;
        console.log(`💱 [IP: ${clientIp}] Actualización Tasa Específica:`, rate);
        const val = parseFloat(rate);
        if (!isNaN(val) && val > 0) {
            appState.exchangeRate = val;
            appState.lastModified = new Date().toISOString();
            saveState();
            io.emit('sync_update', appState); // Force update to ALL clients
        }
    });

    socket.on('full_state_update', (newState) => {
        const clientIp = socket.handshake.address;
        // PROTECTION: Prevent old client state from overwriting newer server state (The "Ghost Reverse" fix)
        const serverTime = new Date(appState.lastModified || 0).getTime();
        const clientTime = new Date(newState.lastModified || 0).getTime();

        if (clientTime < serverTime) {
            console.log(`🛡️  [IP: ${clientIp}] Rechazada actualización obsoleta del cliente (Timestamp anterior)`);
            return;
        }

        console.log(`🔄 [IP: ${clientIp}] Recibida actualización de estado desde cliente`);

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

                // CRITICAL PROTECTION: Block the "ghost" rate 344.51 
                if (key === 'exchangeRate' && newState[key] === 344.51) {
                    console.log(`🛡️  [IP: ${clientIp}] Bloqueada reversión de tasa a 344.51`);
                    return;
                }

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

// BCV Sincronización Directa
app.get('/api/bcv-rate', async (req, res) => {
    const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    try {
        console.log('🌐 Fetching BCV Rate from bcv.org.ve...');

        // Timeout Controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        // Bypassing SSL for BCV (Certificados venezolanos a veces vencidos)
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        const response = await fetch('http://www.bcv.org.ve/', {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0' // Ocultarnos un poco
            }
        });
        clearTimeout(timeoutId);

        const html = await response.text();

        // Scraping con Regex mejorado
        // Busca bloques cercanos al dolar
        // <div id="dolar"> ... <strong> 347,26310000 </strong>
        const match = html.match(/id="dolar".*?strong>\s*([\d,.]+)\s*<\/strong/s);

        if (match && match[1]) {
            let rateStr = match[1].replace(',', '.');
            const rate = parseFloat(rateStr);
            console.log('✅ BCV Rate found:', rate);
            res.json({ promedio: rate, source: 'BCV Direct' });
        } else {
            console.error('❌ BCV Regex failed. HTML dump saved locally if needed.');
            res.status(500).json({ error: 'Parsing failed' });
        }
    } catch (error) {
        console.error('❌ BCV Fetch error:', error.message);
        res.status(500).json({ error: error.message });
    } finally {
        // Restaurar seguridad
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized || '1';
    }
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


// --- 🕵️‍♂️ CLIENT DISCOVERY ENDPOINT ---
app.get('/api/scan-servers', (req, res) => {
    const foundServers = [];

    // Crear socket temporal para escanear
    const clientSocket = dgram.createSocket('udp4');

    clientSocket.bind(() => {
        clientSocket.setBroadcast(true);

        // Enviar broadcast
        const message = Buffer.from(JSON.stringify({ type: 'DISCOVER_SERVER' }));
        clientSocket.send(message, UDP_PORT, '255.255.255.255', (err) => {
            if (err) console.error('Error sending discovery broadcast:', err);
            else console.log('📡 Sent discovery broadcast...');
        });
    });

    // Escuchar respuestas
    clientSocket.on('message', (msg, rinfo) => {
        try {
            const data = JSON.parse(msg.toString());
            if (data.type === 'SERVER_ANNOUNCEMENT') {
                // Evitar duplicados y auto-descubrimiento (opcional)
                const isSelf = data.ip === getLocalIp();
                // if (!isSelf && !foundServers.some(s => s.ip === data.ip)) {
                if (!foundServers.some(s => s.ip === data.ip)) {
                    foundServers.push({ ...data, isSelf });
                }
            }
        } catch (e) { }
    });

    // Esperar 2 segundos y responder
    setTimeout(() => {
        clientSocket.close();
        res.json({ servers: foundServers });
    }, 2000);
});

// Endpoint ultraligero para verificar conectividad (Health Check)
app.get('/api/server-info-ping', (req, res) => res.sendStatus(200));

app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});


// --- 📡 UDP AUTO-DISCOVERY SERVICE ---
import dgram from 'dgram';

const UDP_PORT = 41234;
let udpSocket = null;

try {
    udpSocket = dgram.createSocket('udp4');

    udpSocket.on('error', (err) => {
        console.error(`UDP server error:\n${err.stack}`);
        try { udpSocket.close(); } catch (e) { }
    });

    udpSocket.on('message', (msg, rinfo) => {
        try {
            const message = JSON.parse(msg.toString());
            // Responder a cualquiera que busque el servidor
            if (message.type === 'DISCOVER_SERVER') {
                console.log(`📡 Discovery request from ${rinfo.address}`);

                const response = JSON.stringify({
                    type: 'SERVER_ANNOUNCEMENT',
                    ip: getLocalIp(),
                    port: PORT,
                    version: VERSION || '2.3.6',
                    name: 'La Autentica POS Server'
                });

                udpSocket.send(response, rinfo.port, rinfo.address, (err) => {
                    if (err) console.error('UDP Send Error:', err);
                });
            }
        } catch (e) {
            // Ignorar basura
        }
    });

    udpSocket.bind(UDP_PORT, () => {
        console.log(`📡 UDP Discovery Service active on port ${UDP_PORT}`);
        udpSocket.setBroadcast(true);
    });
} catch (e) {
    console.error("Failed to start UDP Discovery:", e);
}

server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIp();
    console.log(`
    🚀 SERVIDOR POS LISTO
    -----------------------------------------
    Local:   http://localhost:${PORT}
    Network: http://${ip}:${PORT}
    UDP Discovery: Port ${UDP_PORT}
    -----------------------------------------
    `);
});
