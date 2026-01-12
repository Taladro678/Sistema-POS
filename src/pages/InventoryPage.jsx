import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useDialog } from '../context/DialogContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Plus, AlertTriangle, CheckCircle, Camera, Trash2, X } from 'lucide-react';

/**
 * COMPONENTE: InventoryPage - Gestión de Inventario
 * 
 * NUEVO SISTEMA DE ENTRADA MASIVA:
 * - Permite registrar múltiples productos en una sola entrada
 * - Precio de costo individual por producto
 * - IVA opcional por producto (16%)
 * - Cálculo automático de subtotal, IVA total, y total general
 * - Foto de factura OBLIGATORIA
 * - Asociación con proveedor
 */

export const InventoryPage = () => {
    const { data, addItem, deleteItem, updateItem, uploadToDrive } = useData();
    const { confirm, alert } = useDialog();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [photoFile, setPhotoFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Datos generales de la entrada
    const [entryData, setEntryData] = useState({
        supplierId: '',
        paymentCondition: 'Contado', // 'Contado' o 'Credito'
        invoiceNumber: '', // Número de factura
        date: new Date().toISOString().split('T')[0]
    });

    // Lista de productos en esta entrada
    const [entryItems, setEntryItems] = useState([]);

    // Producto temporal para agregar
    const [newItem, setNewItem] = useState({
        name: '',
        quantity: '',
        unit: 'Litros',
        costPrice: '',
        hasIVA: false
    });

    const handleDelete = async (id) => {
        const ok = await confirm({
            title: 'Eliminar ítem',
            message: '¿Estás seguro de eliminar este ítem?'
        });
        if (ok) {
            deleteItem('inventory', id);
        }
    };

    // Agregar producto a la lista de entrada
    const handleAddItem = async () => {
        if (!newItem.name || !newItem.quantity || !newItem.costPrice) {
            return await alert({ title: 'Datos incompletos', message: 'Completa nombre, cantidad y precio' });
        }

        const item = {
            id: Date.now(),
            name: newItem.name,
            quantity: parseFloat(newItem.quantity),
            unit: newItem.unit,
            costPrice: parseFloat(newItem.costPrice),
            hasIVA: newItem.hasIVA
        };

        setEntryItems([...entryItems, item]);
        setNewItem({
            name: '',
            quantity: '',
            unit: 'Litros',
            costPrice: '',
            hasIVA: false
        });
    };

    // Eliminar producto de la lista
    const handleRemoveItem = (itemId) => {
        setEntryItems(entryItems.filter(i => i.id !== itemId));
    };

    // Cálculos
    const calculateSubtotal = (item) => {
        return item.quantity * item.costPrice;
    };

    const calculateIVA = (item) => {
        if (!item.hasIVA) return 0;
        return calculateSubtotal(item) * 0.16; // 16% IVA
    };

    const calculateItemTotal = (item) => {
        return calculateSubtotal(item) + calculateIVA(item);
    };

    const totals = {
        subtotal: entryItems.reduce((sum, item) => sum + calculateSubtotal(item), 0),
        iva: entryItems.reduce((sum, item) => sum + calculateIVA(item), 0),
        total: entryItems.reduce((sum, item) => sum + calculateItemTotal(item), 0)
    };

    const handleSaveEntry = async () => {
        // Validaciones
        if (!entryData.supplierId) {
            return await alert({ title: 'Error', message: 'Debes seleccionar un proveedor' });
        }

        if (entryItems.length === 0) {
            return await alert({ title: 'Error', message: 'Debes agregar al menos un producto' });
        }

        if (!photoFile) {
            return await alert({ title: 'Foto requerida', message: '⚠️ La foto de la factura es OBLIGATORIA' });
        }

        // Subir foto
        setIsUploading(true);
        const result = await uploadToDrive(photoFile, 'Facturas Inventario');
        setIsUploading(false);

        if (!result || !result.webViewLink) {
            return await alert({ title: 'Error de carga', message: 'Error al subir la foto. Intenta de nuevo.' });
        }

        const photoLink = result.webViewLink;

        // Crear registro de entrada
        const entry = {
            ...entryData,
            items: entryItems,
            totals: totals,
            photo: photoLink,
            timestamp: new Date().toISOString()
        };

        // Guardar entrada (nueva colección)
        addItem('inventoryEntries', entry);

        // Actualizar stock de cada producto
        entryItems.forEach(item => {
            // Buscar si existe el producto en inventario
            const existingItem = data.inventory.find(inv =>
                inv.name.toLowerCase() === item.name.toLowerCase()
            );

            if (existingItem) {
                // Actualizar stock existente
                const newStock = existingItem.stock + item.quantity;
                const status = newStock < 10 ? 'low' : 'ok';
                updateItem('inventory', existingItem.id, {
                    stock: newStock,
                    status: status
                });
            } else {
                // Crear nuevo item en inventario
                const status = item.quantity < 10 ? 'low' : 'ok';
                addItem('inventory', {
                    name: item.name,
                    category: 'Materia Prima',
                    stock: item.quantity,
                    unit: item.unit,
                    status: status,
                    cost: item.costPrice
                });
            }
        });

        // Si es a crédito, actualizar deuda del proveedor
        if (entryData.paymentCondition === 'Credito') {
            const supplier = data.suppliers.find(s => s.id === parseInt(entryData.supplierId));
            if (supplier) {
                const newDebt = (supplier.debt || 0) + totals.total;
                updateItem('suppliers', supplier.id, { debt: newDebt });
            }
        }

        // Limpiar formulario
        setIsModalOpen(false);
        setEntryData({
            supplierId: '',
            paymentCondition: 'Contado',
            invoiceNumber: '',
            date: new Date().toISOString().split('T')[0]
        });
        setEntryItems([]);
        setPhotoFile(null);

        await alert({ title: 'Éxito', message: '✅ Entrada registrada exitosamente' });
    };

    const columns = [
        { header: 'Nombre', accessor: 'name' },
        { header: 'Categoría', accessor: 'category' },
        {
            header: 'Stock',
            accessor: 'stock',
            render: (row) => (
                <span style={{ fontWeight: 'bold', color: row.status === 'low' ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                    {row.stock} {row.unit}
                </span>
            )
        },
        {
            header: 'Estado',
            accessor: 'status',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {row.status === 'ok' ? (
                        <CheckCircle size={16} color="var(--accent-green)" />
                    ) : (
                        <AlertTriangle size={16} color="var(--accent-red)" />
                    )}
                    <span style={{ color: row.status === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {row.status === 'ok' ? 'Normal' : 'Bajo'}
                    </span>
                </div>
            )
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '2rem' }}>Inventario</h1>
                <button
                    className="glass-button primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={() => setIsModalOpen(true)}
                >
                    <Plus size={20} />
                    Registrar Entrada
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <div className="glass-panel" style={{ padding: '0.75rem' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Total Leche</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {data.inventory.find(i => i.name.includes('Leche'))?.stock || 0} L
                    </p>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Bajos de Stock</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-red)' }}>
                        {data.inventory.filter(i => i.status === 'low').length}
                    </p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data.inventory}
                actions={(row) => (
                    <button
                        className="glass-button"
                        style={{ padding: '0.5rem', color: 'var(--accent-red)' }}
                        onClick={() => handleDelete(row.id)}
                        title="Eliminar"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            />

            {/* MODAL MEJORADO */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEntryItems([]);
                    setPhotoFile(null);
                }}
                title="Registrar Entrada de Inventario"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>

                    {/* Datos Generales */}
                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0, 242, 255, 0.05)' }}>
                        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--accent-blue)' }}>Datos de la Factura</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Proveedor *</label>
                                <select
                                    className="glass-input"
                                    value={entryData.supplierId}
                                    onChange={(e) => setEntryData({ ...entryData, supplierId: e.target.value })}
                                    style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                                >
                                    <option value="">Seleccionar...</option>
                                    {data.suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nro. Factura</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="opcional"
                                    value={entryData.invoiceNumber}
                                    onChange={(e) => setEntryData({ ...entryData, invoiceNumber: e.target.value })}
                                    style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '0.75rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Condición de Pago</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input
                                        type="radio"
                                        checked={entryData.paymentCondition === 'Contado'}
                                        onChange={() => setEntryData({ ...entryData, paymentCondition: 'Contado' })}
                                    />
                                    Contado
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input
                                        type="radio"
                                        checked={entryData.paymentCondition === 'Credito'}
                                        onChange={() => setEntryData({ ...entryData, paymentCondition: 'Credito' })}
                                    />
                                    Crédito
                                </label>
                            </div>
                        </div>

                        {/* Foto OBLIGATORIA */}
                        <div style={{ marginTop: '0.75rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Foto de Factura <span style={{ color: 'var(--accent-red)' }}>* OBLIGATORIA</span>
                            </label>
                            <label className="glass-button" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', width: '100%', padding: '0.75rem' }}>
                                <Camera size={18} />
                                {photoFile ? '✅ Foto Cargada - Cambiar' : '📸 Tomar/Subir Foto'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    style={{ display: 'none' }}
                                    onChange={(e) => setPhotoFile(e.target.files[0])}
                                />
                            </label>
                            {photoFile && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '0.25rem', textAlign: 'center' }}>
                                    ✓ {photoFile.name}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Lista de Productos */}
                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)' }}>
                        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--accent-orange)' }}>Productos de la Entrada</h3>

                        {/* Items agregados */}
                        {entryItems.length > 0 && (
                            <div style={{ marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {entryItems.map((item) => (
                                    <div key={item.id} className="glass-panel" style={{ padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                {item.name} {item.hasIVA && <span style={{ fontSize: '0.7rem', color: 'var(--accent-orange)' }}>(+IVA)</span>}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {item.quantity} {item.unit} × ${item.costPrice.toFixed(2)} =
                                                <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}> ${calculateItemTotal(item).toFixed(2)}</span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="glass-button"
                                            style={{ padding: '0.25rem', color: 'var(--accent-red)' }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Formulario agregar producto */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div>
                                <input
                                    type="text"
                                    list="existing-products"
                                    className="glass-input"
                                    placeholder="Nombre del producto (escribe o selecciona) *"
                                    value={newItem.name}
                                    onChange={(e) => {
                                        const selectedValue = e.target.value;
                                        setNewItem({ ...newItem, name: selectedValue });

                                        // Auto-completar unidad si se selecciona un producto existente
                                        const existingProduct = data.products.find(p =>
                                            p.name.toLowerCase() === selectedValue.toLowerCase()
                                        );
                                        if (existingProduct && existingProduct.unit) {
                                            setNewItem({
                                                ...newItem,
                                                name: selectedValue,
                                                unit: existingProduct.unit
                                            });
                                        }
                                    }}
                                    style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                                />
                                {/* Datalist con productos existentes */}
                                <datalist id="existing-products">
                                    {data.products.map((product, idx) => (
                                        <option key={idx} value={product.name}>
                                            {product.category}
                                        </option>
                                    ))}
                                    {/* También productos del inventario */}
                                    {data.inventory.map((item, idx) => (
                                        <option key={`inv-${idx}`} value={item.name}>
                                            Inventario
                                        </option>
                                    ))}
                                </datalist>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                                    💡 Empieza a escribir para ver sugerencias
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    className="glass-input"
                                    placeholder="Cantidad *"
                                    value={newItem.quantity}
                                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                    style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                                />

                                <select
                                    className="glass-input"
                                    value={newItem.unit}
                                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                    style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                                >
                                    <option>Litros</option>
                                    <option>Kilos</option>
                                    <option>Unidades</option>
                                    <option>Galones</option>
                                </select>

                                <input
                                    type="number"
                                    className="glass-input"
                                    placeholder="Costo ($) *"
                                    value={newItem.costPrice}
                                    onChange={(e) => setNewItem({ ...newItem, costPrice: e.target.value })}
                                    style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                                />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                <input
                                    type="checkbox"
                                    checked={newItem.hasIVA}
                                    onChange={(e) => setNewItem({ ...newItem, hasIVA: e.target.checked })}
                                />
                                Este producto tiene IVA (16%)
                            </label>

                            <button
                                onClick={handleAddItem}
                                className="glass-button accent"
                                style={{ fontSize: '0.85rem', padding: '0.5rem', width: '100%' }}
                            >
                                + Agregar a la Lista
                            </button>
                        </div>
                    </div>

                    {/* Resumen de costos */}
                    {entryItems.length > 0 && (
                        <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0, 255, 0, 0.05)', border: '1px solid rgba(0, 255, 0, 0.2)' }}>
                            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--accent-green)' }}>Resumen de Costos</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                <span>Subtotal:</span>
                                <span>${totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--accent-orange)' }}>
                                <span>IVA (16%):</span>
                                <span>${totals.iva.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <span>TOTAL:</span>
                                <span style={{ color: 'var(--accent-green)' }}>${totals.total.toFixed(2)}</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                                {entryItems.length} producto(s) en esta entrada
                            </p>
                        </div>
                    )}

                    {/* Botón Guardar */}
                    <button
                        className="glass-button primary"
                        style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 'bold' }}
                        onClick={handleSaveEntry}
                        disabled={isUploading || entryItems.length === 0 || !photoFile || !entryData.supplierId}
                    >
                        {isUploading ? 'Subiendo Foto...' : '✓ Guardar Entrada Completa'}
                    </button>

                    {/* Advertencias */}
                    {(!photoFile || entryItems.length === 0 || !entryData.supplierId) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', textAlign: 'center' }}>
                            {!entryData.supplierId && <p style={{ margin: '0.25rem 0' }}>⚠️ Selecciona un proveedor</p>}
                            {entryItems.length === 0 && <p style={{ margin: '0.25rem 0' }}>⚠️ Agrega al menos un producto</p>}
                            {!photoFile && <p style={{ margin: '0.25rem 0' }}>⚠️ La foto es obligatoria</p>}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};
