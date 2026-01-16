const { app, BrowserWindow } = require('electron');
const path = require('path');
console.log('--- Electron process starting ---');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let serverProcess;

function startServer() {
    // In dev, the server is usually already running or started via concurrently
    // In prod, we start the node server
    const baseResources = isDev ? __dirname : process.resourcesPath;
    const serverPath = path.join(baseResources, 'server', 'index.js');
    console.log(`Starting server process at: ${serverPath}`);
    const distPath = path.join(baseResources, 'dist');
    console.log(`Frontend dist path: ${distPath}`);

    serverProcess = spawn('node', [`"${serverPath}"`], {
        env: {
            ...process.env,
            NODE_ENV: 'production',
            FRONTEND_DIST_PATH: distPath
        },
        shell: true
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`Server: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`Server Error: ${data}`);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        backgroundColor: '#1e1e1e', // Match theme
        title: "Sistema POS - La Auténtica"
    });

    // In development, load from Vite dev server
    // In production, the server starts and serves from port 3001
    const url = isDev ? 'http://localhost:5174' : 'http://localhost:3001';

    // Give the server a small delay to start if in production
    if (!isDev) {
        setTimeout(() => {
            console.log(`Loading production URL: ${url}`);
            mainWindow.loadURL(url);
        }, 5000); // Increased timeout
    } else {
        console.log(`Loading development URL: ${url}`);
        mainWindow.loadURL(url);
    }

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Window content loaded successfully');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`Failed to load URL: ${errorCode} - ${errorDescription}`);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', () => {
    console.log('App is ready');
    if (!isDev) startServer();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (serverProcess) serverProcess.kill();
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

process.on('exit', () => {
    if (serverProcess) serverProcess.kill();
});
