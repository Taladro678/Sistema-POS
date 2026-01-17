import axios from 'axios';
import fs from 'fs';
import path from 'path';
import admZip from 'adm-zip';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * UPDATER MODULE (Resumable)
 * Responsible for downloading the latest code from GitHub and extracting it.
 */
export const checkForUpdates = async (currentVersion = '0.0.0', io) => {
    const REPO = 'Taladro678/Sistema-POS';
    const GITHUB_API = `https://api.github.com/repos/${REPO}/releases/latest`;

    console.log('📡 Buscando actualizaciones en GitHub...');
    if (io) io.emit('ota_status', { status: 'checking', message: 'Buscando actualizaciones...' });

    try {
        console.log(`📡 Conectando a GitHub: ${GITHUB_API}`);
        const response = await axios.get(GITHUB_API, {
            timeout: 5000,
            headers: { 'User-Agent': 'SistemaPOS-Android' }
        });

        const latestVersion = response.data.tag_name.replace(/^v/, '');
        const downloadUrl = response.data.zipball_url;
        const currentVersionClean = currentVersion.replace(/^v/, '');

        console.log(`🔍 Versión actual: ${currentVersionClean} | Versión GitHub: ${latestVersion}`);

        if (latestVersion !== currentVersionClean) {
            console.log(`✨ Nueva versión encontrada: ${latestVersion}. Descargando...`);
            if (io) io.emit('ota_status', { status: 'found', version: latestVersion });

            await downloadAndExtract(downloadUrl, io);
            return { updated: true, newVersion: latestVersion };
        }

        console.log('✅ El sistema ya está actualizado.');
        if (io) io.emit('ota_status', { status: 'uptodate' });
        return { updated: false };
    } catch (error) {
        console.error('❌ Error al verificar actualizaciones:', error.message);
        if (io) io.emit('ota_status', { status: 'error', error: error.message });
        return { updated: false, error: error.message };
    }
};

const downloadAndExtract = async (url, io) => {
    const tempPath = path.join(__dirname, 'update_temp.zip');
    const extractPath = path.join(__dirname, '../update_staging');

    // 1. Download with Resume capability
    await downloadFileWithResume(url, tempPath, io);

    // 2. Remove previous staging if exists
    if (fs.existsSync(extractPath)) {
        try {
            execSync(`rm -rf "${extractPath}"`);
        } catch (e) {
            console.warn('⚠️ Falló limpieza staging:', e.message);
        }
    }

    // 3. Extract
    console.log('📦 Extrayendo archivo...');
    if (io) io.emit('ota_status', { status: 'extracting', message: 'Descomprimiendo archivos...' });

    try {
        const zip = new admZip(tempPath);
        zip.extractAllTo(extractPath, true);

        // Cleanup Zip
        fs.unlinkSync(tempPath);

        console.log('📂 Aplicando cambios...');
        if (io) io.emit('ota_status', { status: 'installing', message: 'Instalando actualización...' });

        applyUpdate(extractPath);

    } catch (e) {
        console.error("Error al extraer:", e);
        throw e;
    }
};

const downloadFileWithResume = async (url, destPath, io) => {
    return new Promise(async (resolve, reject) => {
        let downloadedBytes = 0;
        let totalBytes = 0;
        let isResuming = false;

        // Check if file exists to resume
        if (fs.existsSync(destPath)) {
            downloadedBytes = fs.statSync(destPath).size;
            isResuming = true;
            console.log(`📥 Reanudando descarga desde ${downloadedBytes} bytes`);
        } else {
            console.log(`📥 Iniciando nueva descarga`);
        }

        try {
            const headers = { 'User-Agent': 'SistemaPOS-Android' };
            if (isResuming) {
                headers['Range'] = `bytes=${downloadedBytes}-`;
            }

            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
                headers
            });

            const contentLength = response.headers['content-length'];
            // If server doesn't support ranges, it might return full content (200 OK instead of 206 Partial Content)
            // But GitHub usually supports it.
            if (response.status === 200) {
                isResuming = false; // Server didn't accept resume, sent full file
                downloadedBytes = 0;
                totalBytes = parseInt(contentLength, 10);
            } else if (response.status === 206) {
                totalBytes = parseInt(contentLength, 10) + downloadedBytes;
            } else {
                totalBytes = parseInt(contentLength, 10);
            }

            const writer = fs.createWriteStream(destPath, { flags: isResuming ? 'a' : 'w' });

            response.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;

                // Calculate progress
                const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
                const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(1);
                const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

                // Throttle logs/events to avoid flooding
                if (downloadedBytes % (1024 * 1024) < chunk.length) { // Log approx every 1MB
                    console.log(`⬇️ Descargando: ${percent}% (${downloadedMB}MB / ${totalMB}MB)`);
                    if (io) {
                        io.emit('ota_progress', {
                            percent,
                            downloaded: downloadedMB,
                            total: totalMB,
                            status: 'downloading'
                        });
                    }
                }
            });

            response.data.pipe(writer);

            writer.on('finish', resolve);
            writer.on('error', reject);

        } catch (error) {
            // Handle HTTP 416 Range Not Satisfiable (File might be fully downloaded or changed)
            if (error.response && error.response.status === 416) {
                console.log('⚠️ Rango no satisfacible. Probablemente ya descargado. Verificando...');
                resolve(); // Assume done
            } else {
                console.error('❌ Error en descarga:', error.message);
                reject(error);
            }
        }
    });
};

const applyUpdate = (stagingPath) => {
    // GitHub zips contain a root folder "User-Repo-Hash", we need to find it
    const files = fs.readdirSync(stagingPath);
    const rootFolder = files.find(f => fs.statSync(path.join(stagingPath, f)).isDirectory());

    if (!rootFolder) {
        throw new Error("No se encontró carpeta raíz en el ZIP de actualización");
    }

    const sourcePath = path.join(stagingPath, rootFolder);
    const appRoot = path.join(__dirname, '..'); // nodejs-project root

    console.log(`📍 Fuente: ${sourcePath}`);
    console.log(`📍 Destino: ${appRoot}`);

    // Copy DIST (Frontend)
    const sourceDist = path.join(sourcePath, 'dist');
    const targetDist = path.join(appRoot, 'dist');
    if (fs.existsSync(sourceDist)) {
        console.log('🔄 Actualizando Frontend...');
        copyRecursiveSync(sourceDist, targetDist);
    }

    // Copy SERVER (Backend)
    const sourceServer = path.join(sourcePath, 'server');
    const targetServer = path.join(appRoot, 'server');
    if (fs.existsSync(sourceServer)) {
        console.log('🔄 Actualizando Backend...');
        // Exclude DB files and node_modules
        copyRecursiveSync(sourceServer, targetServer, ['server_db.json', 'local_db.json', 'node_modules']);
    }

    // Cleanup Staging
    try {
        execSync(`rm -rf "${stagingPath}"`);
    } catch (e) {
        console.warn('⚠️ No se pudo limpiar staging:', e.message);
    }

    console.log('✨ Actualización aplicada con éxito.');
};

// Helper: Recursive Copy
const copyRecursiveSync = (src, dest, ignoreList = []) => {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (ignoreList.includes(entry.name)) continue;

        if (entry.isDirectory()) {
            copyRecursiveSync(srcPath, destPath, ignoreList);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
};
