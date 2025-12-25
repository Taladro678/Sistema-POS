import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Plus, Phone, DollarSign, Edit, Trash2 } from 'lucide-react';

export const SuppliersPage = () => {
    const { data, addItem, deleteItem, updateItem } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [photoFile, setPhotoFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Sort State
    const [sortBy, setSortBy] = useState('recent'); // recent, old, debtHigh, debtLow

    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        phone: '',
        product: 'Leche',
        debt: 0,
        lastDelivery: new Date().toLocaleDateString(),
        paymentMethod: 'Efectivo', // Default
        bankName: '',
        reference: ''
    });

    const [paymentData, setPaymentData] = useState({
        supplierId: null,
        amount: '',
        source: 'Caja Chica',
        reference: '',
        proof: null
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
            lastDelivery: new Date().toLocaleDateString(),
            paymentMethod: 'Efectivo',
            bankName: '',
            reference: ''
        });
    };

    const openPaymentModal = (row) => {
        setPaymentData({
            supplierId: row.id,
            amount: '',
            source: 'Caja Chica',
            reference: '',
            proof: null
        });
        setIsPaymentModalOpen(true);
    };

    const handleRegisterPayment = async () => {
        if (paymentData.amount <= 0) return alert('El monto debe ser mayor a 0');

        const supplier = data.suppliers.find(s => s.id === paymentData.supplierId);
        if (!supplier) return;

        if (paymentData.amount > supplier.debt) return alert('El monto no puede ser mayor a la deuda actual');

        let proofLink = 'N/A';
        if (photoFile) {
            setIsUploading(true);
            const result = await data.uploadToDrive(photoFile, 'Comprobantes Pago');
            setIsUploading(false);
            if (result && result.webViewLink) {
                proofLink = result.webViewLink;
            }
        }

        const newDebt = supplier.debt - parseFloat(paymentData.amount);

        // Update Supplier
        updateItem('suppliers', supplier.id, {
            debt: newDebt,
            // Optionally store transaction history in the supplier object or a separate 'transactions' collection
            transactions: [
                ...(supplier.transactions || []),
                {
                    id: Date.now(),
                    date: new Date().toISOString(),
                    amount: parseFloat(paymentData.amount),
                    source: paymentData.source,
                    reference: paymentData.reference,
                    proof: proofLink
                }
            ]
        });

        setIsPaymentModalOpen(false);
        setPhotoFile(null);
    };

    // Sorting Logic
    const sortedSuppliers = [...data.suppliers].sort((a, b) => {
        if (sortBy === 'debtHigh') return b.debt - a.debt;
        if (sortBy === 'debtLow') return a.debt - b.debt;
        // Mock dates for this example if needed, but assuming lastDelivery is string. 
        // For distinct "Recent/Old" logic, we rely on ID (creation time) effectively as proxy if dates are equal 
        // or parse the date string. Let's start with ID reverse for "recent".
        if (sortBy === 'recent') return b.id - a.id;
        if (sortBy === 'old') return a.id - b.id;
        return 0;
    });

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
                onClick={() => openPaymentModal(row)}
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

            {/* Sort Controls */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {[
                    { id: 'recent', label: 'Más Reciente' },
                    { id: 'old', label: 'Más Antiguo' },
                    { id: 'debtHigh', label: 'Mayor Deuda' },
                    { id: 'debtLow', label: 'Menor Deuda' }
                ].map(opt => (
                    <button
                        key={opt.id}
                        className={`glass-button ${sortBy === opt.id ? 'active' : ''}`}
                        onClick={() => setSortBy(opt.id)}
                        style={{
                            fontSize: '0.85rem',
                            background: sortBy === opt.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                            borderColor: sortBy === opt.id ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)'
                        }}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <DataTable columns={columns} data={sortedSuppliers} actions={actions} />

            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Registrar Pago a Proveedor"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Monto a Pagar ($)</label>
                        <input
                            type="number"
                            className="glass-input"
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                        />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Deuda Actual: <span style={{ color: 'var(--accent-red)' }}>${data.suppliers.find(s => s.id === paymentData.supplierId)?.debt.toFixed(2)}</span>
                        </p>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Fuente de Pago</label>
                        <select
                            className="glass-input"
                            value={paymentData.source}
                            onChange={(e) => setPaymentData({ ...paymentData, source: e.target.value })}
                        >
                            <option>Caja Chica</option>
                            <option>Banco (Transferencia)</option>
                            <option>Efectivo (Externo)</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Referencia / Notas</label>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Nro. Referencia..."
                            value={paymentData.reference}
                            onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                        />
                    </div>
                    {/* Proof Upload (Reusing Camera/File Input logic logic) */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Comprobante (Opcional)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPhotoFile(e.target.files[0])}
                            style={{ color: 'var(--text-secondary)' }}
                        />
                    </div>

                    <button
                        className="glass-button primary"
                        style={{ marginTop: '1rem', width: '100%' }}
                        onClick={handleRegisterPayment}
                        disabled={isUploading}
                    >
                        {isUploading ? 'Subiendo...' : 'Confirmar Pago'}
                    </button>
                </div>
            </Modal>

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
