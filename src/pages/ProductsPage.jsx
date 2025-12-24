import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Plus, Edit, Trash2, Camera, Search, Tag, DollarSign } from 'lucide-react';
import { categories } from '../data/mockData';

export const ProductsPage = () => {
    const { data, addItem, updateItem, deleteItem } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: 'Hamburguesas',
        image: ''
    });

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price,
            category: product.category,
            image: product.image || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este producto? Se borrará del POS inmediatamente.')) {
            deleteItem('products', id);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price) return alert('Nombre y Precio son obligatorios');

        let imageLink = formData.image;

        if (photoFile) {
            setIsUploading(true);
            const result = await data.uploadToDrive(photoFile, 'Fotos Productos');
            setIsUploading(false);

            if (result && result.webViewLink) {
                imageLink = result.webViewLink;
            } else {
                if (!window.confirm('No se pudo subir la foto. ¿Deseas guardar sin actualizar la foto?')) {
                    return;
                }
            }
        }

        const productData = {
            ...formData,
            price: parseFloat(formData.price),
            image: imageLink
        };

        if (editingProduct) {
            updateItem('products', editingProduct.id, productData);
        } else {
            addItem('products', productData);
        }

        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setEditingProduct(null);
        setFormData({
            name: '',
            price: '',
            category: 'Hamburguesas',
            image: ''
        });
        setPhotoFile(null);
    };

    const filteredProducts = (data.products || []).filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const columns = [
        {
            header: 'Imagen',
            accessor: 'image',
            render: (row) => (
                <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', background: '#333' }}>
                    {row.image ? (
                        <img src={row.image} alt={row.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                            <Camera size={20} />
                        </div>
                    )}
                </div>
            )
        },
        { header: 'Nombre', accessor: 'name' },
        {
            header: 'Categoría',
            accessor: 'category',
            render: (row) => (
                <span style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem'
                }}>
                    {categories.find(c => c.id === row.category)?.label || row.category}
                </span>
            )
        },
        {
            header: 'Precio',
            accessor: 'price',
            render: (row) => <span style={{ fontWeight: 'bold', color: 'var(--accent-green)' }}>${row.price.toFixed(2)}</span>
        }
    ];

    const actions = (row) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
                className="glass-button"
                style={{ padding: '0.5rem' }}
                onClick={() => handleEdit(row)}
                title="Editar"
            >
                <Edit size={16} />
            </button>
            <button
                className="glass-button"
                style={{ padding: '0.5rem', color: 'var(--accent-red)' }}
                onClick={() => handleDelete(row.id)}
                title="Eliminar"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '2rem' }}>Gestión de Productos</h1>
                <button
                    className="glass-button primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                >
                    <Plus size={20} />
                    Nuevo Producto
                </button>
            </div>

            {/* Search Bar */}
            <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={20} color="var(--text-secondary)" />
                <input
                    type="text"
                    className="glass-input"
                    placeholder="Buscar productos por nombre o categoría..."
                    style={{ border: 'none', background: 'transparent', flex: 1 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <div className="glass-panel" style={{ padding: '0.75rem' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Total Productos</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{data.products?.length || 0}</p>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Categorías</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{categories.length}</p>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Valor Inventario (Venta)</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                        ${(data.products || []).reduce((acc, curr) => acc + curr.price, 0).toFixed(2)}
                    </p>
                </div>
            </div>

            <DataTable columns={columns} data={filteredProducts} actions={actions} />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nombre del Producto</label>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Ej. Hamburguesa Doble"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Precio ($)</label>
                            <div style={{ position: 'relative' }}>
                                <DollarSign size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="number"
                                    className="glass-input"
                                    placeholder="0.00"
                                    style={{ paddingLeft: '2rem' }}
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Categoría</label>
                            <select
                                className="glass-input"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Imagen</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                background: 'rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {(photoFile || formData.image) ? (
                                    <img
                                        src={photoFile ? URL.createObjectURL(photoFile) : formData.image}
                                        alt="Preview"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <Camera size={24} color="var(--text-secondary)" />
                                )}
                            </div>

                            <label className="glass-button" style={{ cursor: 'pointer', flex: 1, textAlign: 'center' }}>
                                {photoFile ? 'Cambiar Foto' : 'Subir Foto'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={(e) => setPhotoFile(e.target.files[0])}
                                />
                            </label>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            La foto se subirá automáticamente a Google Drive.
                        </p>
                    </div>

                    <button
                        className="glass-button primary"
                        style={{ marginTop: '1rem', width: '100%' }}
                        onClick={handleSave}
                        disabled={isUploading}
                    >
                        {isUploading ? 'Subiendo...' : (editingProduct ? 'Actualizar Producto' : 'Guardar Producto')}
                    </button>
                </div>
            </Modal>
        </div>
    );
};
