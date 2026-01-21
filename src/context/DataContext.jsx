import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { googleDriveService } from '../services/googleDrive';
import { localSyncService, getAutoServerUrl } from '../services/localSync';
import { audioService } from '../services/audioService';
import { firebaseSyncService, setEncryptionKey } from '../services/firebase';
import { useDialog } from './DialogContext';
import { useSettings } from './SettingsContext';

const DataContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => useContext(DataContext);

// Unique ID generator with counter to prevent duplicates in rapid succession
let idCounter = 0;
export const generateUniqueId = () => {
    // timestamp (13 digits) + counter (3 digits) = 16 digits
    // safely within Number.MAX_SAFE_INTEGER (9,007,199,254,740,991)
    const timestamp = Date.now();
    const counter = idCounter++ % 1000; // supports 1000 products per ms
    return (timestamp * 1000) + counter;
};

// --- Localization Helpers ---
// Helper GLOBAL de formateo (1.000,00)
export const formatAmount = (amount, currency = 'USD', decimals = 2) => {
    const value = parseFloat(amount) || 0;
    // Round to avoid floating point anomalies
    const rounded = Math.round(value * 100) / 100;

    // Manual format to guarantee 1.000,00 structure regardless of device locale quirks
    const parts = rounded.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Thousands with dot
    const formatted = parts.join(','); // Decimals with comma

    // Add currency symbol if needed or just return number?
    // User asked for "Punto millares, coma decimales".
    return formatted;
};

// Export formatPrice for legacy compatibility or specific styling
export const formatPrice = (amount, currency = 'USD') => {
    return `${currency === 'USD' ? '$' : 'Bs'} ${formatAmount(amount, currency, 2)}`;
};

export const DataProvider = ({ children }) => {
    const { alert, confirm } = useDialog();
    const { settings } = useSettings();

    // Forced Migration and Initialization
    useEffect(() => {
        // Set Firebase encryption key (fallback to default if no PIN configured)
        const encKey = settings?.masterPin || '0000'; // Default fallback
        setEncryptionKey(encKey);
        console.log('🔐 Firebase encryption key configured');

        // --- CLOUD SYNC: Enable by default if not set ---
        if (localStorage.getItem('cloud_sync_enabled') === null) {
            localStorage.setItem('cloud_sync_enabled', 'true');
        }

        const SYNC_KEY = 'v2.1.8_force_sync';
        if (!localStorage.getItem(SYNC_KEY)) {
            console.warn('🔄 Version 2.1.8: Forcing server sync to apply ID fixes...');
            localStorage.setItem(SYNC_KEY, 'true');
            localStorage.setItem('force_server_sync', 'true');
            // Refresh logic if needed, but not necessarily a reload if it's OTA
        }

        // --- AUTO-DISCOVERY & SELF-HEALING ---
        const performStartupDiscovery = async () => {
            const savedIp = localStorage.getItem('remote_server_ip');

            // Si ya escaneamos en esta sesión, salimos para no molestar,
            // EXCEPTO si tenemos una IP guardada que PODRÍA haber cambiado (re-check).
            // Para simplificar, hacemos el check de salud siempre al inicio si hay IP guardada.

            if (!savedIp && sessionStorage.getItem('discovery_done')) return;
            sessionStorage.setItem('discovery_done', 'true');

            // Paso 1: Verificar si el servidor guardado responde (si existe)
            let needsDiscovery = false;

            if (savedIp) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
                    // Intentamos conectar al puerto Node (3001)
                    await fetch(`http://${savedIp}:3001/api/server-info-ping`, {
                        method: 'HEAD',
                        signal: controller.signal,
                        mode: 'no-cors' // Modo no-cors para ser más permisivos con el check simple
                    });
                    clearTimeout(timeoutId);
                    console.log("✅ Servidor actual responde correctamente:", savedIp);
                    return; // Todo bien
                } catch (e) {
                    console.warn(`⚠️ Servidor guardado (${savedIp}) NO responde. Iniciando auto-reparación...`);
                    needsDiscovery = true;
                }
            } else {
                // Si no hay IP guardada, solo hacemos descubrimiento si somos "nuevos" (Heurística Zero-Touch)
                needsDiscovery = true;
            }

            if (!needsDiscovery) return;

            // Paso 2: Ejecutar Escaneo
            try {
                // Pequeño delay para dejar arrancar el servidor local
                await new Promise(r => setTimeout(r, 1500));

                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 3000); // 3s scan
                const res = await fetch('http://localhost:3001/api/scan-servers', { signal: controller.signal });
                clearTimeout(id);

                const json = await res.json();
                const remotes = (json.servers || []).filter(s => !s.isSelf);

                if (remotes.length > 0) {
                    // CASO A: REPARACIÓN (Self-Healing)
                    if (savedIp) {
                        // Encontramos servidores y teníamos uno guardado que falló.
                        // Asumimos que el primero es el correcto (o el único).
                        const newServer = remotes[0];
                        console.log("🚑 Auto-Healing: Servidor re-ubicado en", newServer.ip);

                        localStorage.setItem('remote_server_ip', newServer.ip);
                        localStorage.setItem('pos_server_url', `http://${newServer.ip}:${newServer.port || 3001}`);

                        // Reload inmediato para recuperar conectividad
                        window.location.reload();
                        return;
                    }

                    // CASO B: NUEVA CONEXIÓN (Zero-Touch)
                    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
                    const products = JSON.parse(localStorage.getItem('products') || '[]');

                    if (sales.length < 5 && products.length < 10) {
                        const target = remotes[0];
                        console.log("🚀 Auto-Connecting valid new device to:", target.ip);

                        localStorage.setItem('remote_server_ip', target.ip);
                        localStorage.setItem('pos_server_url', `http://${target.ip}:3000`);
                        window.location.reload();
                    }
                } else if (savedIp) {
                    console.error("❌ Auto-repair falló: No se encontraron servidores en la red.");
                }
            } catch (e) {
                console.log("Discovery failed:", e.message);
            }
        };

        // Ejecutar descubrimiento
        performStartupDiscovery();
    }, []);

    const loadData = (key, fallback) => {
        try {
            const saved = localStorage.getItem(key);
            if (saved !== null) {
                const parsed = JSON.parse(saved);
                // Si está vacío y el fallback tiene datos (ej: nuevos usuarios Default), usar fallback
                if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
                    return fallback;
                }
                return parsed;
            }
            return fallback;
        } catch (e) {
            console.error(`❌ Error loading ${key}:`, e);
            return fallback;
        }
    };

    const importDataFromJSON = async (jsonString) => {
        try {
            const imported = JSON.parse(jsonString);
            setData(prev => ({ ...prev, ...imported, lastModified: new Date().toISOString() }));
            localStorage.setItem('force_server_sync', 'true');
            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    };

    const rescueFromExternalBackup = async () => {
        const ok = await alert({
            title: 'Rescate de Emergencia',
            message: 'Si reinstalaste la App, el servidor intentará cargar automáticamente tus datos desde la carpeta Documentos. ¿Deseas forzar una comprobación ahora?',
            confirmText: 'Sí, forzar',
            cancelText: 'No'
        });

        if (ok) {
            if (isLocalServerConnected) {
                localSyncService.socket.emit('force_external_recovery');
                await alert({ title: 'Rescate', message: 'Se ha enviado la señal de recuperación al servidor. Verifica si tus datos aparecen en unos segundos.' });
            } else {
                await alert({ title: 'Sin Conexión', message: 'El servidor local no responde. Asegúrate de que el servicio POS esté activo en las notificaciones.' });
            }
        }
    };

    const backupToCloud = async (deviceId = 'primary_pos') => {
        setSyncStatus('syncing');
        // Ensure encryption key is set (using master PIN as default or prompt?)
        // For now, use a constant or let the service handle it if set.
        const success = await firebaseSyncService.syncFullState(data, deviceId);
        setSyncStatus(success ? 'success' : 'error');
        if (success) {
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
        return success;
    };

    const restoreFromCloud = async (deviceId = 'primary_pos') => {
        const ok = await confirm({
            title: 'Restaurar desde la Nube',
            message: '¿Estás seguro? Los datos locales actuales serán REEMPLAZADOS por los de la nube.'
        });
        if (!ok) return false;

        setSyncStatus('syncing');
        const restoredData = await firebaseSyncService.fetchFullState(deviceId);
        if (restoredData) {
            setData({ ...restoredData, lastModified: new Date().toISOString() });
            localStorage.setItem('force_server_sync', 'true');
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);
            await alert({ title: 'Éxito', message: 'Datos restaurados correctamente desde la nube.' });
            return true;
        } else {
            setSyncStatus('error');
            await alert({ title: 'Error', message: 'No se encontró respaldo en la nube o la clave de cifrado es incorrecta.' });
            return false;
        }
    };


    const defaultCategories = [
        { id: 'cheeses', label: 'Quesos', department: 'Quesera', keywords: ['queso', 'cheese', 'cheddar', 'mozzarella', 'parmesano', 'gouda', 'mano', 'telita', 'guayanes', 'fundido', 'gratinado'] },
        { id: 'cachapas', label: 'Cachapas', department: 'Restaurante', keywords: ['cachapa', 'queso', 'carne', 'pollo', 'jamon', 'mixta'] },
        { id: 'carne_en_vara', label: 'Carne en Vara', department: 'Restaurante', keywords: ['carne', 'vara', 'res', 'brasa', 'parrilla'] },
        { id: 'chichas', label: 'Chichas', department: 'Restaurante', keywords: ['chicha', 'morichal', 'cremoso', 'arroz', 'maiz', 'canela', 'leche'] },
        { id: 'drinks', label: 'Bebidas', department: 'Restaurante', keywords: ['bebida', 'refresco', 'jugo', 'agua', 'energizante', 'cola', 'pepsi', 'fanta', 'sprite', 'malta', 'te', 'cafe', 'limonada', 'naranja', 'manzana', 'batido', 'smoothie', 'soda', 'polar', 'tercio', 'cerveza', 'licor'] },
        { id: 'sides', label: 'Contornos', department: 'Restaurante', keywords: ['contorno', 'papas', 'fritas', 'yuca', 'aros', 'cebolla', 'pure', 'arroz', 'platano', 'tostones', 'tajadas', 'arepas'] },
        { id: 'soups', label: 'Sopas', department: 'Restaurante', keywords: ['sopa', 'caldo', 'consomé', 'crema', 'sancocho', 'mondongo', 'hervido', 'fosforera', 'pollo', 'res', 'gallina', 'pescado', 'mariscos', 'asopado'] },
        { id: 'pasta', label: 'Pasta', department: 'Restaurante', keywords: ['pasta', 'espagueti', 'spaghetti', 'fettuccine', 'lasagna', 'ravioli', 'macarrones', 'penne', 'tallarines', 'carbonara', 'bolognesa', 'alfredo'] },
        { id: 'salads', label: 'Ensaladas', department: 'Restaurante', keywords: ['ensalada', 'verde', 'cesar', 'mixta', 'lechuga', 'tomate', 'vegetales', 'verduras', 'fresca'] },
        { id: 'desserts', label: 'Postres', department: 'Restaurante', keywords: ['postre', 'dulce', 'helado', 'torta', 'pastel', 'cake', 'flan', 'gelatina', 'brownie', 'pie', 'mousse', 'quesillo', 'tres leches', 'marquesa', 'tiramisu', 'alfajores', 'miel', 'chocolate', 'bombones'] },
        { id: 'snacks', label: 'Snacks', department: 'Restaurante', keywords: ['snack', 'aperitivo', 'tequeño', 'empanada', 'pastelito', 'arepa', 'deditos', 'nuggets', 'alitas', 'wings', 'nachos', 'galleta', 'confiteria', 'papas', 'doritos', 'chispas'] },
        { id: 'groceries', label: 'Víveres/Bodega', department: 'Venta', keywords: ['aceite', 'arroz', 'harina', 'leche', 'azucar', 'sal', 'vinagre', 'mayonesa', 'salsa', 'viveres', 'grano', 'enlatado', 'atun'] },
        { id: 'hygiene', label: 'Higiene/Aseo', department: 'Venta', keywords: ['desodorante', 'jabon', 'shampoo', 'crema', 'dental', 'colgate', 'cepillo', 'aseo', 'higiene', 'papel', 'toalla', 'detergente', 'limpieza'] },
        { id: 'burgers', label: 'Hamburguesas', department: 'Restaurante', keywords: ['hamburguesa', 'burger', 'carne', 'doble', 'triple', 'bacon', 'queso', 'bbq', 'angus', 'wagyu', 'cheeseburger'] }
    ];

    const defaultUsers = [
        { id: 'u1', name: 'Administrador', role: 'admin', pin: '123' },
        { id: 'u2', name: 'Cajero', role: 'cashier', pin: '123' },
        { id: 'u3', name: 'Cocina', role: 'kitchen', pin: '123' },
        { id: 'u4', name: 'Barra', role: 'bar', pin: '123' }, // Nota: Rol 'bar' debe ser soportado en UI
        { id: 'u5', name: 'Mesero', role: 'waiter', pin: '123' }
    ];

    const defaultPaymentMethods = [
        { id: 'pm_1', name: 'Efectivo $', currency: 'USD', color: '#22c55e', native: true },
        { id: 'pm_2', name: 'Efectivo Bs', currency: 'Bs', color: '#4ade80', native: true },
        { id: 'pm_3', name: 'Zelle', currency: 'USD', color: '#a78bfa', native: true },
        { id: 'pm_4', name: 'Punto Banesco', currency: 'Bs', color: '#1d6335', native: true },
        { id: 'pm_5', name: 'Punto Bancaribe', currency: 'Bs', color: '#0054a6', native: true },
        { id: 'pm_6', name: 'Punto Banplus', currency: 'Bs', color: '#8dc63f', native: true },
        { id: 'pm_7', name: 'Pago Móvil Banesco', currency: 'Bs', color: '#1d6335', native: true },
        { id: 'pm_8', name: 'Pago Móvil BDV', currency: 'Bs', color: '#e74c3c', native: true },
        { id: 'pm_9', name: 'Pago Móvil Banplus', currency: 'Bs', color: '#8dc63f', native: true }
    ];

    const [data, setData] = useState({
        inventory: loadData('inventory', []),
        suppliers: loadData('suppliers', []),
        personnel: loadData('personnel', []),
        users: loadData('users', defaultUsers),
        products: loadData('products', []),
        categories: loadData('categories', defaultCategories),
        sales: loadData('sales', []),
        heldOrders: loadData('heldOrders', []),
        cancelledOrders: loadData('cancelledOrders', []),
        tips: loadData('tips', 0),
        tipHistory: loadData('tipHistory', []),
        tipDistributions: loadData('tipDistributions', []),
        tables: loadData('tables', Array.from({ length: 12 }, (_, i) => ({
            id: i + 1,
            name: i < 10 ? `Mesa ${i + 1}` : (i === 10 ? 'Quesera' : 'Barra'),
            status: 'available',
            area: i < 10 ? 'Restaurante' : (i === 10 ? 'Quesera' : 'Restaurante'),
            department: i < 10 ? 'Restaurante' : (i === 10 ? 'Quesera' : 'Restaurante')
        }))),
        customers: loadData('customers', []),
        kitchenOrders: loadData('kitchenOrders', []),
        barOrders: loadData('barOrders', []),
        paymentMethods: loadData('paymentMethods', defaultPaymentMethods),
        cancelledKitchenOrders: loadData('cancelledKitchenOrders', []),
        cancelledBarOrders: loadData('cancelledBarOrders', []),
        pendingPayment: loadData('pendingPayment', []),
        inventoryEntries: loadData('inventoryEntries', []),
        exchangeRate: loadData('exchangeRate', 60),
        rateHistory: loadData('rateHistory', []),
        cashRegister: loadData('cashRegister', {
            isOpen: false, status: 'closed', openingBalanceBs: 0, openingBalanceUsd: 0,
            openingBreakdownBs: [], openingBreakdownUsd: [],
            closingBreakdownBs: [], closingBreakdownUsd: []
        }),
        expenses: loadData('expenses', []),
        debts: loadData('debts', []),
        accountsReceivable: loadData('accountsReceivable', []),
        cashRegisterHistory: loadData('cashRegisterHistory', []),
        defaultForeignCurrencyDiscountPercent: loadData('defaultForeignCurrencyDiscountPercent', 0),
        lastModified: new Date().toISOString(),
        serverInfo: null
    });

    const [isDriveConnected] = useState(false);

    // Auto-inject missing essential categories (Víveres and Higiene)
    useEffect(() => {
        const essentialCategories = [
            { id: 'groceries', label: 'Víveres/Bodega', department: 'Venta', keywords: ['aceite', 'arroz', 'harina', 'leche', 'azucar', 'sal', 'vinagre', 'mayonesa', 'salsa', 'viveres', 'grano', 'enlatado', 'atun'] },
            { id: 'hygiene', label: 'Higiene/Aseo', department: 'Venta', keywords: ['desodorante', 'jabon', 'shampoo', 'crema', 'dental', 'colgate', 'cepillo', 'aseo', 'higiene', 'papel', 'toalla', 'detergente', 'limpieza'] }
        ];

        let hasChanges = false;
        const currentCats = [...(data.categories || [])];

        essentialCategories.forEach(essential => {
            if (!currentCats.find(c => c.id === essential.id)) {
                currentCats.push(essential);
                hasChanges = true;
            }
        });

        if (hasChanges) {
            setData(prev => ({ ...prev, categories: currentCats }));
        }
    }, [data.categories]);
    const [syncStatus, setSyncStatus] = useState('idle');
    const [loadingBcv, setLoadingBcv] = useState(false);
    const isRemoteUpdate = useRef(false);
    const [isLocalServerConnected, setIsLocalServerConnected] = useState(false);
    const [isServerLocked, setIsServerLocked] = useState(false);
    const [isMonitorMode, setIsMonitorMode] = useState(localStorage.getItem('monitor_mode_enabled') === 'true');
    const previousReadyCountRef = useRef(0);

    // Forced Migration: Update Categories and Recategorize
    useEffect(() => {
        const MIGRATION_KEY = 'cat_migration_v2_comida_fix';
        if (localStorage.getItem(MIGRATION_KEY)) return;

        console.log("🔄 Starting Category Migration...");

        // 1. Update Categories Definitions (Overwrite with new defaults)
        const updatedCategories = defaultCategories;

        // 2. Re-categorize misclassified products
        let productsUpdated = 0;
        const currentProducts = data.products || [];

        // Smart re-categorization logic
        // NOTE: We cannot use require/import dynamically here easily in Vite without async, 
        // so we'll implement a simplified version of the logic just for this migration.

        const updatedProducts = currentProducts.map(p => {
            // Fix specific known misclassifications
            const normalize = str => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
            const name = normalize(p.name);

            // Move 'Alfajores' out of Soups
            if (name.includes('alfajor') && p.category === 'soups') {
                productsUpdated++;
                return { ...p, category: 'desserts' };
            }

            // Move 'Viveres' out of Soups
            if (name.includes('viveres') && p.category === 'soups') {
                productsUpdated++;
                return { ...p, category: 'varios' };
            }

            // Move 'Polar/Cerveza' out of Soups
            if ((name.includes('polar') || name.includes('cerveza')) && p.category === 'soups') {
                productsUpdated++;
                return { ...p, category: 'drinks' };
            }

            // Move 'Miel' out of Soups
            if (name.includes('miel') && p.category === 'soups') {
                productsUpdated++;
                return { ...p, category: 'desserts' };
            }

            // Move 'Flores' out of Soups
            if (name.includes('flores') && p.category === 'soups') {
                productsUpdated++;
                return { ...p, category: 'varios' };
            }

            // Move 'Bollo/Bollito/Cachapa' to Comida
            // Fix: ensure they don't get stuck in 'cheeses' or 'snacks' if they contain 'queso'
            if (name.includes('bollo') || name.includes('cachapa')) {
                if (p.category !== 'comida') {
                    productsUpdated++;
                    return { ...p, category: 'comida' };
                }
            }

            // Move 'Casabe' to Contornos
            if (name.includes('casabe') && p.category !== 'sides') {
                productsUpdated++;
                return { ...p, category: 'sides' };
            }

            // Prevent 'Racion de xxx' ending up in cheeses just because of 'queso' if the main item is something else
            // e.g. 'Racion de bollito con queso' -> Comida, NOT Quesos
            if (name.includes('racion') && name.includes('queso') && (name.includes('bollito') || name.includes('arepa') || name.includes('cachapa'))) {
                if (p.category === 'cheeses') {
                    productsUpdated++;
                    return { ...p, category: 'comida' };
                }
            }

            // Move 'Calamares' out of Soups (if misclassified)
            if (name.includes('calamares') && p.category === 'soups') {
                // Check if it's actually soup 'Sopa de calamares' vs 'Calamares rebozados'
                if (!name.includes('sopa') && !name.includes('asopado')) {
                    productsUpdated++;
                    return { ...p, category: 'comida' };
                }
            }

            return p;
        });

        // 3. Apply changes (Use a new key to force re-run for this specific fix)
        // Check if we need to re-run based on logic change, even if key exists? 
        // We will append a suffix to the key or just trust the new logic adds changes

        if (productsUpdated > 0 || JSON.stringify(data.categories) !== JSON.stringify(updatedCategories)) {
            console.log(`✅ Migration Applied: Fixed ${productsUpdated} products.`);

            setData(prev => ({
                ...prev,
                categories: updatedCategories,
                products: updatedProducts,
                lastModified: new Date().toISOString()
            }));

            // Persist immediately
            localStorage.setItem('categories', JSON.stringify(updatedCategories));
            localStorage.setItem('products', JSON.stringify(updatedProducts));
            localStorage.setItem(MIGRATION_KEY, 'true');
        } else {
            // Mark migration as done even if no changes were needed, to avoid re-running
            localStorage.setItem(MIGRATION_KEY, 'true');
        }

    }, []); // Run once

    // Persistencia Local
    useEffect(() => {
        Object.keys(data).forEach(key => {
            if (key !== 'serverInfo') {
                localStorage.setItem(key, JSON.stringify(data[key]));
            }
        });

        if (isDriveConnected && !isRemoteUpdate.current) {
            const timeoutId = setTimeout(async () => {
                setSyncStatus('syncing');
                try {
                    await googleDriveService.uploadFile('erp_la_autentica_backup_auto.json', { timestamp: new Date().toISOString(), data });
                    setSyncStatus('success');
                    setTimeout(() => setSyncStatus('idle'), 3000);
                } catch { setSyncStatus('error'); }
            }, 3000);
            return () => clearTimeout(timeoutId);
        }
    }, [data, isDriveConnected]);

    // Sincronización Local (WebSocket)
    useEffect(() => {
        localSyncService.connect();
        const unsubscribe = localSyncService.subscribe((type, payload) => {
            if (type === 'connection_status') setIsLocalServerConnected(payload);
            if (type === 'sync_update') {
                const serverTime = new Date(payload.lastModified || 0).getTime();
                const localTime = new Date(data.lastModified || 0).getTime();
                const forceServer = localStorage.getItem('force_server_sync') === 'true';

                if (serverTime > localTime || forceServer) {
                    console.log('📥 Accepting server data (Force/Newer)');
                    setData(prev => ({ ...prev, ...payload }));
                    if (forceServer) localStorage.removeItem('force_server_sync');
                } else if (localTime > serverTime) {
                    // Si lo local es mas nuevo, forzar al servidor a actualizarse
                    localSyncService.sendFullStateUpdate(data);
                }
            }
            if (type === 'encryption_required') {
                setIsServerLocked(true);
                const savedKey = localStorage.getItem('pos_encryption_key') || sessionStorage.getItem('pos_encryption_key');
                if (savedKey) {
                    console.log('🔐 Auto-providing encryption key to local server...');
                    localSyncService.sendEncryptionKey(savedKey);
                }
            }
            if (type === 'encryption_unlock_success') {
                console.log('🔓 Local server UNLOCKED successfully');
                setIsServerLocked(false);
                localStorage.setItem('force_server_sync', 'true'); // Force fresh sync after unlock
            }
            if (type === 'encryption_unlock_error') {
                console.error('❌ Local server unlock FAILED:', payload);
                setIsServerLocked(true); // Ensure it stays locked in UI
            }
            if (type === 'server_info') {
                setData(prev => ({ ...prev, serverInfo: payload }));
            }
        });
        return () => unsubscribe();
    }, [data.lastModified]); // Only depend on lastModified to avoid loop if setData changes whole object

    // Notificación sonora cuando un pedido está listo
    useEffect(() => {
        const readyOrders = data.heldOrders?.filter(o => o.status === 'ready') || [];
        if (readyOrders.length > previousReadyCountRef.current) {
            audioService.playNotification();
        }
        previousReadyCountRef.current = readyOrders.length;
    }, [data.heldOrders]);

    // --- Active Carts Logic (Ephemeral) ---
    const [activeCarts, setActiveCarts] = useState({});

    // Cloud Carts Sync (Listen to others)
    useEffect(() => {
        const cloudSyncEnabled = localStorage.getItem('cloud_sync_enabled') === 'true';
        if (!cloudSyncEnabled) return;

        const unsubscribe = firebaseSyncService.subscribeToCloudCarts((cloudCarts) => {
            setActiveCarts(prev => ({ ...prev, ...cloudCarts }));
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = localSyncService.subscribe((type, payload) => {
            if (type === 'remote_cart_update') {
                // payload: { userId, username, cart, timestamp }
                setActiveCarts(prev => {
                    const newState = { ...prev };
                    if (payload.cart.length === 0) {
                        delete newState[payload.userId];
                    } else {
                        newState[payload.userId] = payload;
                    }
                    return newState;
                });
            }
        });
        return () => unsubscribe();
    }, []);

    const sendLiveCartUpdate = (user, cartItems) => {
        const update = {
            userId: user?.id || 'unknown',
            username: user?.username || user?.name || 'Anon',
            cart: cartItems,
            timestamp: new Date().toISOString()
        };

        if (isLocalServerConnected) {
            localSyncService.sendActiveCartUpdate(update);
        }

        // Also sync to cloud if enabled
        if (localStorage.getItem('cloud_sync_enabled') === 'true') {
            firebaseSyncService.syncActiveCarts({ [update.userId]: update });
        }
    };

    useEffect(() => {
        if (isLocalServerConnected) {
            const timeoutId = setTimeout(() => {
                console.log('📤 Throttled Full Sync (15s)...');
                localSyncService.sendFullStateUpdate(data);
            }, 15000);
            return () => clearTimeout(timeoutId);
        }
    }, [data, isLocalServerConnected]);

    // Cloud Real-time Refresh (Bidirectional: Monitor Mode AND Remote Management)
    useEffect(() => {
        const cloudSyncEnabled = localStorage.getItem('cloud_sync_enabled') === 'true';
        if (!cloudSyncEnabled) return;

        console.log('📡 Cloud Listener: Watching for remote management updates...');

        const unsubscribe = firebaseSyncService.subscribeToFullState('primary_pos', (cloudState) => {
            const cloudTime = new Date(cloudState.lastModified || 0).getTime();
            const localTime = new Date(data.lastModified || 0).getTime();

            if (cloudTime > localTime) {
                console.log('📥 Cloud Update: Adopting newer data from remote management');
                setData(prev => {
                    // PROTECTION: Never adopt the outdated '344.51' rate from cloud
                    if (cloudState.exchangeRate === 344.51) {
                        console.warn('🛡️  Cloud tried to revert rate to 344.51. Blocked.');
                        return { ...prev, ...cloudState, exchangeRate: prev.exchangeRate };
                    }
                    return { ...prev, ...cloudState };
                });
            }
        });

        return () => unsubscribe();
    }, [data.lastModified]); // Re-subscribe if local modified to check against cloud next time

    // 🔥 IMMEDIATE LOCAL BACKUP: Save to /sdcard INSTANTLY (atomic protection)
    useEffect(() => {
        // Skip on first render or monitor mode
        if (!data.lastModified || isMonitorMode) return;

        // IMMEDIATE backup to external storage (survives reinstalls)
        if (isLocalServerConnected) {
            (async () => {
                try {
                    const response = await fetch(`${localSyncService.serverUrl}/save-external-backup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (response.ok) {
                        console.log('✅ IMMEDIATE backup saved to /sdcard/Documents');
                    }
                } catch (error) {
                    console.error('❌ Failed to save immediate backup:', error);
                }
            })();
        }
    }, [data.lastModified, isMonitorMode, isLocalServerConnected]);

    // ☁️ DEBOUNCED FIREBASE SYNC: Sync to cloud after 2s (avoid API spam)
    useEffect(() => {
        // Skip if no changes or monitor mode
        if (!data.lastModified || isMonitorMode) return;

        const cloudSyncEnabled = localStorage.getItem('cloud_sync_enabled') === 'true';
        if (!cloudSyncEnabled) return;

        // Debounce: wait 2s after last change before syncing to Firebase
        const debounceTimer = setTimeout(async () => {
            console.log('☁️ Syncing to Firebase Cloud...');
            await backupToCloud();
        }, 2000); // 2 seconds debounce for Firebase only

        return () => clearTimeout(debounceTimer);
    }, [data.lastModified, isMonitorMode]);

    // Acciones
    const updateData = (section, newData) => setData(prev => ({ ...prev, [section]: newData, lastModified: new Date().toISOString() }));

    const addItem = (section, item) => setData(prev => ({
        ...prev,
        [section]: [...(prev[section] || []), { ...item, id: item.id || generateUniqueId() }],
        lastModified: new Date().toISOString()
    }));

    const updateItem = (section, id, fields) => setData(prev => ({
        ...prev,
        [section]: prev[section].map(item => {
            if (item.id === id) {
                const updatedFields = typeof fields === 'function' ? fields(item) : fields;
                return { ...item, ...updatedFields };
            }
            return item;
        }),
        lastModified: new Date().toISOString()
    }));

    const deleteItem = (section, id) => setData(prev => ({
        ...prev,
        [section]: prev[section].filter(item => item.id !== id),
        lastModified: new Date().toISOString()
    }));

    const holdOrder = (cart, note = '', metadata = {}) => {
        const newOrder = {
            id: Date.now(), items: cart, note, timestamp: new Date().toISOString(),
            total: cart.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0),
            status: 'active', isWaitList: metadata.isWaitList || false, ...metadata
        };
        addItem('heldOrders', newOrder);
        if (metadata.tableId) updateItem('tables', metadata.tableId, { status: 'occupied', currentOrderId: newOrder.id });
        if (isLocalServerConnected) localSyncService.sendHeldOrder(newOrder);
        return newOrder.id;
    };

    const sendOrderToProduction = (cart, note = '', metadata = {}) => {
        const orderId = holdOrder(cart, note, { ...metadata, isWaitList: false });
        const kitchenOrder = { id: Date.now() + 1, items: cart, type: 'kitchen', sourceOrderId: orderId, ...metadata, status: 'pending' };
        addItem('kitchenOrders', kitchenOrder);
        if (isLocalServerConnected) localSyncService.sendKitchenOrder(kitchenOrder);
        return orderId;
    };

    const deleteHeldOrder = (orderId) => {
        const order = data.heldOrders.find(o => o.id === orderId);
        if (order?.tableId) updateItem('tables', order.tableId, { status: 'available', currentOrderId: null });
        deleteItem('heldOrders', orderId);
        if (isLocalServerConnected) localSyncService.deleteHeldOrder(orderId);
    };

    const cancelHeldOrder = (orderId) => {
        const order = data.heldOrders.find(o => o.id === orderId);
        if (!order) return;
        if (order.tableId) updateItem('tables', order.tableId, { status: 'available', currentOrderId: null });
        setData(prev => ({
            ...prev,
            heldOrders: prev.heldOrders.filter(o => o.id !== orderId),
            cancelledOrders: [...prev.cancelledOrders, { ...order, cancelledAt: new Date().toISOString() }],
            lastModified: new Date().toISOString()
        }));
    };

    const restoreCancelledOrder = (orderId) => {
        const order = data.cancelledOrders.find(o => o.id === orderId);
        if (!order) return;
        setData(prev => ({
            ...prev,
            cancelledOrders: prev.cancelledOrders.filter(o => o.id !== orderId),
            heldOrders: [...prev.heldOrders, { ...order, status: 'active', cancelledAt: undefined }],
            lastModified: new Date().toISOString()
        }));
    };

    const permanentlyDeleteOrder = (orderId) => {
        deleteItem('cancelledOrders', orderId);
    };

    const updateExchangeRate = (rate) => {
        const val = parseFloat(rate);
        if (val > 0) {
            setData(prev => ({
                ...prev,
                exchangeRate: val,
                rateHistory: [{ id: Date.now(), rate: val, date: new Date().toISOString() }, ...(prev.rateHistory || [])],
                lastModified: new Date().toISOString()
            }));

            if (localSyncService.isConnected) {
                localSyncService.sendExchangeRate(val);
            }
        }
    };

    // --- AUTO UPDATE BCV RATE (Background Polling) ---
    const refreshBcvRate = async (force = true) => {
        const now = new Date();
        const hour = now.getHours();
        setLoadingBcv(true);

        try {
            if (!navigator.onLine) {
                setLoadingBcv(false);
                return;
            }

            // SMART SCHEDULING (only if not forced)
            if (!force) {
                const isCriticalWindow = hour >= 16 && hour <= 19;
                const minWait = isCriticalWindow ? 15 * 60 * 1000 : 4 * 60 * 60 * 1000;
                const lastCheck = localStorage.getItem('last_bcv_check') || 0;
                if (now.getTime() - lastCheck < minWait) {
                    setLoadingBcv(false);
                    return;
                }
            }

            localStorage.setItem('last_bcv_check', now.getTime().toString());

            // Use the NEW local server scraping endpoint instead of outdated external APIs
            const serverUrl = getAutoServerUrl();
            const response = await fetch(`${serverUrl}/api/bcv-rate`);
            if (!response.ok) throw new Error('Server response not ok');

            const json = await response.json();
            if (json && json.promedio) {
                const onlineRate = parseFloat(json.promedio);
                const currentRate = parseFloat(data.exchangeRate);

                // Update if different enough (> 0.005) and valid.
                if (onlineRate > 0 && Math.abs(onlineRate - currentRate) > 0.005) {
                    console.log(`🔄 [Auto-BCV] Detectado cambio de tasa real: ${currentRate} -> ${onlineRate}`);
                    updateExchangeRate(onlineRate.toString());
                    return onlineRate;
                }
            }
        } catch (err) {
            console.warn('[Auto-BCV] Falló chequeo de tasa:', err);
        } finally {
            setLoadingBcv(false);
        }
    };

    useEffect(() => {
        // Check on mount (app start)
        refreshBcvRate(false);

        // Check every 5 minutes (Heartbeat for smart schedule)
        const intervalId = setInterval(() => refreshBcvRate(false), 5 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [data.exchangeRate]);


    const setMasterKey = (key, remember = true) => {
        if (remember) {
            localStorage.setItem('pos_encryption_key', key);
        } else {
            sessionStorage.setItem('pos_encryption_key', key);
        }
        if (isLocalServerConnected) {
            localSyncService.sendEncryptionKey(key);
        }
    };

    const changeMasterKey = (oldKey, newKey) => {
        if (isLocalServerConnected) {
            return localSyncService.changeMasterKey(oldKey, newKey);
        }
        return false;
    };

    const addTip = (amount, source = 'Venta POS') => {
        const val = parseFloat(amount);
        if (val > 0) setData(prev => ({
            ...prev, tips: prev.tips + val,
            tipHistory: [{ id: Date.now(), amount: val, source, timestamp: new Date().toISOString() }, ...prev.tipHistory],
            lastModified: new Date().toISOString()
        }));
    };

    const clearAllData = () => {
        setData({
            inventory: [], suppliers: [], personnel: [], users: [], products: [],
            categories: defaultCategories, sales: [], heldOrders: [], cancelledOrders: [],
            tips: 0, tipHistory: [], tipDistributions: [],
            tables: Array.from({ length: 12 }, (_, i) => ({
                id: i + 1,
                name: i < 10 ? `Mesa ${i + 1}` : (i === 10 ? 'Quesera' : 'Barra'),
                status: 'available',
                area: i < 10 ? 'Restaurante' : (i === 10 ? 'Quesera' : 'Restaurante'),
                department: i < 10 ? 'Restaurante' : (i === 10 ? 'Quesera' : 'Restaurante')
            })),
            customers: [], kitchenOrders: [], barOrders: [], cancelledKitchenOrders: [],
            cancelledBarOrders: [], pendingPayment: [], inventoryEntries: [],
            exchangeRate: 60, rateHistory: [], cashRegister: { isOpen: false, status: 'closed' },
            paymentMethods: defaultPaymentMethods,
            defaultForeignCurrencyDiscountPercent: 0, lastModified: new Date().toISOString(), serverInfo: null
        });
    };

    const exportData = () => {
        const blob = new Blob([JSON.stringify({ timestamp: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const importData = (file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                if (backup.data) {
                    isRemoteUpdate.current = true;
                    setData(backup.data);
                    await alert({ title: 'Restauración', message: 'Datos restaurados exitosamente.' });
                }
            } catch {
                await alert({ title: 'Error', message: 'Error al procesar el archivo de respaldo.' });
            }
        };
        reader.readAsText(file);
    };

    return (
        <DataContext.Provider value={{
            data, updateData, addItem, updateItem, deleteItem, clearAllData,
            exportData, importData, isDriveConnected, syncStatus,
            holdOrder, deleteHeldOrder, cancelHeldOrder, restoreCancelledOrder, permanentlyDeleteOrder,
            addTip, sendOrderToProduction, updateExchangeRate,
            refreshBcvRate, loadingBcv,
            isLocalServerConnected,
            isServerLocked, setMasterKey, changeMasterKey, rescueFromExternalBackup,
            serverInfo: data.serverInfo,
            activeCarts, sendLiveCartUpdate, // <-- New Active Carts Exports
            formatAmount, // Export formatting utility
            uploadToDrive: googleDriveService.uploadBinaryFile,
            backupToCloud, restoreFromCloud, // <-- Firebase Exports
            isMonitorMode, setIsMonitorMode: (val) => {
                localStorage.setItem('monitor_mode_enabled', val.toString());
                setIsMonitorMode(val);
                if (val) window.location.reload(); // Refresh to stop local server sync if needed
            }
        }}>
            {children}
        </DataContext.Provider>
    );
};
