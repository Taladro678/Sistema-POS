import { io } from "socket.io-client";

// AUTOMATIC DISCOVERY:
// If running on localhost, use localhost:3001
// If accessed via Network IP (e.g. 192.168.1.15:5173), assume API is on same IP (192.168.1.15:3001)
const getAutoServerUrl = () => {
    const savedUrl = localStorage.getItem('pos_server_url');
    if (savedUrl) return savedUrl;

    // Check if running inside Capacitor (Native App)
    const isNative = window.Capacitor?.isNative || window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
    if (isNative) {
        return `http://127.0.0.1:3001`;
    }

    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3001`;
};

const SERVER_URL = getAutoServerUrl();

class LocalSyncService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.subscribers = [];
        this.syncInterval = null;
        this.serverInfo = null; // Store server info
    }

    getSuggestedUrl() {
        return getAutoServerUrl();
    }

    getServerInfo() {
        return this.serverInfo;
    }

    connect(serverUrl) {
        if (this.socket) return;

        const urlToUse = serverUrl || getAutoServerUrl();

        console.log('🔌 Connecting to Local Sync Server:', urlToUse);
        this.socket = io(urlToUse, {
            reconnectionAttempts: Infinity, // Keep trying forever until server starts
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ['websocket', 'polling'], // Try websocket first
            autoConnect: true
        });

        this.socket.on("connect_error", (err) => {
            // Suppress loud errors for cloud-only users
            console.debug("Local sync server not found (using cloud only):", err.message);
        });

        this.socket.on("connect", () => {
            console.log("✅ Connected to Local Server");
            this.isConnected = true;
            this.notifySubscribers('connection_status', true);
        });

        this.socket.on("disconnect", () => {
            console.log("❌ Disconnected from Local Server");
            this.isConnected = false;
            this.notifySubscribers('connection_status', false);
        });

        this.socket.on("server_info", (info) => {
            console.log('ℹ️ Server Info received:', info);
            this.serverInfo = info;
            this.notifySubscribers('server_info', info);
        });

        // Listen for specific updates
        this.socket.on("kitchen_order_received", (order) => {
            this.notifySubscribers('kitchen_order', order);
        });

        this.socket.on("sync_updated_needed", () => {
            this.notifySubscribers('sync_needed', null);
        });

        this.socket.on("sync_update", (data) => {
            this.notifySubscribers('sync_update', data);
        });

        this.socket.on("remote_cart_update", (data) => {
            this.notifySubscribers('remote_cart_update', data);
        });
    }

    // Subscribe to events
    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    notifySubscribers(type, payload) {
        this.subscribers.forEach(cb => cb(type, payload));
    }

    // Actions
    sendActiveCartUpdate(cartData) {
        if (this.socket && this.isConnected) {
            this.socket.emit("active_cart_update", cartData);
            return true;
        }
        return false;
    }

    sendKitchenOrder(order) {
        if (this.socket && this.isConnected) {
            this.socket.emit("new_kitchen_order", order);
            return true;
        }
        return false;
    }

    sendHeldOrder(order) {
        if (this.socket && this.isConnected) {
            this.socket.emit("add_held_order", order);
            return true;
        }
        return false;
    }

    deleteHeldOrder(orderId) {
        if (this.socket && this.isConnected) {
            this.socket.emit("delete_held_order", orderId);
            return true;
        }
        return false;
    }

    sendFullStateUpdate(state) {
        if (this.socket && this.isConnected) {
            this.socket.emit("full_state_update", state);
            return true;
        }
        return false;
    }

    async syncData(localData) {
        if (!this.isConnected) return null;

        try {
            const response = await fetch(`${SERVER_URL}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientData: localData,
                    lastSyncTime: new Date().toISOString()
                })
            });
            const result = await response.json();
            return result.success ? result.serverData : null;
        } catch (e) {
            console.error("Sync API Failed", e);
            return null;
        }
    }
}

export const localSyncService = new LocalSyncService();
