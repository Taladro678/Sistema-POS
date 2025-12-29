import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ChefHat, Clock, CheckCircle, AlertCircle, X } from 'lucide-react';

/**
 * PÁGINA: KitchenPage - Pantalla de Cocina/Barra
 * 
 * FUNCIONALIDAD:
 * - Muestra todas las órdenes pendientes de las mesas
 * - Permite cambiar estado: Pendiente → En Preparación → Listo
 * - Notificación sonora cuando llega orden nueva
 * - Muestra tiempo transcurrido desde que se envió
 * - Actualización en tiempo real
 */

export const KitchenPage = () => {
    const { data, updateItem, deleteItem, addItem } = useData();
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [viewMode, setViewMode] = useState('active'); // 'active' | 'cancelled'
    const lastOrderCountRef = useRef(0);
    const kitchenOrders = useMemo(() => data.kitchenOrders || [], [data.kitchenOrders]);
    const cancelledKitchenOrders = useMemo(() => data.cancelledKitchenOrders || [], [data.cancelledKitchenOrders]);

    const playNotificationSound = () => {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGe87OmfTQwRUKfk772hxJXPj+tR4m0TQYd7u44E');
            audio.play().catch(e => console.log('No se pudo reproducir sonido:', e));
        } catch (e) {
            console.log('Error al reproducir sonido:', e);
        }
    };

    // Sonido de notificación cuando llega orden nueva
    useEffect(() => {
        if (kitchenOrders.length > lastOrderCountRef.current && lastOrderCountRef.current > 0) {
            // Nueva orden recibida
            playNotificationSound();
        }
        lastOrderCountRef.current = kitchenOrders.length;
    }, [kitchenOrders.length]);

    const handleStatusChange = (orderId, newStatus) => {
        if (newStatus === 'completed') {
            // When marked as ready, update the source heldOrder
            const order = kitchenOrders.find(o => o.id === orderId);
            if (order && order.sourceOrderId) {
                // Update the held order status to "ready"
                updateItem('heldOrders', order.sourceOrderId, {
                    status: 'ready',
                    completedAt: new Date().toISOString()
                });
            }
            // Remove from kitchen
            deleteItem('kitchenOrders', orderId);
        } else {
            // For other status changes (pending -> in-progress)
            updateItem('kitchenOrders', orderId, { status: newStatus });
        }
    };

    const getTimeElapsed = (timestamp) => {
        const now = new Date();
        const orderTime = new Date(timestamp);
        const diffMs = now - orderTime;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Recién llegada';
        if (diffMins === 1) return '1 minuto';
        if (diffMins < 60) return `${diffMins} minutos`;

        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        return `${diffHours}h ${remainingMins}m`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'var(--accent-orange)';
            case 'in-progress': return 'var(--accent-blue)';
            case 'completed': return 'var(--accent-green)';
            default: return 'var(--text-secondary)';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return 'Pendiente';
            case 'in-progress': return 'En Preparación';
            case 'completed': return 'Listo';
            default: return 'Desconocido';
        }
    };

    const getPriorityData = (priority) => {
        switch (priority) {
            case 'high': return { label: 'ALTA PRIORIDAD', color: '#ef4444' };
            case 'priority': return { label: 'PRIORIDAD', color: '#f59e0b' };
            default: return { label: 'NORMAL', color: '#94a3b8' };
        }
    };

    const handleCancelOrder = (orderId) => {
        const order = kitchenOrders.find(o => o.id === orderId);
        if (order && window.confirm('¿Cancelar esta orden de cocina?')) {
            const cancelledOrder = {
                ...order,
                cancelledAt: new Date().toISOString()
            };
            addItem('cancelledKitchenOrders', cancelledOrder);
            deleteItem('kitchenOrders', orderId);
        }
    };

    const handleRestoreOrder = (orderId) => {
        const order = cancelledKitchenOrders.find(o => o.id === orderId);
        if (order && window.confirm('¿Restaurar esta orden a cocina?')) {
            const { cancelledAt: _cancelledAt, ...restoredOrder } = order;
            addItem('kitchenOrders', restoredOrder);
            deleteItem('cancelledKitchenOrders', orderId);
        }
    };

    const filteredOrders = useMemo(() => {
        const orders = viewMode === 'active' ? kitchenOrders : cancelledKitchenOrders;
        let result = selectedStatus === 'all'
            ? orders
            : orders.filter(o => o.status === selectedStatus);

        // Sort by priority first, then by timestamp
        const priorityScore = { high: 3, priority: 2, normal: 1 };
        return [...result].sort((a, b) => {
            const scoreA = priorityScore[a.priority] || 1;
            const scoreB = priorityScore[b.priority] || 1;
            if (scoreA !== scoreB) return scoreB - scoreA;
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
    }, [kitchenOrders, cancelledKitchenOrders, selectedStatus, viewMode]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', padding: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ChefHat size={28} color="var(--accent-orange)" />
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Cocina</h1>
                    {kitchenOrders.length > 0 && (
                        <span style={{
                            background: 'var(--accent-red)',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold'
                        }}>
                            {kitchenOrders.length}
                        </span>
                    )}
                </div>

                {/* View Mode Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        className={`glass-button ${viewMode === 'active' ? 'primary' : ''}`}
                        onClick={() => setViewMode('active')}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    >
                        Activas ({kitchenOrders.length})
                    </button>
                    <button
                        className={`glass-button ${viewMode === 'cancelled' ? 'primary' : ''}`}
                        onClick={() => setViewMode('cancelled')}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    >
                        Canceladas ({cancelledKitchenOrders.length})
                    </button>
                </div>

                {/* Filtros */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
                    <button
                        className={`glass-button ${selectedStatus === 'all' ? 'primary' : ''}`}
                        onClick={() => setSelectedStatus('all')}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    >
                        Todas ({viewMode === 'active' ? kitchenOrders.length : cancelledKitchenOrders.length})
                    </button>
                    <button
                        className={`glass-button ${selectedStatus === 'pending' ? 'accent' : ''}`}
                        onClick={() => setSelectedStatus('pending')}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderColor: 'var(--accent-orange)' }}
                    >
                        Pendientes ({viewMode === 'active' ? kitchenOrders.filter(o => o.status === 'pending').length : 0})
                    </button>
                    <button
                        className={`glass-button ${selectedStatus === 'in-progress' ? 'accent' : ''}`}
                        onClick={() => setSelectedStatus('in-progress')}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderColor: 'var(--accent-blue)' }}
                    >
                        En Preparación ({viewMode === 'active' ? kitchenOrders.filter(o => o.status === 'in-progress').length : 0})
                    </button>
                </div>
            </div>

            {/* Órdenes Grid */}
            {filteredOrders.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <CheckCircle size={64} color="var(--accent-green)" style={{ margin: '0 auto 1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No hay órdenes {selectedStatus !== 'all' ? getStatusLabel(selectedStatus).toLowerCase() : ''}</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Las nuevas órdenes aparecerán aquí automáticamente</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1rem',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    paddingRight: '0.5rem',
                    width: '100%'
                }}>
                    {filteredOrders.map(order => {
                        const priorityInfo = getPriorityData(order.priority);
                        return (
                            <div
                                key={order.id}
                                className="glass-panel"
                                style={{
                                    padding: '0.75rem',
                                    border: `2px solid ${order.priority === 'high' ? '#ef4444' : getStatusColor(order.status)}`,
                                    background: order.priority === 'high'
                                        ? `linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(0,0,0,0.6))`
                                        : `linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))`,
                                    position: 'relative',
                                    animation: order.priority === 'high' || order.status === 'pending' ? 'pulse 2s infinite' : 'none',
                                    boxShadow: order.priority === 'high' ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none',
                                    overflow: 'hidden',
                                    wordWrap: 'break-word'
                                }}
                            >
                                {/* Priority Badge Layer */}
                                {order.priority !== 'normal' && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-10px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: priorityInfo.color,
                                        color: '#000',
                                        padding: '0.2rem 1rem',
                                        borderRadius: '10px',
                                        fontSize: '0.7rem',
                                        fontWeight: '900',
                                        zIndex: 10,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }}>
                                        {priorityInfo.label}
                                    </div>
                                )}

                                {/* Header de la orden */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {order.tableName}
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <Clock size={12} color="var(--text-secondary)" />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {getTimeElapsed(order.timestamp)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Badge de estado */}
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: '20px',
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        background: getStatusColor(order.status),
                                        color: 'white',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {getStatusLabel(order.status)}
                                    </div>
                                </div>

                                {/* Items de la orden */}
                                <div style={{ marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                    {order.items.map((item, idx) => {
                                        const itemPriority = getPriorityData(item.priority);
                                        return (
                                            <div key={idx} style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                padding: '0.5rem 0',
                                                borderBottom: idx < order.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                            {item.quantity}x
                                                        </span>
                                                        <span style={{ marginLeft: '0.5rem', fontSize: '1rem' }}>
                                                            {item.name}
                                                        </span>
                                                        {item.priority && item.priority !== 'normal' && (
                                                            <span style={{
                                                                marginLeft: '0.5rem',
                                                                background: itemPriority.color,
                                                                color: '#000',
                                                                padding: '0.1rem 0.4rem',
                                                                borderRadius: '4px',
                                                                fontSize: '0.65rem',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                {itemPriority.label.split(' ')[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.note && (
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-orange)', fontStyle: 'italic' }}>
                                                            {item.note}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Botones de acción */}
                                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', width: '100%' }}>
                                    {order.status === 'pending' && (
                                        <button
                                            className="glass-button accent"
                                            onClick={() => handleStatusChange(order.id, 'in-progress')}
                                            style={{
                                                width: '100%',
                                                padding: '0.6rem',
                                                fontSize: '0.85rem',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            🔥 Iniciar
                                        </button>
                                    )}

                                    {order.status === 'in-progress' && (
                                        <button
                                            className="glass-button primary"
                                            onClick={() => handleStatusChange(order.id, 'completed')}
                                            style={{
                                                width: '100%',
                                                padding: '0.6rem',
                                                fontSize: '0.85rem',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            ✓ Listo
                                        </button>
                                    )}

                                    {/* Cancel or Restore Button */}
                                    {viewMode === 'active' ? (
                                        <button
                                            className="glass-button"
                                            onClick={() => handleCancelOrder(order.id)}
                                            style={{
                                                width: '100%',
                                                padding: '0.6rem',
                                                fontSize: '0.85rem',
                                                borderColor: 'var(--accent-red)',
                                                color: 'var(--accent-red)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <X size={16} />
                                            <span>Cancelar</span>
                                        </button>
                                    ) : (
                                        <button
                                            className="glass-button primary"
                                            onClick={() => handleRestoreOrder(order.id)}
                                            style={{
                                                width: '100%',
                                                padding: '0.6rem',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <CheckCircle size={16} />
                                            <span>Restaurar</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CSS para animación */}
            <style>{`
                @keyframes pulse {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
                    }
                    50% {
                        box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
                    }
                }
            `}</style>
        </div>
    );
};


