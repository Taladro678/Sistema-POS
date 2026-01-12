import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { googleDriveService } from '../services/googleDrive';
import { localSyncService } from '../services/localSync';
import { audioService } from '../services/audioService';
import { useDialog } from './DialogContext';

const DataContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { alert } = useDialog();
    const loadData = (key, fallback) => {
        try {
            const saved = localStorage.getItem(key);
            return saved !== null ? JSON.parse(saved) : fallback;
        } catch (e) {
            console.error(`❌ Error loading ${key}:`, e);
            return fallback;
        }
    };

    const defaultCategories = [
        { id: 'bebidas', label: 'Bebidas', keywords: ['bebida', 'refresco', 'jugo', 'agua', 'cerveza', 'licor'] },
        { id: 'comida', label: 'Comida', keywords: ['hamburguesa', 'pizza', 'pollo', 'carne', 'papas'] },
        { id: 'sopas', label: 'Sopas', keywords: ['sopa', 'caldo', 'crema'] },
        { id: 'dulces', label: 'Dulces', keywords: ['postre', 'dulce', 'helado', 'torta'] }
    ];

    const [data, setData] = useState({
        inventory: loadData('inventory', []),
        suppliers: loadData('suppliers', []),
        personnel: loadData('personnel', []),
        users: loadData('users', []),
        products: loadData('products', []),
        categories: loadData('categories', defaultCategories),
        sales: loadData('sales', []),
        heldOrders: loadData('heldOrders', []),
        cancelledOrders: loadData('cancelledOrders', []),
        tips: loadData('tips', 0),
        tipHistory: loadData('tipHistory', []),
        tipDistributions: loadData('tipDistributions', []),
        tables: loadData('tables', Array.from({ length: 10 }, (_, i) => ({
            id: i + 1, name: `Mesa ${i + 1}`, status: 'available', area: 'Restaurante'
        }))),
        customers: loadData('customers', []),
        kitchenOrders: loadData('kitchenOrders', []),
        barOrders: loadData('barOrders', []),
        cancelledKitchenOrders: loadData('cancelledKitchenOrders', []),
        cancelledBarOrders: loadData('cancelledBarOrders', []),
        pendingPayment: loadData('pendingPayment', []),
        inventoryEntries: loadData('inventoryEntries', []),
        exchangeRate: loadData('exchangeRate', 60),
        rateHistory: loadData('rateHistory', []),
        cashRegister: loadData('cashRegister', {
            isOpen: false, status: 'closed', openingBalanceBs: 0, openingBalanceUsd: 0
        }),
        expenses: loadData('expenses', []),
        debts: loadData('debts', []),
        accountsReceivable: loadData('accountsReceivable', []),
        defaultForeignCurrencyDiscountPercent: loadData('defaultForeignCurrencyDiscountPercent', 0),
        lastModified: new Date().toISOString(),
        serverInfo: null
    });

    const [isDriveConnected] = useState(false);
    const [syncStatus, setSyncStatus] = useState('idle');
    const isRemoteUpdate = useRef(false);
    const [isLocalServerConnected, setIsLocalServerConnected] = useState(false);
    const previousReadyCountRef = useRef(0);

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
                if (payload.products?.length > 0 || !data.products?.length) {
                    setData(prev => ({ ...prev, ...payload }));
                } else {
                    localSyncService.sendFullStateUpdate(data);
                }
            }
            if (type === 'server_info') setData(prev => ({ ...prev, serverInfo: payload }));
        });
        return () => unsubscribe();
    }, [data]);

    // Notificación sonora cuando un pedido está listo
    useEffect(() => {
        const readyOrders = data.heldOrders?.filter(o => o.status === 'ready') || [];

        if (readyOrders.length > previousReadyCountRef.current && previousReadyCountRef.current > 0) {
            // Nuevo pedido listo - reproducir sonido
            audioService.playOrderReadySound();
        }

        previousReadyCountRef.current = readyOrders.length;
    }, [data.heldOrders]);

    useEffect(() => {
        if (isLocalServerConnected) {
            const timeoutId = setTimeout(() => {
                localSyncService.sendFullStateUpdate(data);
            }, 2000);
            return () => clearTimeout(timeoutId);
        }
    }, [data, isLocalServerConnected]);

    // Acciones
    const updateData = (section, newData) => setData(prev => ({ ...prev, [section]: newData, lastModified: new Date().toISOString() }));

    const addItem = (section, item) => setData(prev => ({
        ...prev,
        [section]: [...(prev[section] || []), { ...item, id: item.id || Date.now() }],
        lastModified: new Date().toISOString()
    }));

    const updateItem = (section, id, fields) => setData(prev => ({
        ...prev,
        [section]: prev[section].map(item => item.id === id ? { ...item, ...fields } : item),
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

    const updateExchangeRate = (rate) => {
        const val = parseFloat(rate);
        if (val > 0) setData(prev => ({
            ...prev, exchangeRate: val,
            rateHistory: [{ id: Date.now(), rate: val, date: new Date().toISOString() }, ...prev.rateHistory],
            lastModified: new Date().toISOString()
        }));
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
            tables: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Mesa ${i + 1}`, status: 'available', area: 'Restaurante' })),
            customers: [], kitchenOrders: [], barOrders: [], cancelledKitchenOrders: [],
            cancelledBarOrders: [], pendingPayment: [], inventoryEntries: [],
            exchangeRate: 60, rateHistory: [], cashRegister: { isOpen: false, status: 'closed' },
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
            holdOrder, deleteHeldOrder, cancelHeldOrder, addTip,
            sendOrderToProduction, updateExchangeRate, isLocalServerConnected,
            serverInfo: data.serverInfo
        }}>
            {children}
        </DataContext.Provider>
    );
};
