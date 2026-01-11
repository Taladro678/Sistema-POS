const cordova = require('cordova-bridge');
const { fork } = require('child_process');
const path = require('path');

/**
 * NATIVE BRIDGE ENTRY POINT
 * This file runs in the background of the APK.
 */
cordova.channel.on('message', (msg) => {
    console.log('Mensaje desde la interfaz nativa:', msg);
});

console.log('🚀 Iniciando Servidor POS Interno...');

// Fork the existing server/index.js (adapted for Android)
try {
    // Set environment flag
    process.env.NODE_PLATFORM = 'android';

    // Require the actual server logic
    require('./server/index.js');

    cordova.channel.send('Servidor iniciado correctamente desde APK');
} catch (e) {
    console.error('❌ Error fatal iniciando servidor interno:', e);
    cordova.channel.send('Error iniciando servidor: ' + e.message);
}
