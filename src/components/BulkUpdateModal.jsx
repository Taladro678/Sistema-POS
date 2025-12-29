import React, { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';

/**
 * Modal para actualización masiva de precio de costo y stock de productos
 */
const BulkUpdateModal = ({ isOpen, onClose, products }) => {
    const { updateItem } = useData();
    const [editedProducts, setEditedProducts] = useState(
        products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            costPrice: p.costPrice || (p.price * 0.6).toFixed(2), // Sugerencia: 60% del precio de venta
            stock: p.stock || 100 // Stock por defecto sugerido
        }))
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleFieldChange = (productId, field, value) => {
        setEditedProducts(prev =>
            prev.map(p =>
                p.id === productId ? { ...p, [field]: value } : p
            )
        );
    };

    const handleSaveAll = () => {
        setIsSaving(true);

        // Actualizar cada producto
        editedProducts.forEach(editedProduct => {
            const updates = {
                costPrice: parseFloat(editedProduct.costPrice) || 0,
                stock: parseInt(editedProduct.stock) || 0
            };

            updateItem('products', editedProduct.id, updates);
        });

        setIsSaving(false);
        alert(`✅ Se actualizaron ${editedProducts.length} productos correctamente`);
        onClose();
    };

    const calculateMargin = (price, cost) => {
        if (!cost || cost === 0) return 0;
        return (((price - cost) / cost) * 100).toFixed(0);
    };

    const totalValue = editedProducts.reduce((sum, p) =>
        sum + (parseFloat(p.costPrice) * parseInt(p.stock)), 0
    );

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '90vw',
                    width: '1200px',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div>
                        <h2 style={{ margin: 0, color: 'var(--accent-cyan)' }}>
                            📦 Actualización Masiva de Inventario
                        </h2>
                        <p style={{
                            margin: '0.5rem 0 0 0',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem'
                        }}>
                            Edita el precio de costo y stock de todos los productos
                        </p>
                    </div>
                    <button
                        className="icon-button"
                        onClick={onClose}
                        style={{ padding: '0.5rem' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Alert */}
                <div className="glass-panel" style={{
                    padding: '0.75rem',
                    background: 'rgba(255, 165, 0, 0.1)',
                    border: '1px solid rgba(255, 165, 0, 0.3)',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <AlertTriangle size={18} color="var(--accent-orange)" />
                    <span style={{ fontSize: '0.85rem' }}>
                        Los valores sugeridos son: Costo = 60% del precio de venta | Stock = 100 unidades
                    </span>
                </div>

                {/* Summary Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    marginBottom: '1rem'
                }}>
                    <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Total Productos
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                            {editedProducts.length}
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Total Unidades
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                            {editedProducts.reduce((sum, p) => sum + parseInt(p.stock || 0), 0)}
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Valor Inventario
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-orange)' }}>
                            ${totalValue.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    marginBottom: '1rem'
                }}>
                    <table className="data-table" style={{ width: '100%' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 1 }}>
                            <tr>
                                <th style={{ width: '30%' }}>Producto</th>
                                <th style={{ width: '15%' }}>Precio Venta</th>
                                <th style={{ width: '20%' }}>Precio Costo</th>
                                <th style={{ width: '15%' }}>Stock</th>
                                <th style={{ width: '10%' }}>Margen</th>
                                <th style={{ width: '10%' }}>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editedProducts.map((product) => {
                                const margin = calculateMargin(product.price, parseFloat(product.costPrice));
                                const itemValue = parseFloat(product.costPrice) * parseInt(product.stock);

                                return (
                                    <tr key={product.id}>
                                        <td>
                                            <strong>{product.name}</strong>
                                        </td>
                                        <td>
                                            <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>
                                                ${product.price.toFixed(2)}
                                            </span>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="glass-input"
                                                value={product.costPrice}
                                                onChange={(e) => handleFieldChange(product.id, 'costPrice', e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '0.9rem'
                                                }}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="glass-input"
                                                value={product.stock}
                                                onChange={(e) => handleFieldChange(product.id, 'stock', e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '0.9rem'
                                                }}
                                            />
                                        </td>
                                        <td>
                                            <span style={{
                                                color: margin > 50 ? 'var(--accent-green)' : margin > 20 ? 'var(--accent-orange)' : 'var(--accent-red)',
                                                fontWeight: 'bold',
                                                fontSize: '0.9rem'
                                            }}>
                                                +{margin}%
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                ${itemValue.toFixed(2)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer Actions */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <button
                        className="glass-button"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Cancelar
                    </button>
                    <button
                        className="glass-button primary"
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Save size={18} />
                        {isSaving ? 'Guardando...' : `Guardar ${editedProducts.length} Productos`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkUpdateModal;
