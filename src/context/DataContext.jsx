import React, { createContext, useState, useContext, useEffect } from 'react';
import { inventoryItems, suppliers, personnel, products } from '../data/mockData';
import { googleDriveService } from '../services/googleDrive';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    // Helper to load from localStorage or fallback to mockData
    // CRITICAL FIX: If isInitialized is true in localStorage, we should NOT fallback to mockData for empty arrays
    // This prevents deleted items from reappearing
    const loadData = (key, fallback) => {
        try {
            const saved = localStorage.getItem(key);
            const isInit = localStorage.getItem('isInitialized');

            if (saved !== null) {
                return JSON.parse(saved);
            }

            // If system was already initialized, and we find no data for a key, return empty array/default instead of mock
            // UNLESS it's the first run ever
            if (isInit && key !== 'isInitialized') {
                if (Array.isArray(fallback)) return [];
                if (typeof fallback === 'number') return 0;
                return fallback;
            }

            return fallback;
        } catch (e) {
            console.error(`Error loading ${key}:`, e);
            return fallback;
        }
    };

    const [data, setData] = useState({
        inventory: loadData('inventory', inventoryItems),
        suppliers: loadData('suppliers', suppliers),
        personnel: loadData('personnel', personnel),
        products: loadData('products', products),
        sales: loadData('sales', []),
        heldOrders: loadData('heldOrders', []),
        tips: loadData('tips', 0),
        tipHistory: loadData('tipHistory', []),
        tipDistributions: loadData('tipDistributions', []),
        isInitialized: loadData('isInitialized', false),
        // Restaurant Features
        tables: loadData('tables', Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Mesa ${i + 1}`, status: 'available' }))),
        customers: loadData('customers', []),
        kitchenOrders: loadData('kitchenOrders', []),
        // Multi-currency & Cash Control
        exchangeRate: loadData('exchangeRate', 60), // Default rate
        rateHistory: loadData('rateHistory', []),
        cashRegister: loadData('cashRegister', {
            isOpen: false,
            openingTime: null,
            openingBalanceBs: 0,
            openingBalanceUsd: 0,
            withdrawals: []
        }),
        defaultForeignCurrencyDiscountPercent: loadData('defaultForeignCurrencyDiscountPercent', 0)
    });

    // One-time initialization to ensure mock data is loaded only once
    useEffect(() => {
        if (!data.isInitialized) {
            setData(prev => ({
                ...prev,
                isInitialized: true
            }));
        }
    }, []);

    const [isDriveConnected, setIsDriveConnected] = useState(false);
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error

    // Save to localStorage whenever data changes
    useEffect(() => {
        localStorage.setItem('inventory', JSON.stringify(data.inventory));
        localStorage.setItem('suppliers', JSON.stringify(data.suppliers));
        localStorage.setItem('personnel', JSON.stringify(data.personnel));
        localStorage.setItem('products', JSON.stringify(data.products));
        localStorage.setItem('sales', JSON.stringify(data.sales));
        localStorage.setItem('heldOrders', JSON.stringify(data.heldOrders));
        localStorage.setItem('tips', JSON.stringify(data.tips));
        localStorage.setItem('tipHistory', JSON.stringify(data.tipHistory));
        localStorage.setItem('tipDistributions', JSON.stringify(data.tipDistributions));
        localStorage.setItem('isInitialized', JSON.stringify(data.isInitialized));
        // Restaurant Features
        localStorage.setItem('tables', JSON.stringify(data.tables));
        localStorage.setItem('customers', JSON.stringify(data.customers));
        localStorage.setItem('kitchenOrders', JSON.stringify(data.kitchenOrders));
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
    }, [data, isDriveConnected]);

    // Generic Actions
    // Track if the update comes from remote to avoid re-uploading immediately
    const isRemoteUpdate = React.useRef(false);

    const updateData = (section, newData) => {
        setData(prev => ({ ...prev, [section]: newData, lastModified: new Date().toISOString() }));
    };

    const addItem = (section, item) => {
        setData(prev => ({
            ...prev,
            [section]: [...(prev[section] || []), { ...item, id: Date.now() }],
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
            products: [],
            sales: [],
            heldOrders: [],
            tips: 0,
            tipHistory: [],
            tables: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Mesa ${i + 1}`, status: 'available' })),
            customers: [],
            kitchenOrders: [],
            exchangeRate: 60,
            cashRegister: {
                isOpen: false,
                openingTime: null,
                openingBalanceBs: 0,
                openingBalanceUsd: 0,
                withdrawals: []
            },
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
            ...metadata // tableId, customerId, etc.
        };
        // Use generic addItem to ensure lastModified is updated
        addItem('heldOrders', newOrder);

        // If associated with a table, update table status
        if (metadata.tableId) {
            updateItem('tables', metadata.tableId, { status: 'occupied', currentOrderId: newOrder.id });
        }

        return newOrder.id;
    };

    const deleteHeldOrder = (orderId) => {
        // Check if it was a table order and free the table
        const order = data.heldOrders.find(o => o.id === orderId);
        if (order && order.tableId) {
            updateItem('tables', order.tableId, { status: 'available', currentOrderId: null });
        }
        deleteItem('heldOrders', orderId);
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
        addItem('kitchenOrders', order);
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
            } catch (error) {
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

    const syncFromDrive = async (silent = false) => {
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
                if (!silent) alert('No se encontró copia de seguridad en Drive.');
                if (!silent) setSyncStatus('idle');
            }
        } catch (error) {
            console.error('Sync download failed:', error);
            if (!silent) setSyncStatus('error');
            // if (!silent) alert('Error al descargar datos de Drive.'); // Don't annoy user on auto-poll
        }
    };

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
    }, [isDriveConnected]);

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
            addTip,
            distributeTips,
            sendToKitchen,
            updateExchangeRate
        }}>
            {children}
        </DataContext.Provider>
    );
};
