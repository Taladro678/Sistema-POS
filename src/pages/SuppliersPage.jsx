import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Plus, Phone, DollarSign, Edit, Trash2 } from 'lucide-react';

export const SuppliersPage = () => {
    const { data, addItem, deleteItem } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        phone: '',
        product: 'Leche',
        debt: 0,
        lastDelivery: new Date().toLocaleDateString()
    });

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este proveedor?')) {
            deleteItem('suppliers', id);
        }
    };

    const handleEdit = (row) => {
        // For simplicity in this prototype, we'll just alert. 
        // In a full app, we'd populate the modal.
        alert(`Editando proveedor: ${row.name}`);
    };

    const handleSave = () => {
        if (!formData.name) return alert('El nombre es obligatorio');
        addItem('suppliers', formData);
        setIsModalOpen(false);
        setFormData({
            name: '',
            contact: '',
            phone: '',
            product: 'Leche',
            debt: 0,
            lastDelivery: new Date().toLocaleDateString()
        });
    };

    const columns = [
        { header: 'Finca / Empresa', accessor: 'name' },
        { header: 'Contacto', accessor: 'contact' },
        {
            header: 'Producto',
            accessor: 'product',
            render: (row) => (
                <span style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                }}>
                    {row.product}
                </span>
            )
        },
        { header: 'Última Entrega', accessor: 'lastDelivery' },
        {
            header: 'Deuda ($)',
            accessor: 'debt',
            render: (row) => (
                <span style={{
                    fontWeight: 'bold',
                    color: row.debt > 0 ? 'var(--accent-red)' : 'var(--accent-green)'
                }}>
                    ${row.debt.toFixed(2)}
                </span>
            )
        }
    ];



    const actions = (row) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="glass-button" style={{ padding: '0.5rem' }} title="Llamar">
                <Phone size={16} />
            </button>
            <button
                className="glass-button accent"
                style={{ padding: '0.5rem' }}
                title="Registrar Pago"
                onClick={() => alert(`Registrar pago para: ${row.name} (Próximamente)`)}
            >
                <DollarSign size={16} />
            </button>
            <button
                className="glass-button"
                style={{ padding: '0.5rem', color: 'var(--accent-blue)' }}
                title="Editar"
                onClick={() => handleEdit(row)}
            >
                <Edit size={16} />
            </button>
            <button
                className="glass-button"
                style={{ padding: '0.5rem', color: 'var(--accent-red)' }}
                title="Eliminar"
                onClick={() => handleDelete(row.id)}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '2rem' }}>Proveedores</h1>
                <button
                    className="glass-button primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={() => setIsModalOpen(true)}
                >
                    <Plus size={20} />
                    Nuevo Proveedor
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <div className="glass-panel" style={{ padding: '0.75rem' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Deuda Total</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-red)' }}>
                        ${data.suppliers.reduce((acc, curr) => acc + curr.debt, 0).toFixed(2)}
                    </p>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Proveedores</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{data.suppliers.length}</p>
                </div>
            </div>

            <DataTable columns={columns} data={data.suppliers} actions={actions} />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Registrar Nuevo Proveedor"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nombre Finca / Empresa</label>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Ej: Finca La Milagrosa"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Persona de Contacto</label>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Nombre y Apellido"
                            value={formData.contact}
                            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Teléfono</label>
                        <input
                            type="tel"
                            className="glass-input"
                            placeholder="0414-XXXXXXX"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Producto Principal</label>
                        <select
                            className="glass-input"
                            value={formData.product}
                            onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                        >
                            <option>Leche</option>
                            <option>Cuajo</option>
                            <option>Sal</option>
                            <option>Otros</option>
                        </select>
                    </div>
                    <button
                        className="glass-button primary"
                        style={{ marginTop: '1rem', width: '100%' }}
                        onClick={handleSave}
                    >
                        Guardar Proveedor
                    </button>
                </div>
            </Modal>
        </div>
    );
};
