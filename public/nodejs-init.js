/**
 * Inicializador de Node.js para Android
 * Arranca el servidor Node.js cuando la app carga en Android
 */

// Node.js Mobile Initializer
// This script runs on the frontend (WebView) and starts the Node.js background process.

console.log('[Node.js Init] nodejs-init.js loaded');

// Force verbose logging

(function () {
    function onServerReady() {
        console.log('[Node.js Init] onServerReady callback triggered');
    }

    console.log('[Node.js Init] Script loaded');

    function startNodeJS() {
        console.log('[Node.js Init] Attempting to start Node.js server...');

        // Verificar si el plugin nodejs está disponible
        if (typeof nodejs === 'undefined' || !nodejs) {
            console.error('[Node.js Init] nodejs plugin not found! The server will not start.');
            console.log('[Node.js Init] Available globals:', Object.keys(window));
            return;
        }

        console.log('[Node.js Init] nodejs plugin found:', nodejs);

        // Configurar listener de mensajes del servidor
        if (nodejs.channel && typeof nodejs.channel.on === 'function') {
            nodejs.channel.on('message', function (msg) {
                console.log('[Node.js Server]', msg);
            });
        }

        // Iniciar el servidor Node.js con el archivo main.js
        console.log('[Node.js Init] Starting nodejs with main.js...');

        if (typeof nodejs.start === 'function') {
            nodejs.start('main.js', (err) => {
                const isAlreadyStarted = err && JSON.stringify(err).includes('Engine already started');

                if (err && !isAlreadyStarted) {
                    console.error('[Node.js Init] Error starting Node.js:', err);
                    alert('❌ Error arranque Node: ' + JSON.stringify(err));
                } else {
                    if (isAlreadyStarted) {
                        console.log('[Node.js Init] Engine already started (OK)');
                    } else {
                        console.log('[Node.js Init] ✓ Node.js server started successfully!');
                    }
                    onServerReady();

                    // DEPLOYMENT: Remove visible alerts, keep logs
                    // setTimeout(() => { ... }, 8000); 
                }
            });
        } else if (typeof nodejs.startEngine === 'function') {
            nodejs.startEngine('main.js', function (err) {
                if (err) {
                    console.error('[Node.js Init] Error starting Node.js engine:', err);
                } else {
                    console.log('[Node.js Init] ✓ Node.js engine started successfully!');
                }
            });
        } else {
            console.error('[Node.js Init] No start method found on nodejs plugin');
            console.log('[Node.js Init] nodejs methods:', Object.keys(nodejs));
        }
    }

    // Iniciar cuando Capacitor esté listo
    if (window.Capacitor) {
        const platform = window.Capacitor.getPlatform();
        console.log('[Node.js Init] Capacitor detected, platform:', platform);

        if (platform === 'android') {
            // Intentar iniciar inmediatamente
            // Esperamos un momento para asegurar que los plugins de Cordova estén cargados
            setTimeout(function () {
                startNodeJS();
            }, 500);

            // También escuchar el evento deviceready por si acaso
            document.addEventListener('deviceready', function () {
                console.log('[Node.js Init] deviceready event fired');
                // Intentar de nuevo por si el plugin no estaba listo antes
                if (typeof nodejs !== 'undefined') {
                    startNodeJS();
                }
            }, false);
        } else {
            console.log('[Node.js Init] Not on Android native - Node.js will not start. Platform was:', platform);
        }
    } else {
        console.log('[Node.js Init] Capacitor not found - waiting for it...');
        // Si Capacitor aún no está disponible, esperar un poco
        setTimeout(function () {
            if (window.Capacitor && window.Capacitor.getPlatform() === 'android') {
                startNodeJS();
            }
        }, 1000);
    }
})();
