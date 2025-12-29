import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Coffee, Clock, CheckCircle, AlertCircle, X } from 'lucide-react';

/**
 * PÁGINA: BarPage - Pantalla de Barra
 * 
 * FUNCIONALIDAD:
 * - Muestra las órdenes de bebidas (jugos, café, licores)
 * - Permite cambiar estado: Pendiente → En Preparación → Listo
 * - Notificación sonora cuando llega orden nueva
 * - Muestra tiempo transcurrido
 */

export const BarPage = () => {
    const { data, updateItem, deleteItem, addItem } = useData();
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [viewMode, setViewMode] = useState('active'); // 'active' | 'cancelled'
    const lastOrderCountRef = useRef(0);
    const barOrders = useMemo(() => data.barOrders || [], [data.barOrders]);
    const cancelledBarOrders = useMemo(() => data.cancelledBarOrders || [], [data.cancelledBarOrders]);

    const playNotificationSound = () => {
        try {
            // Sonido de notificación simple
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGe87OmfTQwRUKfk772hxJXPj+tR4m0TQYd7u44E');
            audio.play().catch(e => console.log('No se pudo reproducir sonido:', e));
        } catch (e) {
            console.log('Error al reproducir sonido:', e);
        }
    };

    // Sonido de notificación cuando llega orden nueva
    useEffect(() => {
        if (barOrders.length > lastOrderCountRef.current && lastOrderCountRef.current > 0) {
            playNotificationSound();
        }
        lastOrderCountRef.current = barOrders.length;
    }, [barOrders.length]);

    const handleStatusChange = (orderId, newStatus) => {
        if (newStatus === 'completed') {
            // When marked as ready, update the source heldOrder
            const order = barOrders.find(o => o.id === orderId);
            if (order && order.sourceOrderId) {
                // Update the held order status to "ready"
                updateItem('heldOrders', order.sourceOrderId, {
                    status: 'ready',
                    completedAt: new Date().toISOString()
                });
            }
            // Remove from bar
            deleteItem('barOrders', orderId);
        } else {
            // For other status changes (pending -> in-progress)
            updateItem('barOrders', orderId, { status: newStatus });
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
            case 'in-progress': return 'Preparando';
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

    const filteredOrders = useMemo(() => {
        let result = selectedStatus === 'all'
            ? barOrders
            : barOrders.filter(o => o.status === selectedStatus);

        const priorityScore = { high: 3, priority: 2, normal: 1 };
        return [...result].sort((a, b) => {
            const scoreA = priorityScore[a.priority] || 1;
            const scoreB = priorityScore[b.priority] || 1;
            if (scoreA !== scoreB) return scoreB - scoreA;
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
    }, [barOrders, cancelledBarOrders, selectedStatus, viewMode]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Coffee size={32} color="var(--accent-blue)" />
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Barra</h1>
                    {barOrders.length > 0 && (
                        <span style={{
                            background: 'var(--accent-blue)',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '1rem',
                            fontWeight: 'bold'
                        }}>
                            {barOrders.length}
                        </span>
                    )}
                </div>

                {/* Filtros */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className={`glass-button ${selectedStatus === 'all' ? 'primary' : ''}`}
                        onClick={() => setSelectedStatus('all')}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                    >
                        Todas ({barOrders.length})
                    </button>
                    <button
                        className={`glass-button ${selectedStatus === 'pending' ? 'accent' : ''}`}
                        onClick={() => setSelectedStatus('pending')}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                    >
                        Pendientes ({barOrders.filter(o => o.status === 'pending').length})
                    </button>
                </div>
            </div>

            {/* Órdenes Grid */}
            {filteredOrders.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <CheckCircle size={64} color="var(--accent-green)" style={{ margin: '0 auto 1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Barra Despejada</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>No hay bebidas pendientes</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '1rem',
                    overflowY: 'auto',
                    paddingRight: '0.5rem'
                }}>
                    {filteredOrders.map(order => {
                        const priorityInfo = getPriorityData(order.priority);
                        return (
                            <div
                                key={order.id}
                                className="glass-panel"
                                style={{
                                    padding: '1.25rem',
                                    border: `2px solid ${order.priority === 'high' ? '#ef4444' : getStatusColor(order.status)}`,
                                    background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
                                    position: 'relative',
                                    animation: order.priority === 'high' || order.status === 'pending' ? 'pulse 2.5s infinite' : 'none',
                                }}
                            >
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
                                        zIndex: 10
                                    }}>
                                        {priorityInfo.label}
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 'bold' }}>{order.tableName}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <Clock size={14} color="var(--text-secondary)" />
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{getTimeElapsed(order.timestamp)}</span>
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        background: getStatusColor(order.status),
                                        color: 'white'
                                    }}>
                                        {getStatusLabel(order.status)}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem', marginTop: '-0.5rem' }}>
                                    Creado por: {order.createdBy || 'Sistema'}
                                </div>

                                <div style={{ marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                    {order.items.map((item, idx) => (
                                        <div key={idx} style={{ padding: '0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                                            <div>
                                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.quantity}x</span>
                                                <span style={{ marginLeft: '0.5rem', fontSize: '1rem' }}>{item.name}</span>
                                            </div>
                                            {item.note && <span style={{ fontSize: '0.8rem', color: 'var(--accent-orange)', fontStyle: 'italic' }}>{item.note}</span>}
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {order.status === 'pending' && (
                                        <button className="glass-button primary" onClick={() => handleStatusChange(order.id, 'in-progress')} style={{ flex: 1 }}>
                                            ☕ Comenzar
                                        </button>
                                    )}
                                    {order.status === 'in-progress' && (
                                        <button className="glass-button accent" onClick={() => handleStatusChange(order.id, 'completed')} style={{ flex: 1 }}>
                                            ✓ Listo
                                        </button>
                                    )}
                                    <button className="glass-button" onClick={() => { if (window.confirm('¿Cancelar?')) deleteItem('barOrders', order.id); }} style={{ color: 'var(--accent-red)' }}>
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
