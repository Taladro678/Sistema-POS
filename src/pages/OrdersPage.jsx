import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Users, Coffee, CheckCircle, Clock, Edit2, Plus, Trash2, LayoutGrid, History, ShoppingBag, Flag } from 'lucide-react';
import Modal from '../components/Modal';

export const OrdersPage = () => {
    const { data, updateItem, addItem, deleteItem, cancelHeldOrder } = useData();
    const navigate = useNavigate();
    const tables = data.tables || [];

    const [selectedArea, setSelectedArea] = useState('Todas'); // 'Todas', 'Restaurante', 'Quesera', 'Patio'
    const [viewMode, setViewMode] = useState('orders'); // 'tables' | 'orders' - Default to orders
    const [editingTable, setEditingTable] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);

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

    const handleCancelOrder = (e, table) => {
        e.stopPropagation();
        if (table.status !== 'occupied') return;

        if (window.confirm(`¿Estás seguro de CANCELAR el pedido de la ${table.name}? Esta acción no se puede deshacer y liberará la mesa.`)) {
            if (table.currentOrderId) {
                cancelHeldOrder(table.currentOrderId);
            } else {
                // Should not happen, but fallback to force free
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

    const handleDeleteTable = () => {
        if (editingTable) {
            if (window.confirm(`¿Estás seguro de eliminar "${editingTable.name}"?`)) {
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

    return (
        <div className="p-6 h-full overflow-y-auto flex flex-col">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Coffee className="text-orange-400" />
                        <span>Gestión de Pedidos</span>
                    </h1>

                    {/* Trash Button */}
                    <button
                        onClick={() => setIsTrashModalOpen(true)}
                        className="glass-button secondary flex items-center gap-2 px-3 py-1.5 text-sm hover:text-red-400 transition-colors"
                        title="Ver Pedidos Cancelados de Mesas"
                    >
                        <History size={16} />
                    </button>

                    {/* Add Table Button */}
                    <button
                        onClick={openAddModal}
                        className="glass-button primary flex items-center gap-2 px-3 py-1.5 text-sm"
                    >
                        <Plus size={16} />
                        <span>Nueva Mesa</span>
                    </button>
                </div>

                {/* Status Legend */}
                <div className="flex gap-2">
                    <div className="px-3 py-1 rounded-full border border-[var(--vscode-border)] bg-[var(--vscode-input)] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                        <span className="text-xs font-medium text-[var(--vscode-text)]">Disponible</span>
                    </div>
                    <div className="px-3 py-1 rounded-full border border-[var(--vscode-border)] bg-[var(--vscode-input)] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                        <span className="text-xs font-medium text-[var(--vscode-text)]">Ocupada</span>
                    </div>
                    <div className="px-3 py-1 rounded-full border border-[var(--vscode-border)] bg-[var(--vscode-input)] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                        <span className="text-xs font-medium text-[var(--vscode-text)]">Reservada</span>
                    </div>
                </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2 mb-6 border-b border-[var(--vscode-border)] pb-1">
                <button
                    onClick={() => setViewMode('tables')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${viewMode === 'tables'
                        ? 'border-[var(--vscode-highlight)] text-white'
                        : 'border-transparent text-[var(--vscode-text)] hover:text-white'
                        }`}
                >
                    Mesas
                </button>
                <button
                    onClick={() => setViewMode('orders')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${viewMode === 'orders'
                        ? 'border-[var(--vscode-highlight)] text-white'
                        : 'border-transparent text-[var(--vscode-text)] hover:text-white'
                        }`}
                >
                    Todos los Pedidos ({(data.heldOrders || []).filter(o => !o.isProduction || o.status === 'ready').length})
                </button>
            </div>

            {/* Area Tabs (Only for Tables view) */}
            {viewMode === 'tables' && (
                <div className="flex gap-2 mb-6 border-b border-[var(--vscode-border)] pb-1 overflow-x-auto">
                    {['Todas', ...areas].map(area => (
                        <button
                            key={area}
                            onClick={() => setSelectedArea(area)}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${selectedArea === area
                                ? 'border-[var(--vscode-highlight)] text-white'
                                : 'border-transparent text-[var(--vscode-text)] hover:text-white'
                                }`}
                        >
                            {area}
                        </button>
                    ))}
                </div>
            )}

            {/* Tables Grid */}
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
                            < div className="mt-6 text-center" >
                                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                                    {table.name}
                                </h3>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                                    <LayoutGrid size={12} className="text-[var(--vscode-text-secondary)]" />
                                    <span className="text-xs text-[var(--vscode-text-secondary)]">
                                        {table.area || 'Restaurante'}
                                    </span>
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

            {viewMode === 'orders' && (
                <div className="flex flex-col gap-4 pb-20">
                    {/* Aggregating ALL orders: Held, Kitchen, Bar */}
                    {(data.heldOrders || [])
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .map(order => {
                            const table = order.tableId ? tables.find(t => t.id === order.tableId) : null;
                            const isReady = order.status === 'ready';

                            return (
                                <div
                                    key={order.id}
                                    onClick={() => {
                                        // Navigate to POS with this order
                                        if (table) {
                                            navigate(`/?tableId=${table.id}`);
                                        } else {
                                            // For non-table orders, navigate to POS and load the order
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
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('¿Cancelar este pedido?')) {
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
            < Modal
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
        </div>
    );
};

const TrashModal = ({ isOpen, onClose }) => {
    const { data, restoreCancelledOrder, permanentlyDeleteOrder, updateItem } = useData();

    // Filter ONLY cancelled orders that belong to a table
    const tableCancelledOrders = (data.cancelledOrders || [])
        .filter(order => order.tableId)
        .sort((a, b) => new Date(b.cancelledAt) - new Date(a.cancelledAt));

    const handleRestore = (order) => {
        // Find if the table is currently available
        const currentTable = data.tables.find(t => t.id === order.tableId);

        if (!currentTable) {
            alert('La mesa original ya no existe.');
            return;
        }

        if (currentTable.status !== 'available') {
            alert(`No se puede restaurar: La mesa "${currentTable.name}" está ocupada actualmente.`);
            return;
        }

        if (window.confirm(`¿Restaurar pedido de ${currentTable.name}?`)) {
            // Restore order
            restoreCancelledOrder(order.id);
            // Re-occupy the table
            updateItem('tables', currentTable.id, {
                status: 'occupied',
                currentOrderId: order.id,
                occupiedAt: new Date().toISOString()
            });
            onClose();
        }
    };

    const handleDelete = (orderId) => {
        if (window.confirm('¿Eliminar permanentemente este registro?')) {
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
                                            ${order.currentOrder?.reduce((sum, item) => sum + (item.price * item.quantity), 0)?.toLocaleString()}
                                        </div>
                                        <span className="text-xs text-[var(--vscode-text-secondary)]">
                                            {order.currentOrder?.length} items
                                        </span>
                                    </div>
                                </div>

                                <div className="text-sm text-[var(--vscode-text-secondary)] bg-black/20 p-2 rounded">
                                    {order.currentOrder?.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>${item.price}</span>
                                        </div>
                                    ))}
                                    {order.currentOrder?.length > 3 && (
                                        <div className="text-xs italic mt-1">...y {order.currentOrder.length - 3} más</div>
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
