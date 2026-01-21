const path = require('path');
const fs = require('fs');
const os = require('os');

// Log to project root for easier finding
const LOG_FILE = path.join(__dirname, 'server_startup.log');

function logToFile(msg) {
    const timestamp = new Date().toISOString();
    const formattedMsg = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    try {
        if (!fs.existsSync(path.dirname(LOG_FILE))) {
            fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
        }
        fs.appendFileSync(LOG_FILE, formattedMsg);
    } catch (e) {
        try {
            fs.appendFileSync(path.join(__dirname, 'server_boot.log'), formattedMsg);
        } catch (innerE) { }
    }
}

logToFile('🚀 MAIN.JS: Iniciando cargador robusto (v2.0)...');

process.env.NODE_PLATFORM = 'android';

try {
    // Intentar localizar index.js en múltiples ubicaciones posibles de Android
    const possiblePaths = [
        path.join(__dirname, 'server', 'index.js'),
        path.join(__dirname, 'index.js'),
        path.join(process.cwd(), 'server', 'index.js'),
        '/data/user/0/com.sistemapos.app/files/nodejs-project/server/index.js'
    ];

    let foundPath = null;
    for (const p of possiblePaths) {
        logToFile(`🔍 Buscando servidor en: ${p}`);
        if (fs.existsSync(p)) {
            foundPath = p;
            break;
        }
    }

    if (foundPath) {
        logToFile(`✅ Servidor encontrado en: ${foundPath}. Iniciando...`);
        require(foundPath);
        logToFile('🚀 Servidor cargado con éxito.');
    } else {
        logToFile('❌ ERROR: No se encontró index.js en ninguna ubicación conocida.');
        // Listar archivos para ayudar a depurar
        logToFile(`📁 Contenido de __dirname (${__dirname}): ` + fs.readdirSync(__dirname).join(', '));
    }

} catch (e) {
    logToFile('❌ ERROR CRÍTICO: ' + e.message);
    logToFile(e.stack);
}
