import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useDialog } from '../context/DialogContext';
import { Users, Coffee, CheckCircle, Clock, Edit2, Plus, Trash2, LayoutGrid, History, ShoppingBag, Flag } from 'lucide-react';
import Modal from '../components/Modal';

export const OrdersPage = () => {
    const { data, updateItem, addItem, deleteItem, cancelHeldOrder, activeCarts = {} } = useData();
    const { confirm } = useDialog();
    const navigate = useNavigate();
    const tables = data.tables || [];

    const [selectedArea, setSelectedArea] = useState('Todas'); // 'Todas', 'Restaurante', 'Quesera', 'Patio'
    const [viewMode, setViewMode] = useState('tables'); // 'tables', 'orders', 'active_carts'
    const [editingTable, setEditingTable] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
    const [orderToAssignTable, setOrderToAssignTable] = useState(null);

    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Form States
    const [tableName, setTableName] = useState('');
    const [tableArea, setTableArea] = useState('Restaurante');

    const areas = ['Restaurante', 'Quesera', 'Patio', 'Barra Restaurante', 'Barra Quesera'];

    // Filtered Tables
    const filteredTables = selectedArea === 'Todas'
        ? tables
        : tables.filter(t => (t.area || 'Restaurante') === selectedArea);

    const handleTableClick = (table) => {
        navigate(`/?tableId=${table.id}`);
    };

    const handleEditClick = (e, table) => {
        e.stopPropagation();
        setEditingTable(table);
        setTableName(table.name);
        setTableArea(table.area || 'Restaurante');
    };

    const handleCancelOrder = async (e, table) => {
        e.stopPropagation();
        if (table.status !== 'occupied') return;

        const ok = await confirm({
            title: 'Cancelar Pedido',
            message: `¿Estás seguro de CANCELAR el pedido de la ${table.name}? Esta acción no se puede deshacer y liberará la mesa.`
        });

        if (ok) {
            if (table.currentOrderId) {
                cancelHeldOrder(table.currentOrderId);
            } else {
                updateItem('tables', table.id, { status: 'available', currentOrderId: null });
            }
        }
    };

    const handleSaveEdit = () => {
        if (editingTable && tableName.trim()) {
            updateItem('tables', editingTable.id, {
                name: tableName.trim(),
                area: tableArea
            });
            setEditingTable(null);
        }
    };

    const handleDeleteTable = async () => {
        if (editingTable) {
            const ok = await confirm({
                title: 'Eliminar Mesa',
                message: `¿Estás seguro de eliminar "${editingTable.name}"?`
            });
            if (ok) {
                deleteItem('tables', editingTable.id);
                setEditingTable(null);
            }
        }
    };

    const handleAddTable = () => {
        if (tableName.trim()) {
            const newTable = {
                id: Date.now(),
                name: tableName.trim(),
                area: tableArea,
                status: 'available',
                currentOrder: []
            };
            addItem('tables', newTable);
            setIsAddModalOpen(false);
            setTableName('');
            setTableArea('Restaurante');
        }
    };

    const openAddModal = () => {
        setTableName(`Mesa ${tables.length + 1}`);
        setTableArea(selectedArea === 'Todas' ? 'Restaurante' : selectedArea);
        setIsAddModalOpen(true);
    };

    // Helper to take active cart
    const handleTakeActiveCart = async (remoteUserId, remoteCart) => {
        const ok = await confirm({
            title: 'Copiar Carrito',
            message: `¿Deseas copiar los items del carrito de "${remoteCart.username}" a tu sesión actual?`
        });

        if (ok) {
            // Save to local storage as POS cart
            localStorage.setItem('pos_cart', JSON.stringify(remoteCart.cart));
            navigate('/');
        }
    };

    return (
        <div style={{ padding: isMobile ? '1rem' : '1.5rem', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header Area */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                marginBottom: '0.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Coffee className="text-orange-400" size={isMobile ? 24 : 32} />
                        {isMobile ? 'Mesas y Pedidos' : 'Gestión de Pedidos'}
                    </h1>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setIsTrashModalOpen(true)}
                            className="glass-button"
                            style={{ padding: '0.5rem', height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Historial de Pedidos"
                        >
                            <History size={18} />
                        </button>

                        <button
                            onClick={openAddModal}
                            className="glass-button primary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: isMobile ? '0.2rem 0.6rem' : '0.5rem 1rem',
                                fontSize: isMobile ? '0.8rem' : '0.9rem',
                                height: '36px'
                            }}
                        >
                            <Plus size={16} />
                            <span>Nueva Mesa</span>
                        </button>
                    </div>
                </div>

                {/* Status Legend - Hidden on Mobile */}
                {!isMobile && (
                    <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        justifyContent: 'flex-end',
                        padding: '0.5rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e' }}></div>
                            <span style={{ opacity: 0.8 }}>Libre</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 5px #ef4444' }}></div>
                            <span style={{ opacity: 0.8 }}>Ocupada</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 5px #f59e0b' }}></div>
                            <span style={{ opacity: 0.8 }}>Reservada</span>
                        </div>
                    </div>
                )}
            </div>

            {/* View Mode Toggle & Area Filters Integrated */}
            <div className={`no-scrollbar ${isMobile ? 'grid grid-cols-2' : 'flex'}`} style={{
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                marginBottom: '1.25rem',
                flexShrink: 0
            }}>
                <button
                    onClick={() => setViewMode('tables')}
                    className={`glass-button ${viewMode === 'tables' ? 'primary' : ''}`}
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', whiteSpace: 'nowrap', borderRadius: '10px' }}
                >
                    Mesas
                </button>
                <button
                    onClick={() => setViewMode('orders')}
                    className={`glass-button ${viewMode === 'orders' ? 'primary' : ''}`}
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', whiteSpace: 'nowrap', borderRadius: '10px' }}
                >
                    Pedidos ({(data.heldOrders || []).filter(o => !o.isProduction || o.status === 'ready').length})
                </button>

                <button
                    onClick={() => setViewMode('active_carts')}
                    className={`glass-button ${viewMode === 'active_carts' ? 'primary' : ''}`}
                    style={{
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        borderRadius: '10px',
                        gridColumn: isMobile ? 'span 2' : 'auto',
                        border: viewMode === 'active_carts' ? '1px solid var(--accent-orange)' : '1px solid rgba(255,165,0,0.3)',
                        color: viewMode === 'active_carts' ? 'white' : 'var(--accent-orange)'
                    }}
                >
                    Carritos Activos ({Object.keys(activeCarts).length})
                </button>

                {viewMode === 'tables' && (
                    <div className={`no-scrollbar ${isMobile ? 'col-span-2 flex' : 'flex'}`} style={{ gap: '0.5rem', overflowX: 'auto' }}>
                        {!isMobile && <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }}></div>}
                        {['Todas', ...areas].map(area => (
                            <button
                                key={area}
                                onClick={() => setSelectedArea(area)}
                                className={`glass-button ${selectedArea === area ? 'active' : ''}`}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.75rem',
                                    whiteSpace: 'nowrap',
                                    borderRadius: '10px',
                                    border: selectedArea === area ? '1px solid var(--accent-blue)' : '1px solid transparent',
                                    background: selectedArea === area ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255,255,255,0.05)'
                                }}
                            >
                                {area}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content Logic */}
            {viewMode === 'tables' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 pb-20">
                    {filteredTables.map(table => (
                        <div
                            key={table.id}
                            onClick={() => handleTableClick(table)}
                            className={`
                            relative group p-4 rounded-xl border backdrop-blur-md transition-all duration-300
                            hover:scale-[1.02] hover:shadow-lg cursor-pointer flex flex-col justify-between h-[180px]
                            ${table.status === 'occupied' ? 'border-red-500/30 bg-red-500/10' :
                                    table.status === 'reserved' ? 'border-amber-500/30 bg-amber-500/10' :
                                        'border-green-500/30 bg-green-500/10'}`}
                        >
                            {/* Status Indicator Dot */}
                            < div className={`
                            absolute top-3 right-3 w-3 h-3 rounded-full shadow-[0_0_8px]
                            ${table.status === 'occupied' ? 'bg-red-500 shadow-red-500/50' :
                                    table.status === 'reserved' ? 'bg-amber-500 shadow-amber-500/50' :
                                        'bg-green-500 shadow-green-500/50'}`}></div>

                            {/* Top Left: Cancel Order Button (Only when Occupied) */}
                            {table.status === 'occupied' && (
                                <button
                                    onClick={(e) => handleCancelOrder(e, table)}
                                    className="absolute top-3 left-3 p-1.5 rounded-full hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors z-20"
                                    title="Cancelar Pedido y Liberar Mesa"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}

                            {/* Table Name & Area */}
                            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold', color: 'white' }}>
                                    {table.name}
                                </h3>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    fontSize: '0.7rem',
                                    color: 'rgba(255,255,255,0.8)'
                                }}>
                                    <LayoutGrid size={12} />
                                    {table.area || 'Restaurante'}
                                </div>
                            </div>

                            {/* Order Info (if occupied) */}
                            {table.status === 'occupied' && (
                                <div className="mt-auto pt-3 border-t border-white/10 flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-1.5 text-white/70">
                                        <Clock size={14} />
                                        <span>
                                            {table.occupiedAt ? new Date(table.occupiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </div>
                                    <div className="font-medium text-white">
                                        ${table.total?.toLocaleString() || '0'}
                                    </div>
                                </div>
                            )}

                            {/* Available/Reserved State Info */}
                            {table.status !== 'occupied' && (
                                <div className="mt-auto pt-3 border-t border-white/10 text-center">
                                    <span className={`text-sm font-medium ${table.status === 'reserved' ? 'text-amber-400' : 'text-green-400'}`}>
                                        {table.status === 'reserved' ? 'Reservada' : 'Disponible'}
                                    </span>
                                </div>
                            )}

                            {/* Edit Button (Visible on Hover) */}
                            <button
                                onClick={(e) => handleEditClick(e, table)}
                                className="absolute bottom-3 right-3 p-2 rounded-full bg-[var(--vscode-button-secondaryBackground)] 
                                     text-[var(--vscode-button-secondaryForeground)] opacity-0 group-hover:opacity-100 
                                     transition-opacity shadow-lg hover:bg-[var(--vscode-button-secondaryHoverBackground)] z-10"
                                title="Editar Mesa"
                            >
                                <Edit2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'active_carts' && (
                <div className="flex flex-col gap-4 pb-20">
                    {Object.keys(activeCarts).length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-[var(--vscode-text-secondary)] opacity-50">
                            <ShoppingBag size={48} className="mb-4" />
                            <p>No hay otros usuarios editando pedidos en este momento.</p>
                        </div>
                    ) : (
                        Object.values(activeCarts).map(remote => (
                            <div key={remote.userId} className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 backdrop-blur-md">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                <Users size={18} className="text-orange-400" />
                                                {remote.username}
                                            </h3>
                                            <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30 animate-pulse">
                                                Editando ahora...
                                            </span>
                                        </div>
                                        <div className="text-sm text-[var(--vscode-text-secondary)] mt-1 flex items-center gap-1">
                                            <Clock size={12} />
                                            Actualizado: {new Date(remote.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-white">
                                            ${remote.cart.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0).toFixed(2)}
                                        </div>
                                        <div className="text-xs text-[var(--vscode-text-secondary)]">
                                            {remote.cart.length} items
                                        </div>
                                    </div>
                                </div>

                                <div className="text-sm text-[var(--vscode-text-secondary)] bg-black/20 p-2 rounded mb-3">
                                    {remote.cart.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    {remote.cart.length > 3 && (
                                        <div className="text-xs italic mt-1">...y {remote.cart.length - 3} más</div>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={() => handleTakeActiveCart(remote.userId, remote)}
                                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-orange-500/30"
                                    >
                                        <ShoppingBag size={16} />
                                        Copiar Carrito
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {viewMode === 'orders' && (
                <div className="flex flex-col gap-4 pb-20">
                    {(data.heldOrders || [])
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .map(order => {
                            const table = order.tableId ? tables.find(t => t.id === order.tableId) : null;
                            const isReady = order.status === 'ready';

                            return (
                                <div
                                    key={order.id}
                                    onClick={() => {
                                        if (table) {
                                            navigate(`/?tableId=${table.id}`);
                                        } else {
                                            navigate(`/?orderId=${order.id}`);
                                        }
                                    }}
                                    className={`p-4 rounded-xl border backdrop-blur-md cursor-pointer hover:scale-[1.01] transition-all ${isReady ? 'border-green-500/30 bg-green-500/10 hover:border-green-500/50' : 'border-blue-500/30 bg-blue-500/10 hover:border-blue-500/50'}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-white">
                                                    {order.tableName || table?.name || 'Pedido Rápido'}
                                                </h3>
                                                {order.takeaway && (
                                                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                                                        <ShoppingBag size={10} />
                                                        Llevar
                                                    </span>
                                                )}
                                                {order.priority === 'high' && (
                                                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30">
                                                        <Flag size={10} />
                                                        Urgente
                                                    </span>
                                                )}
                                                {order.priority === 'priority' && (
                                                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                                                        <Flag size={10} />
                                                        Prioridad
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2 items-center text-sm text-[var(--vscode-text-secondary)] mt-1">
                                                <Clock size={14} />
                                                <span>{new Date(order.timestamp).toLocaleString()}</span>
                                                {isReady && (
                                                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                                                        LISTO
                                                    </span>
                                                )}
                                            </div>
                                            {order.createdBy && (
                                                <div className="text-xs text-[var(--vscode-text-secondary)] mt-1">
                                                    <span className="font-semibold">Creado por:</span> {order.createdBy}
                                                    {order.modifiedBy && order.modifiedBy !== order.createdBy && (
                                                        <span className="ml-2">
                                                            <span className="font-semibold">• Modificado por:</span> {order.modifiedBy}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-white">
                                                ${order.total?.toFixed(2) || '0.00'}
                                            </div>
                                            <div className="text-xs text-[var(--vscode-text-secondary)]">
                                                {order.items?.length || 0} items
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-sm text-[var(--vscode-text-secondary)] bg-black/20 p-2 rounded mb-3">
                                        {order.items?.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex justify-between">
                                                <span>{item.quantity}x {item.name}</span>
                                                <span>${(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                        {order.items?.length > 3 && (
                                            <div className="text-xs italic mt-1">...y {order.items.length - 3} más</div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 justify-end">
                                        {!order.tableId && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOrderToAssignTable(order);
                                                }}
                                                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1 transition-all"
                                            >
                                                <LayoutGrid size={12} />
                                                Asignar Mesa
                                            </button>
                                        )}
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const ok = await confirm({
                                                    title: 'Cancelar Pedido',
                                                    message: '¿Cancelar este pedido?'
                                                });
                                                if (ok) {
                                                    cancelHeldOrder(order.id);
                                                }
                                            }}
                                            className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/30 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            )}

            {/* Modals */}
            <Modal
                isOpen={isAddModalOpen || !!editingTable}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingTable(null);
                }}
                title={editingTable ? "Editar Mesa" : "Nueva Mesa"}
            >
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--vscode-text-secondary)] mb-1">Nombre</label>
                        <input
                            type="text"
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            className="vscode-input w-full"
                            placeholder="Ej: Mesa 1, Barra 3..."
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--vscode-text-secondary)] mb-1">Área</label>
                        <select
                            value={tableArea}
                            onChange={(e) => setTableArea(e.target.value)}
                            className="vscode-select w-full"
                        >
                            {areas.map(area => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--vscode-border)]">
                        {editingTable && (
                            <button
                                onClick={handleDeleteTable}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors mr-auto flex items-center gap-2"
                            >
                                <Trash2 size={16} />
                                Eliminar
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setIsAddModalOpen(false);
                                setEditingTable(null);
                            }}
                            className="secondary-button"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={editingTable ? handleSaveEdit : handleAddTable}
                            className="primary-button"
                            disabled={!tableName.trim()}
                        >
                            {editingTable ? "Guardar Cambios" : "Crear Mesa"}
                        </button>
                    </div>
                </div>
            </Modal>

            <TrashModal
                isOpen={isTrashModalOpen}
                onClose={() => setIsTrashModalOpen(false)}
            />

            <AssignTableModal
                isOpen={!!orderToAssignTable}
                onClose={() => setOrderToAssignTable(null)}
                order={orderToAssignTable}
            />
        </div>
    );
};

const TrashModal = ({ isOpen, onClose }) => {
    const { data, restoreCancelledOrder, permanentlyDeleteOrder, updateItem } = useData();
    const { confirm, alert } = useDialog();

    const tableCancelledOrders = (data.cancelledOrders || [])
        .filter(order => order.tableId)
        .sort((a, b) => new Date(b.cancelledAt) - new Date(a.cancelledAt));

    const handleRestore = async (order) => {
        const currentTable = data.tables.find(t => t.id === order.tableId);
        if (!currentTable) {
            await alert({ title: 'Error', message: 'La mesa original ya no existe.' });
            return;
        }
        if (currentTable.status !== 'available') {
            await alert({ title: 'Aviso', message: `No se puede restaurar: La mesa "${currentTable.name}" está ocupada actualmente.` });
            return;
        }
        const ok = await confirm({
            title: 'Restaurar Pedido',
            message: `¿Restaurar pedido de ${currentTable.name}?`
        });
        if (ok) {
            restoreCancelledOrder(order.id);
            updateItem('tables', currentTable.id, {
                status: 'occupied',
                currentOrderId: order.id,
                occupiedAt: new Date().toISOString()
            });
            onClose();
        }
    };

    const handleDelete = async (orderId) => {
        const ok = await confirm({
            title: 'Eliminar Permanente',
            message: '¿Eliminar permanentemente este registro?'
        });
        if (ok) {
            permanentlyDeleteOrder(orderId);
        }
    }

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Papelera de Mesas"
        >
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2">
                {tableCancelledOrders.length === 0 ? (
                    <div className="text-center py-8 text-[var(--vscode-text-secondary)]">
                        <Trash2 size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No hay pedidos de mesas cancelados recientemente.</p>
                    </div>
                ) : (
                    tableCancelledOrders.map(order => {
                        const originalTable = data.tables.find(t => t.id === order.tableId);
                        const tableName = originalTable ? originalTable.name : 'Mesa Eliminada';

                        return (
                            <div key={order.id} className="p-4 rounded-lg bg-[var(--vscode-editor-background)] border border-[var(--vscode-border)] flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-lg text-white">{tableName}</h4>
                                        <span className="text-xs text-[var(--vscode-text-secondary)] flex items-center gap-1">
                                            <Clock size={12} />
                                            Cancelado: {new Date(order.cancelledAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-red-400">
                                            ${order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0)?.toLocaleString()}
                                        </div>
                                        <span className="text-xs text-[var(--vscode-text-secondary)]">
                                            {order.items?.length} items
                                        </span>
                                    </div>
                                </div>

                                <div className="text-sm text-[var(--vscode-text-secondary)] bg-black/20 p-2 rounded">
                                    {order.items?.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>${item.price}</span>
                                        </div>
                                    ))}
                                    {order.items?.length > 3 && (
                                        <div className="text-xs italic mt-1">...y {order.items.length - 3} más</div>
                                    )}
                                </div>

                                <div className="flex gap-2 justify-end mt-1">
                                    <button
                                        onClick={() => handleDelete(order.id)}
                                        className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/30 transition-all"
                                    >
                                        Eliminar
                                    </button>
                                    <button
                                        onClick={() => handleRestore(order)}
                                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1 transition-all"
                                    >
                                        <LayoutGrid size={12} />
                                        Restaurar a Mesa
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </Modal>
    );
};

const AssignTableModal = ({ isOpen, onClose, order }) => {
    const { data, updateItem } = useData();
    const { confirm } = useDialog();
    const availableTables = (data.tables || []).filter(t => t.status === 'available');

    const handleAssign = async (table) => {
        const ok = await confirm({
            title: 'Asignar Mesa',
            message: `¿Asignar este pedido a la ${table.name}?`
        });

        if (ok) {
            updateItem('heldOrders', order.id, {
                tableId: table.id,
                tableName: table.name
            });

            updateItem('tables', table.id, {
                status: 'occupied',
                currentOrderId: order.id,
                occupiedAt: new Date().toISOString(),
                total: order.total
            });

            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Seleccionar Mesa para Asignar"
        >
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
                {availableTables.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-[var(--vscode-text-secondary)]">
                        <p>No hay mesas disponibles actualmente.</p>
                    </div>
                ) : (
                    availableTables.map(table => (
                        <button
                            key={table.id}
                            onClick={() => handleAssign(table)}
                            className="p-4 rounded-lg border border-green-500/30 bg-green-500/5 hover:bg-green-500/20 transition-all text-left"
                        >
                            <div className="font-bold text-white">{table.name}</div>
                            <div className="text-xs text-[var(--vscode-text-secondary)]">{table.area}</div>
                        </button>
                    ))
                )}
            </div>
        </Modal>
    );
};
