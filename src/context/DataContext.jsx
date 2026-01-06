/**
 * ====================================================================================
 * DATACONTEXT - GESTOR CENTRAL DE DATOS DEL SISTEMA POS
 * ====================================================================================
 * 
 * PROPÓSITO:
 * Este Context maneja TODOS los datos del sistema POS, incluyendo:
 * - Inventario, Productos, Proveedores, Personal
 * - Ventas, Órdenes en Espera, Mesas
 * - Propinas, Caja, Clientes
 * - Tasa de cambio (Bs/USD)
 * 
 * ====================================================================================
 * ARQUITECTURA DE SINCRONIZACIÓN (MULTI-CAPA)
 * ====================================================================================
 * 
 * 1. CAPA LOCAL (localStorage)
 *    - Persistencia inmediata en el navegador
 *    - useEffect guarda automáticamente cada cambio
 *    - Previene pérdida de datos al cerrar la app
 * 
 * 2. CAPA LOCAL SYNC (WebSocket)
 *    - Sincronización en tiempo real entre dispositivos en la misma red local
 *    - Usa servidor Node.js local (puerto 3001)
 *    - Ideal para varios POS en un restaurante
 *    - Servicio: localSyncService
 * 
 * 3. CAPA GOOGLE DRIVE (Backup automático)
 *    - Sincronización en la nube
 *    - Auto-upload cada 3 segundos (debounced)
 *    - Auto-download cada 15 segundos (polling)
 *    - Evita conflictos comparando timestamps
 *    - Servicio: googleDriveService
 * 
 * 4. CAPA FIREBASE (Cloud híbrido)
 *    - Sincroniza ventas a Firestore
 *    - Backup adicional en la nube
 *    - Debounce de 5 segundos
 *    - Servicio: firebaseSyncService
 * 
 * ====================================================================================
 * FUNCIONES PRINCIPALES
 * ====================================================================================
 * 
 * GENÉRICAS:
 * - addItem(section, item)       → Agrega un item a una sección (productos, ventas, etc.)
 * - updateItem(section, id, data)→ Actualiza un item existente
 * - deleteItem(section, id)      → Elimina un item
 * - updateData(section, newData) → Reemplaza completamente una sección
 * - clearAllData()               → Resetea todo el sistema
 * 
 * ÓRDENES:
 * - holdOrder(cart, note, metadata) → Pone una orden en espera (para mesas)
 * - deleteHeldOrder(orderId)        → Elimina/completa una orden en espera
 * - sendToKitchen(items, tableId)   → Envía orden a cocina (multi-dispositivo)
 * 
 * PROPINAS:
 * - addTip(amount, source)     → Registra una propina
 * - distributeTips()           → Distribuye propinas entre personal activo
 * 
 * MULTI-MONEDA:
 * - updateExchangeRate(newRate) → Actualiza tasa Bs/USD y guarda historial
 * 
 * BACKUP:
 * - exportData()               → Descarga backup JSON
 * - importData(file)           → Restaura desde backup JSON
 * - connectDrive()             → Conecta con Google Drive
 * - syncFromDrive()            → Sincroniza desde Drive manualmente
 * - uploadToDrive(file)        → Sube archivo a Drive
 * 
 * ====================================================================================
 * ESTRUCTURA DE DATOS
 * ====================================================================================
 * 
 * data = {
 *   inventory: [],         // Items de inventario
 *   products: [],          // Productos del menú
 *   suppliers: [],         // Proveedores
 *   personnel: [],         // Personal
 *   sales: [],             // Historial de ventas
 *   heldOrders: [],        // Órdenes en espera (mesas)
 *   tables: [],            // Mesas del restaurante
 *   customers: [],         // Clientes (para crédito)
 *   kitchenOrders: [],     // Órdenes en cocina
 *   tips: number,          // Total de propinas acumuladas
 *   tipHistory: [],        // Historial de propinas
 *   tipDistributions: [],  // Distribuciones de propinas
 *   exchangeRate: number,  // Tasa Bs/USD actual
 *   rateHistory: [],       // Historial de tasas
 *   cashRegister: {},      // Estado de la caja
 *   defaultForeignCurrencyDiscountPercent: number, // Desc. por pago en divisa
 *   lastModified: string   // Timestamp de última modificación
 * }
 * 
 * ====================================================================================
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { googleDriveService } from '../services/googleDrive';
import { localSyncService } from '../services/localSync';
import { firebaseSyncService } from '../services/firebase';

const DataContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    /**
     * Helper to load data from localStorage with fallback to default values
     * SIMPLIFIED VERSION: Always use localStorage if exists, otherwise use fallback
     * This prevents data loss bugs caused by complex initialization logic
     */
    const loadData = (key, fallback) => {
        try {
            const saved = localStorage.getItem(key);

            // If data exists in localStorage, use it
            if (saved !== null) {
                return JSON.parse(saved);
            }

            // First time loading: use fallback (mockData or defaults)
            return fallback;
        } catch (e) {
            console.error(`❌ Error loading ${key}:`, e);
            return fallback;
        }
    };

    // Default categories with intelligent keywords for auto-categorization
    const defaultCategories = [
        {
            id: 'bebidas',
            label: 'Bebidas',
            keywords: ['bebida', 'refresco', 'jugo', 'agua', 'energizante', 'cola', 'pepsi', 'fanta', 'sprite', 'malta', 'te', 'cafe', 'limonada', 'naranja', 'manzana', 'batido', 'smoothie', 'soda', 'coca', 'cerveza', 'licor', 'vino']
        },
        {
            id: 'comida',
            label: 'Comida',
            keywords: ['hamburguesa', 'burger', 'carne', 'doble', 'triple', 'bacon', 'queso', 'bbq', 'angus', 'wagyu', 'cheeseburger', 'pizza', 'perro', 'hot dog', 'salchicha', 'pollo', 'frito', 'asado', 'parrilla', 'bistec', 'solomo', 'punta', 'costilla', 'cerdo', 'chuleta', 'pescado', 'sandwich', 'pan', 'pepito', 'enrollado', 'shawarma', 'tostada', 'arepa', 'cachapa', 'taco', 'burrito', 'quesadilla', 'nachos', 'papas', 'fritas', 'yuca', 'aros', 'cebolla', 'pure', 'arroz', 'platano', 'tostones', 'tajadas', 'ensalada', 'cesar']
        },
        {
            id: 'sopas',
            label: 'Sopas',
            keywords: ['sopa', 'caldo', 'consomé', 'crema', 'sancocho', 'mondongo', 'hervido', 'fosforera', 'gallina', 'res', 'costilla', 'lagarto', 'pescado', 'mariscos', 'chupe', 'ajiaco', 'potaje', 'lentejas', 'caraotas', 'granos']
        },
        {
            id: 'dulces',
            label: 'Dulces',
            keywords: ['postre', 'dulce', 'helado', 'torta', 'pastel', 'cake', 'flan', 'gelatina', 'brownie', 'pie', 'mousse', 'quesillo', 'tres leches', 'marquesa', 'tiramisu', 'galleta', 'cookie', 'chocolate', 'vainilla', 'fresa', 'arequipe', 'nutella', 'donas', 'churros']
        }
    ];

    const [data, setData] = useState({
        inventory: loadData('inventory', []),
        suppliers: loadData('suppliers', []),
        personnel: loadData('personnel', []),
        users: loadData('users', []), // New Users Collection
        products: loadData('products', []),
        categories: loadData('categories', defaultCategories), // Dynamic categories
        sales: loadData('sales', []),
        heldOrders: loadData('heldOrders', []),
        cancelledOrders: loadData('cancelledOrders', []), // Trash bin for held orders
        tips: loadData('tips', 0),
        tipHistory: loadData('tipHistory', []),
        tipDistributions: loadData('tipDistributions', []),
        // Restaurant Features
        // Default tables with Area
        tables: loadData('tables', Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `Mesa ${i + 1}`,
            status: 'available',
            area: 'Restaurante' // Default area
        }))),
        customers: loadData('customers', []),
        kitchenOrders: loadData('kitchenOrders', []),
        barOrders: loadData('barOrders', []),
        cancelledKitchenOrders: loadData('cancelledKitchenOrders', []),
        cancelledBarOrders: loadData('cancelledBarOrders', []),
        pendingPayment: loadData('pendingPayment', []), // Orders ready but not yet paid
        // Inventory Entries (Nuevas entradas masivas)
        inventoryEntries: loadData('inventoryEntries', []),
        // Multi-currency & Cash Control
        exchangeRate: loadData('exchangeRate', 60), // Default rate
        rateHistory: loadData('rateHistory', []),
        cashRegister: loadData('cashRegister', {
            isOpen: false,
            openingTime: null,
            openingBalanceBs: 0,
            openingBalanceUsd: 0,
            withdrawalsBs: 0,
            withdrawalsUsd: 0,
            withdrawalComment: '',
            closingTime: null,
            closingBalanceBs: 0,
            closingBalanceUsd: 0,
            status: 'closed' // 'open', 'closed'
        }),
        defaultForeignCurrencyDiscountPercent: loadData('defaultForeignCurrencyDiscountPercent', 0)
    });

    // Migration: If users is empty but personnel exists, migrate credentials
    useEffect(() => {
        if (data.users?.length === 0 && data.personnel?.length > 0) {
            console.log('🔄 Migrating Personnel to System Users...');
            const migratedUsers = data.personnel
                .filter(p => p.pin) // Only migrate if they have a PIN
                .map(p => ({
                    id: `user_${p.id}`,
                    name: p.name,
                    pin: p.pin,
                    role: p.role || 'cashier', // Default role
                    permissions: p.permissions || [],
                    personnelId: p.id // Link back to personnel record
                }));

            if (migratedUsers.length > 0) {
                setData(prev => ({
                    ...prev,
                    users: migratedUsers
                }));
            }
        }
    }, [data.users.length, data.personnel]);

    const [isDriveConnected, setIsDriveConnected] = useState(false);
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error

    // Save to localStorage whenever data changes
    // This ensures all modifications persist immediately
    useEffect(() => {
        console.log('💾 Saving data to localStorage...');
        localStorage.setItem('inventory', JSON.stringify(data.inventory));
        localStorage.setItem('suppliers', JSON.stringify(data.suppliers));
        localStorage.setItem('personnel', JSON.stringify(data.personnel));
        localStorage.setItem('users', JSON.stringify(data.users));
        localStorage.setItem('products', JSON.stringify(data.products));
        localStorage.setItem('categories', JSON.stringify(data.categories));
        localStorage.setItem('sales', JSON.stringify(data.sales));
        localStorage.setItem('heldOrders', JSON.stringify(data.heldOrders));
        localStorage.setItem('cancelledOrders', JSON.stringify(data.cancelledOrders));
        localStorage.setItem('tips', JSON.stringify(data.tips));
        localStorage.setItem('tipHistory', JSON.stringify(data.tipHistory));
        localStorage.setItem('tipDistributions', JSON.stringify(data.tipDistributions));
        // Restaurant Features
        localStorage.setItem('tables', JSON.stringify(data.tables));
        localStorage.setItem('customers', JSON.stringify(data.customers));
        localStorage.setItem('kitchenOrders', JSON.stringify(data.kitchenOrders));
        localStorage.setItem('barOrders', JSON.stringify(data.barOrders));
        // Inventory Entries
        localStorage.setItem('inventoryEntries', JSON.stringify(data.inventoryEntries));
        // Multi-currency & Cash Control
        localStorage.setItem('exchangeRate', JSON.stringify(data.exchangeRate));
        localStorage.setItem('rateHistory', JSON.stringify(data.rateHistory));
        localStorage.setItem('cashRegister', JSON.stringify(data.cashRegister));
        localStorage.setItem('defaultForeignCurrencyDiscountPercent', JSON.stringify(data.defaultForeignCurrencyDiscountPercent));

        // Auto-Sync to Drive (Debounced)
        if (isDriveConnected) {
            // Check if this change was triggered by a remote update
            if (isRemoteUpdate.current) {
                console.log('Skipping auto-upload due to remote update');
                isRemoteUpdate.current = false;
                return;
            }

            setSyncStatus('syncing');
            const timeoutId = setTimeout(async () => {
                try {
                    const backup = {
                        timestamp: new Date().toISOString(),
                        data: data,
                        settings: JSON.parse(localStorage.getItem('appSettings') || '{}')
                    };
                    await googleDriveService.uploadFile('erp_la_autentica_backup_auto.json', backup);
                    setSyncStatus('success');
                    setTimeout(() => setSyncStatus('idle'), 3000);
                } catch (error) {
                    console.error('Auto-sync failed:', error);
                    setSyncStatus('error');
                }
            }, 3000); // 3 seconds debounce

            return () => clearTimeout(timeoutId);
        }

        // --- HYBRID CLOUD SYNC ---
        // Sync sales to Firebase in background (Fire-and-forget style)
        if (data.sales && data.sales.length > 0) {
            // Basic strategy: Sync recently modified sales or just batch all (Firestore handles idempotency)
            // For efficiency, we could track 'unsynced' items, but for now we'll rely on the service to handle it.
            // We use a small debounce to avoid spamming Firestore on every keystroke
            const cloudTimeoutId = setTimeout(() => {
                firebaseSyncService.uploadSalesBatch(data.sales);
            }, 5000); // 5 seconds debounce for cloud
            return () => clearTimeout(cloudTimeoutId);
        }
    }, [data, isDriveConnected]);

    // --- LOCAL SYNC INTEGRATION ---
    const [isLocalServerConnected, setIsLocalServerConnected] = useState(false);

    useEffect(() => {
        // Connect to Local Server on startup
        localSyncService.connect();

        // Subscribe to updates
        const unsubscribe = localSyncService.subscribe((type, payload) => {
            if (type === 'connection_status') {
                setIsLocalServerConnected(payload);
            }
            if (type === 'sync_update') {
                console.log('🔄 Full State Update received from Server');

                // CRITICAL: Check if server state is empty but we have data (First Sync / Migration)
                // If server has no products but we do, we assume we are the Source of Truth and PUSH our data
                const serverHasData = payload.products && payload.products.length > 0;
                const localHasData = data.products && data.products.length > 0;

                if (!serverHasData && localHasData) {
                    console.log('🚀 Server is empty. Pushing Local Data as Source of Truth...');
                    localSyncService.sendFullStateUpdate(data);
                    return; // Don't overwrite local with empty server data
                }

                // Normal Case: Server has data, we sync with it
                // We merge carefully to avoid losing unsaved local work if possible, 
                // but for "Full Sync" usually server wins.
                setData(prev => {
                    // Check timestamps if available to decide winner? 
                    // For now, Server Wins to ensure consistency across devices.
                    return {
                        ...prev,
                        ...payload,
                        // Preserve local-only UI state if any (none currently in data object)
                    };
                });
            }

            // Legacy events (optional, can be removed if full sync is fast enough)
            if (type === 'kitchen_order') {
                // Handled by sync_update usually, but kept for immediate feedback if needed
            }
        });

        return () => unsubscribe();
    }, [data]); // Add data as dependency to allow checking localHasData

    // Trigger sync when ANY data changes
    useEffect(() => {
        if (isLocalServerConnected) {
            // Check if this change was triggered by a remote update (to avoid loops)
            // Ideally we should use a ref flag like isRemoteUpdate, but for now 
            // the server's broadcast exclusion helps.

            const timeoutId = setTimeout(() => {
                console.log('☁️ Auto-syncing full state to Local Server...');
                localSyncService.sendFullStateUpdate(data);
            }, 2000); // 2s debounce
            return () => clearTimeout(timeoutId);
        }
    }, [data, isLocalServerConnected]);


    // Generic Actions
    // Track if the update comes from remote to avoid re-uploading immediately
    const isRemoteUpdate = React.useRef(false);

    const updateData = (section, newData) => {
        setData(prev => ({ ...prev, [section]: newData, lastModified: new Date().toISOString() }));
    };

    const addItem = (section, item) => {
        setData(prev => ({
            ...prev,
            [section]: [...(prev[section] || []), { ...item, id: item.id || Date.now() }],
            lastModified: new Date().toISOString()
        }));
    };

    const updateItem = (section, id, updatedFields) => {
        setData(prev => ({
            ...prev,
            [section]: (prev[section] || []).map(item => item.id === id ? { ...item, ...updatedFields } : item),
            lastModified: new Date().toISOString()
        }));
    };

    const deleteItem = (section, id) => {
        setData(prev => ({
            ...prev,
            [section]: (prev[section] || []).filter(item => item.id !== id),
            lastModified: new Date().toISOString()
        }));
    };

    const clearAllData = () => {
        const emptyData = {
            inventory: [],
            suppliers: [],
            personnel: [],
            users: [], // Critical to prevent crash
            products: [],
            categories: defaultCategories, // Restore default categories
            sales: [],
            heldOrders: [],
            cancelledOrders: [],
            tips: 0,
            tipHistory: [],
            tipDistributions: [],
            tables: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Mesa ${i + 1}`, status: 'available', area: 'Restaurante' })),
            customers: [],
            kitchenOrders: [],
            barOrders: [],
            cancelledKitchenOrders: [],
            cancelledBarOrders: [],
            pendingPayment: [],
            inventoryEntries: [],
            exchangeRate: 60,
            rateHistory: [],
            cashRegister: {
                isOpen: false,
                openingTime: null,
                openingBalanceBs: 0,
                openingBalanceUsd: 0,
                withdrawalsBs: 0,
                withdrawalsUsd: 0,
                withdrawalComment: '',
                closingTime: null,
                closingBalanceBs: 0,
                closingBalanceUsd: 0,
                status: 'closed'
            },
            defaultForeignCurrencyDiscountPercent: 0,
            lastModified: new Date().toISOString()
        };
        setData(emptyData);
        // localStorage update is handled by useEffect
    };

    // Hold Order Functions
    const holdOrder = (cart, note = '', metadata = {}) => {
        const newOrder = {
            id: Date.now(),
            items: cart,
            note: note,
            timestamp: new Date().toISOString(),
            total: cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0),
            status: 'active', // Default status
            isWaitList: metadata.isWaitList || false, // STRICT FLAG: Only true if explicitly "Put on Hold"
            ...metadata // tableId, customerId, createdBy, etc.
        };
        // Use generic addItem to ensure lastModified is updated
        addItem('heldOrders', newOrder);

        // If associated with a table, update table status
        if (metadata.tableId) {
            updateItem('tables', metadata.tableId, { status: 'occupied', currentOrderId: newOrder.id });
        }

        // Sync Real-Time
        if (isLocalServerConnected) {
            localSyncService.sendHeldOrder(newOrder);
        }

        return newOrder.id;
    };

    // New Function to Send to Production (Unified Kitchen)
    const sendOrderToProduction = (cart, note = '', metadata = {}) => {
        // 1. Create the Master Record (Held Order)
        // CRITICAL: isWaitList is FALSE because this is a production order
        const orderId = holdOrder(cart, note, { ...metadata, isWaitList: false });

        // 2. Unify ALL items for Kitchen
        // We no longer split Bar/Kitchen. Everything goes to Kitchen.

        const commonData = {
            sourceOrderId: orderId,
            tableName: metadata.tableName || 'Sin Mesa',
            tableId: metadata.tableId,
            customerId: metadata.customerId,
            customerName: metadata.customerName,
            timestamp: new Date().toISOString(),
            createdBy: metadata.createdBy || 'Unknown',
            status: 'pending',
            priority: metadata.priority || 'normal'
        };

        if (cart.length > 0) {
            const kitchenOrder = {
                id: Date.now() + 1, // unique id
                items: cart, // ALL items
                type: 'kitchen',
                ...commonData
            };
            addItem('kitchenOrders', kitchenOrder);
            if (isLocalServerConnected) localSyncService.sendKitchenOrder(kitchenOrder);
        }

        return orderId;
    };

    const deleteHeldOrder = (orderId) => {
        // Check if it was a table order and free the table
        const order = data.heldOrders.find(o => o.id === orderId);
        if (order && order.tableId) {
            updateItem('tables', order.tableId, { status: 'available', currentOrderId: null });
        }
        deleteItem('heldOrders', orderId);

        // Sync Real-Time deletion
        if (isLocalServerConnected) {
            localSyncService.deleteHeldOrder(orderId);
        }
    };

    // Trash Bin Functions
    const cancelHeldOrder = (orderId) => {
        const order = data.heldOrders.find(o => o.id === orderId);
        if (!order) return;

        // If associated with a table, free the table
        if (order.tableId) {
            updateItem('tables', order.tableId, { status: 'available', currentOrderId: null });
        }

        const cancelledOrder = {
            ...order,
            cancelledAt: new Date().toISOString()
        };

        // Remove from heldOrders and add to cancelledOrders
        setData(prev => ({
            ...prev,
            heldOrders: prev.heldOrders.filter(o => o.id !== orderId),
            cancelledOrders: [...(prev.cancelledOrders || []), cancelledOrder],
            lastModified: new Date().toISOString()
        }));
    };

    const restoreCancelledOrder = (orderId) => {
        const order = data.cancelledOrders.find(o => o.id === orderId);
        if (!order) return;

        // Remove from cancelledOrders and add to heldOrders
        // eslint-disable-next-line no-unused-vars
        const { cancelledAt, ...restoredOrder } = order; // Remove cancelledAt

        setData(prev => ({
            ...prev,
            cancelledOrders: prev.cancelledOrders.filter(o => o.id !== orderId),
            heldOrders: [...prev.heldOrders, restoredOrder],
            lastModified: new Date().toISOString()
        }));
    };

    const permanentlyDeleteOrder = (orderId) => {
        deleteItem('cancelledOrders', orderId);
    };

    // Kitchen/Bar Functions
    const sendToKitchen = (items, tableId, note = '') => {
        const order = {
            id: Date.now(),
            items: items,
            tableId: tableId,
            note: note,
            timestamp: new Date().toISOString(),
            status: 'pending' // pending, ready, delivered
        };

        // 1. Add locally
        addItem('kitchenOrders', order);

        // 2. Try to send to Server (Real-time)
        if (isLocalServerConnected) {
            localSyncService.sendKitchenOrder(order);
        }
    };

    // Exchange Rate Functions
    const updateExchangeRate = (newRate) => {
        const rate = parseFloat(newRate);
        if (!rate || rate <= 0) return;

        const historyEntry = {
            id: Date.now(),
            rate: rate,
            date: new Date().toISOString()
        };

        setData(prev => ({
            ...prev,
            exchangeRate: rate,
            rateHistory: [historyEntry, ...(prev.rateHistory || [])],
            lastModified: new Date().toISOString()
        }));
    };

    // Tip Functions
    const addTip = (amount, source = 'Venta POS') => {
        if (!amount || amount <= 0) return;
        const newTip = {
            id: Date.now(),
            amount: parseFloat(amount),
            source: source,
            timestamp: new Date().toISOString()
        };
        setData(prev => ({
            ...prev,
            tips: (prev.tips || 0) + newTip.amount,
            tipHistory: [newTip, ...(prev.tipHistory || [])],
            lastModified: new Date().toISOString()
        }));
    };

    const distributeTips = () => {
        const totalTips = data.tips || 0;
        if (totalTips === 0) return;

        // Calculate distribution snapshot
        const totalSalary = data.personnel.reduce((acc, curr) => acc + (curr.status === 'Activo' ? curr.salary : 0), 0);

        const distributionSnapshot = data.personnel
            .filter(emp => emp.status === 'Activo')
            .map(emp => ({
                id: emp.id,
                name: emp.name,
                salary: emp.salary,
                percentage: totalSalary > 0 ? (emp.salary / totalSalary) : 0,
                amount: totalSalary > 0 ? (totalTips * (emp.salary / totalSalary)) : 0
            }));

        // Calculate Daily Breakdown from History
        const dailyBreakdown = (data.tipHistory || []).reduce((acc, tip) => {
            const date = new Date(tip.timestamp).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            acc[date] = (acc[date] || 0) + tip.amount;
            return acc;
        }, {});

        const newDistribution = {
            id: Date.now(),
            date: new Date().toISOString(),
            total: totalTips,
            distribution: distributionSnapshot,
            dailyBreakdown: dailyBreakdown,
            transactionCount: (data.tipHistory || []).length
        };

        setData(prev => ({
            ...prev,
            tips: 0,
            tipHistory: [], // Clear current history for next cycle
            tipDistributions: [newDistribution, ...(prev.tipDistributions || [])], // Archive
            lastModified: new Date().toISOString()
        }));
    };

    // Backup & Restore
    const exportData = () => {
        const backup = {
            timestamp: new Date().toISOString(),
            data: data,
            settings: JSON.parse(localStorage.getItem('appSettings') || '{}')
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `erp_la_autentica_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const importData = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                if (backup.data) {
                    // Manual import should overwrite
                    isRemoteUpdate.current = true;
                    setData(backup.data);
                    if (backup.settings) {
                        localStorage.setItem('appSettings', JSON.stringify(backup.settings));
                        // Force reload to apply settings
                        window.location.reload();
                    }
                    alert('Datos restaurados exitosamente.');
                } else {
                    alert('Archivo de respaldo inválido.');
                }
            } catch {
                alert('Error al leer el archivo.');
            }
        };
        reader.readAsText(file);
    };

    const connectDrive = async () => {
        try {
            if (!googleDriveService.isAuthenticated) {
                // Load scripts first if not loaded (simplified for this prototype)
                googleDriveService.loadScripts(async () => {
                    await googleDriveService.signIn();
                    setIsDriveConnected(true);
                    alert('Conectado a Google Drive exitosamente.');
                });
            } else {
                setIsDriveConnected(true);
            }
        } catch (error) {
            console.error('Drive connection failed:', error);
            alert('Error al conectar con Google Drive.');
        }
    };

    const uploadToDrive = async (file, subfolder) => {
        if (!isDriveConnected) {
            alert('Debes conectar Google Drive primero en Configuración.');
            return null;
        }
        try {
            const result = await googleDriveService.uploadBinaryFile(file, 'ERP La Autentica', subfolder);
            return result;
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Error al subir archivo a Drive.');
            return null;
        }
    };

    const syncFromDrive = useCallback(async (silent = false) => {
        if (!isDriveConnected) {
            if (!silent) alert('Conecta Google Drive primero.');
            return;
        }
        if (!silent) setSyncStatus('syncing');
        try {
            const fileId = await googleDriveService.findFile('erp_la_autentica_backup_auto.json');
            if (fileId) {
                const backup = await googleDriveService.downloadFile(fileId);
                if (backup && backup.data) {
                    // Check timestamps to avoid overwriting newer local data with old/same remote data
                    const remoteTime = new Date(backup.timestamp || 0).getTime();
                    const localTime = new Date(data.lastModified || 0).getTime();

                    // Minimum 1 second difference to consider it a change
                    if (remoteTime > localTime + 1000) {
                        console.log('Remote data is newer. Syncing...');
                        // Set flag to prevent immediate re-upload
                        // eslint-disable-next-line react-hooks/immutability
                        isRemoteUpdate.current = true;
                        setData(backup.data);
                        if (backup.settings) {
                            localStorage.setItem('appSettings', JSON.stringify(backup.settings));
                        }
                        setSyncStatus('success');
                        if (!silent) alert('Datos sincronizados desde Drive correctamente.');
                    } else {
                        console.log('Local data is up to date.');
                        // If silent (polling), don't show success or idle, just stay as is
                    }
                    if (!silent) setTimeout(() => setSyncStatus('idle'), 3000);
                }
            } else {
                // No file found
                if (!silent) {
                    setSyncStatus('idle');
                    alert('No se encontró respaldo en Drive.');
                }
            }
        } catch (error) {
            console.error('Sync failed:', error);
            if (!silent) {
                setSyncStatus('error');
                alert('Error al sincronizar desde Drive.');
            }
        }
    }, [isDriveConnected, data.lastModified]);


    // Auto-Polling Effect
    useEffect(() => {
        let intervalId;
        if (isDriveConnected) {
            // Initial poll
            syncFromDrive(true);

            // Poll every 15 seconds
            intervalId = setInterval(() => {
                syncFromDrive(true);
            }, 15000);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isDriveConnected, syncFromDrive]);

    // Fix useEffect dependency
    useEffect(() => {
        if (isLocalServerConnected) {
            const timeoutId = setTimeout(() => {
                localSyncService.sendFullState({
                    sales: data.sales,
                    heldOrders: data.heldOrders,
                    kitchenOrders: data.kitchenOrders,
                    tables: data.tables,
                    barOrders: data.barOrders // Added dependency
                });
            }, 2000);
            return () => clearTimeout(timeoutId);
        }
    }, [data.sales, data.heldOrders, data.kitchenOrders, data.tables, data.barOrders, isLocalServerConnected]);

    // ... (rest of the file)

    return (
        <DataContext.Provider value={{
            data,
            updateData,
            addItem,
            updateItem,
            deleteItem,
            clearAllData,
            exportData,
            importData,
            connectDrive,
            uploadToDrive,
            syncFromDrive,
            isDriveConnected,
            syncStatus,
            holdOrder,
            deleteHeldOrder,
            cancelHeldOrder,
            restoreCancelledOrder,
            permanentlyDeleteOrder,
            addTip,
            distributeTips,
            sendToKitchen, // Keep for backward compatibility if used elsewhere
            sendOrderToProduction, // Export NEW function
            updateExchangeRate,
            isLocalServerConnected
        }}>
            {children}
        </DataContext.Provider>
    );
};
