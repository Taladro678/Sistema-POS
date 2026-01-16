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

                // Cleanup
                fs.unlinkSync(tempPath);
                console.log('🚀 Actualización lista en carpeta staging.');
                resolve();
            } catch (e) {
                reject(e);
            }
        });
        writer.on('error', reject);
    });
};
