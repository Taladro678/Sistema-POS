import axios from 'axios';
import fs from 'fs';
import path from 'path';
import admZip from 'adm-zip';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * UPDATER MODULE
 * Responsible for downloading the latest code from GitHub and extracting it.
 */
export const checkForUpdates = async (currentVersion = '0.0.0') => {
    const REPO = 'Taladro678/Sistema-POS';
    const GITHUB_API = `https://api.github.com/repos/${REPO}/releases/latest`;

    console.log('📡 Buscando actualizaciones en GitHub...');

    try {
        const response = await axios.get(GITHUB_API);
        const latestVersion = response.data.tag_name;
        const downloadUrl = response.data.zipball_url;

        if (latestVersion !== currentVersion) {
            console.log(`✨ Nueva versión encontrada: ${latestVersion}. Descargando...`);
            await downloadAndExtract(downloadUrl);
            return { updated: true, version: latestVersion };
        }

        console.log('✅ El sistema ya está actualizado.');
        return { updated: false };
    } catch (error) {
        console.error('❌ Error al verificar actualizaciones:', error.message);
        return { updated: false, error: error.message };
    }
};

const downloadAndExtract = async (url) => {
    const tempPath = path.join(__dirname, 'update_temp.zip');
    const extractPath = path.join(__dirname, '../update_staging');

    // Remove previous staging if exists
    if (fs.existsSync(extractPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
    }

    // Download
    const writer = fs.createWriteStream(tempPath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            console.log('📦 Descarga completada. Extrayendo...');
            try {
                const zip = new admZip(tempPath);
                zip.extractAllTo(extractPath, true);

                // Cleanup Zip
                fs.unlinkSync(tempPath);

                console.log('📂 Aplicando cambios...');
                applyUpdate(extractPath);

                resolve();
            } catch (e) {
                console.error("Error al extraer:", e);
                reject(e);
            }
        });
        writer.on('error', reject);
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
    } else {
        console.warn("⚠️ No se encontró la carpeta 'dist' en la actualización. Asegúrate de compilar antes de pushear.");
    }

    // Copy SERVER (Backend)
    const sourceServer = path.join(sourcePath, 'server');
    const targetServer = path.join(appRoot, 'server');
    if (fs.existsSync(sourceServer)) {
        console.log('🔄 Actualizando Backend...');
        // Exclude DB files from overwrite
        copyRecursiveSync(sourceServer, targetServer, ['server_db.json', 'local_db.json', 'node_modules']);
    }

    // Cleanup Staging
    fs.rmSync(stagingPath, { recursive: true, force: true });
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
