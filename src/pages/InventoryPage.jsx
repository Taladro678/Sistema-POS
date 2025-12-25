import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Plus, AlertTriangle, CheckCircle, Camera, Trash2 } from 'lucide-react';

export const InventoryPage = () => {
    const { data, addItem, deleteItem, updateItem } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [photoFile, setPhotoFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Materia Prima',
        stock: '',
        unit: 'Litros',
        status: 'ok',
        supplierId: '',
        cost: '',
        paymentCondition: 'Contado' // 'Contado' or 'Credito'
    });

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este ítem?')) {
            deleteItem('inventory', id);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return alert('El nombre es obligatorio');

        let photoLink = 'N/A';
        if (photoFile) {
            setIsUploading(true);
            const result = await data.uploadToDrive(photoFile, 'Fotos Inventario');
            setIsUploading(false);

            if (result && result.webViewLink) {
                photoLink = result.webViewLink;
            } else {
                if (!window.confirm('No se pudo subir la foto. ¿Deseas registrar sin foto?')) {
                    return;
                }
            }
        }

        // Determine status based on stock
        const stockNum = parseFloat(formData.stock) || 0;
        const status = stockNum < 10 ? 'low' : 'ok';

        // Debt Logic
        if (formData.paymentCondition === 'Credito' && formData.supplierId) {
            const supplier = data.suppliers.find(s => s.id === parseInt(formData.supplierId));
            if (supplier) {
                const costNum = parseFloat(formData.cost) || 0;
                const newDebt = (supplier.debt || 0) + costNum;
                updateItem('suppliers', supplier.id, { debt: newDebt });
                // Optional: Log transaction on supplier? For now just update debt.
            }
        }

        addItem('inventory', { ...formData, stock: stockNum, cost: parseFloat(formData.cost) || 0, status, photo: photoLink });
        setIsModalOpen(false);
        setFormData({
            name: '',
            category: 'Materia Prima',
            stock: '',
            unit: 'Litros',
            status: 'ok',
            supplierId: '',
            cost: '',
            paymentCondition: 'Contado'
        });
        setPhotoFile(null);
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

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Registrar Entrada de Inventario"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Producto / Insumo</label>
                        <input
                            type="text"
                            list="products-list"
                            className="glass-input"
                            placeholder="Escribe o selecciona..."
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <datalist id="products-list">
                            <option value="Leche Cruda" />
                            <option value="Cuajo" />
                            <option value="Sal Industrial" />
                            <option value="Bolsas Plásticas" />
                            <option value="Etiquetas" />
                        </datalist>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Cantidad</label>
                        <input
                            type="number"
                            className="glass-input"
                            placeholder="0.00"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        />
                    </div>

                    {/* New Fields: Supplier, Cost, Payment Condition */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Proveedor</label>
                            <select
                                className="glass-input"
                                value={formData.supplierId}
                                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                            >
                                <option value="">Seleccionar...</option>
                                {data.suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Costo Total ($)</label>
                            <input
                                type="number"
                                className="glass-input"
                                placeholder="0.00"
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Condición de Pago</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="paymentCondition"
                                    checked={formData.paymentCondition === 'Contado'}
                                    onChange={() => setFormData({ ...formData, paymentCondition: 'Contado' })}
                                />
                                Contado
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="paymentCondition"
                                    checked={formData.paymentCondition === 'Credito'}
                                    onChange={() => setFormData({ ...formData, paymentCondition: 'Credito' })}
                                />
                                Crédito (Genera Deuda)
                            </label>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Foto (Opcional)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label className="glass-button" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Camera size={16} />
                                {photoFile ? 'Cambiar Foto' : 'Tomar Foto / Subir'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    style={{ display: 'none' }}
                                    onChange={(e) => setPhotoFile(e.target.files[0])}
                                />
                            </label>
                            {photoFile && <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>Foto seleccionada</span>}
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Unidad</label>
                        <select
                            className="glass-input"
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        >
                            <option>Litros</option>
                            <option>Kilos</option>
                            <option>Galones</option>
                            <option>Unidades</option>
                        </select>
                    </div>
                    <button
                        className="glass-button primary"
                        style={{ marginTop: '1rem', width: '100%' }}
                        onClick={handleSave}
                        disabled={isUploading}
                    >
                        {isUploading ? 'Subiendo Foto...' : 'Guardar Entrada'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};
