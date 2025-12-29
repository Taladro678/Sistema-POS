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

    // Estado para edición
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Sort State
    const [sortBy, setSortBy] = useState('recent'); // recent, old, debtHigh, debtLow

    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        phone: '',
        products: [], // Array de productos: [{name, costPrice, salePrice}]
        debt: 0,
        lastDelivery: new Date().toLocaleDateString(),
        paymentMethod: 'Efectivo', // Default
        bankName: '',
        reference: ''
    });

    // Estado temporal para agregar productos
    const [newProduct, setNewProduct] = useState({
        name: '',
        costPrice: '',
        salePrice: ''
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
        // Cargar datos del proveedor en el formulario
        setFormData({
            name: row.name || '',
            contact: row.contact || '',
            phone: row.phone || '',
            products: row.products || [],
            debt: row.debt || 0,
            lastDelivery: row.lastDelivery || new Date().toLocaleDateString(),
            paymentMethod: row.paymentMethod || 'Efectivo',
            bankName: row.bankName || '',
            reference: row.reference || ''
        });
        setEditingId(row.id);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    // Función para agregar producto al proveedor
    const handleAddProduct = () => {
        if (!newProduct.name || !newProduct.costPrice || !newProduct.salePrice) {
            return alert('Completa todos los campos del producto');
        }

        const product = {
            id: Date.now(),
            name: newProduct.name,
            costPrice: parseFloat(newProduct.costPrice),
            salePrice: parseFloat(newProduct.salePrice)
        };

        setFormData({
            ...formData,
            products: [...formData.products, product]
        });

        // Resetear formulario de producto
        setNewProduct({ name: '', costPrice: '', salePrice: '' });
    };

    // Función para eliminar producto del proveedor
    const handleRemoveProduct = (productId) => {
        setFormData({
            ...formData,
            products: formData.products.filter(p => p.id !== productId)
        });
    };

    const handleSave = () => {
        if (!formData.name) return alert('El nombre es obligatorio');

        if (isEditing && editingId) {
            // Actualizar proveedor existente
            updateItem('suppliers', editingId, formData);
        } else {
            // Crear nuevo proveedor
            addItem('suppliers', formData);
        }

        // Resetear formulario y estados
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingId(null);
        setFormData({
            name: '',
            contact: '',
            phone: '',
            products: [],
            debt: 0,
            lastDelivery: new Date().toLocaleDateString(),
            paymentMethod: 'Efectivo',
            bankName: '',
            reference: ''
        });
        setNewProduct({ name: '', costPrice: '', salePrice: '' });
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
            header: 'Productos',
            accessor: 'products',
            render: (row) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {(row.products || []).length > 0 ? (
                        row.products.slice(0, 2).map((product, idx) => (
                            <span key={idx} style={{
                                background: 'rgba(0, 242, 255, 0.1)',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                color: 'var(--accent-blue)'
                            }}>
                                {product.name}
                            </span>
                        ))
                    ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sin productos</span>
                    )}
                    {(row.products || []).length > 2 && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            +{row.products.length - 2} más
                        </span>
                    )}
                </div>
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
                onClose={() => {
                    setIsModalOpen(false);
                    setIsEditing(false);
                    setEditingId(null);
                    setFormData({
                        name: '',
                        contact: '',
                        phone: '',
                        products: [],
                        debt: 0,
                        lastDelivery: new Date().toLocaleDateString(),
                        paymentMethod: 'Efectivo',
                        bankName: '',
                        reference: ''
                    });
                    setNewProduct({ name: '', costPrice: '', salePrice: '' });
                }}
                title={isEditing ? "Editar Proveedor" : "Registrar Nuevo Proveedor"}
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
                    {/* Sección de Productos */}
                    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--accent-blue)' }}>Productos que Suministra</h3>

                        {/* Lista de productos agregados */}
                        {formData.products.length > 0 && (
                            <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {formData.products.map((product) => (
                                    <div key={product.id} className="glass-panel" style={{ padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>{product.name}</p>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                Costo: <span style={{ color: 'var(--accent-orange)' }}>${product.costPrice.toFixed(2)}</span> |
                                                Venta: <span style={{ color: 'var(--accent-green)' }}>${product.salePrice.toFixed(2)}</span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveProduct(product.id)}
                                            className="glass-button"
                                            style={{ padding: '0.25rem 0.5rem', color: 'var(--accent-red)' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Formulario para agregar nuevo producto */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Nombre del producto (ej: Leche)"
                                value={newProduct.name}
                                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                style={{ fontSize: '0.9rem' }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    className="glass-input"
                                    placeholder="Precio Costo ($)"
                                    value={newProduct.costPrice}
                                    onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                                    style={{ fontSize: '0.9rem' }}
                                />
                                <input
                                    type="number"
                                    className="glass-input"
                                    placeholder="Precio Venta ($)"
                                    value={newProduct.salePrice}
                                    onChange={(e) => setNewProduct({ ...newProduct, salePrice: e.target.value })}
                                    style={{ fontSize: '0.9rem' }}
                                />
                            </div>
                            <button
                                onClick={handleAddProduct}
                                className="glass-button primary"
                                style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                            >
                                + Agregar Producto
                            </button>
                        </div>
                    </div>
                    <button
                        className="glass-button primary"
                        style={{ marginTop: '1rem', width: '100%' }}
                        onClick={handleSave}
                        disabled={formData.products.length === 0}
                    >
                        {isEditing ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
                    </button>
                    {formData.products.length === 0 && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', textAlign: 'center', margin: '0.5rem 0 0 0' }}>
                            ⚠️ Debes agregar al menos un producto
                        </p>
                    )}
                </div>
            </Modal>
        </div>
    );
};
