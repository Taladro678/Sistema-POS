// const cordova = require('cordova-bridge');

/**
 * NATIVE BRIDGE ENTRY POINT
 * This file runs in the background of the APK.
 */
// cordova.channel.on('message', (msg) => {
//     console.log('Mensaje desde la interfaz nativa:', msg);
// });

console.log('🚀 Iniciando Servidor POS Interno...');

// Load the ESM server using dynamic import
(async () => {
    try {
        // Set environment flag
        process.env.NODE_PLATFORM = 'android';

        // Dynamic import for ESM compatibility
        await import('./server/index.mjs');

        // cordova.channel.send('Servidor iniciado correctamente desde APK');
        console.log('✅ Servidor iniciado correctamente (sin bridge)');
    } catch (e) {
        console.error('❌ Error fatal iniciando servidor interno:', e);
        // cordova.channel.send('Error iniciando servidor: ' + e.message);
    }
})();
