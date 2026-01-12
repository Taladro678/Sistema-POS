import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useDialog } from '../context/DialogContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import RestoreDefaultCategories from '../components/RestoreDefaultCategories';
import { Plus, Edit, Trash2, Tag, Hash, X } from 'lucide-react';

export const CategoriesPage = () => {
    const { data, addItem, updateItem, deleteItem } = useData();
    const { confirm, alert } = useDialog();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [keywordInput, setKeywordInput] = useState('');

    const [formData, setFormData] = useState({
        label: '',
        keywords: []
    });

    const handleEdit = (category) => {
        setEditingCategory(category);
        setFormData({
            label: category.label,
            keywords: category.keywords || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        // Verificar si hay productos con esta categoría
        const productsWithCategory = (data.products || []).filter(p => p.category === id);

        if (productsWithCategory.length > 0) {
            const ok = await confirm({
                title: 'Eliminar Categoría',
                message: `⚠️ Esta categoría tiene ${productsWithCategory.length} producto(s) asignado(s).\n\n` +
                    `Al eliminarla, los productos quedarán sin categoría.\n\n¿Deseas continuar?`
            });
            if (!ok) return;
        }

        deleteItem('categories', id);
    };

    const handleSave = async () => {
        if (!formData.label.trim()) {
            return await alert({ title: 'Campo requerido', message: 'El nombre de la categoría es obligatorio' });
        }

        if (formData.keywords.length === 0) {
            return await alert({ title: 'Acción requerida', message: 'Agrega al menos una palabra clave para las sugerencias inteligentes' });
        }

        const categoryData = {
            label: formData.label.trim(),
            keywords: formData.keywords,
            id: editingCategory?.id || formData.label.toLowerCase().replace(/\s+/g, '_')
        };

        if (editingCategory) {
            updateItem('categories', editingCategory.id, categoryData);
        } else {
            // Verificar que no exista una categoría con el mismo ID
            const exists = (data.categories || []).find(c => c.id === categoryData.id);
            if (exists) {
                return await alert({ title: 'Nombre duplicado', message: 'Ya existe una categoría con ese nombre' });
            }
            addItem('categories', categoryData);
        }

        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setEditingCategory(null);
        setFormData({ label: '', keywords: [] });
        setKeywordInput('');
    };

    const addKeyword = () => {
        const keyword = keywordInput.trim().toLowerCase();
        if (!keyword) return;

        if (formData.keywords.includes(keyword)) {
            alert({ title: 'Duplicado', message: 'Esta palabra clave ya existe' });
            return;
        }

        setFormData({ ...formData, keywords: [...formData.keywords, keyword] });
        setKeywordInput('');
    };

    const removeKeyword = (keyword) => {
        setFormData({
            ...formData,
            keywords: formData.keywords.filter(k => k !== keyword)
        });
    };

    const handleKeywordKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addKeyword();
        }
    };

    // Calcular estadísticas
    const getCategoryStats = (categoryId) => {
        return (data.products || []).filter(p => p.category === categoryId).length;
    };

    const columns = [
        {
            header: 'Nombre',
            accessor: 'label',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Tag size={18} color="var(--accent-cyan)" />
                    <span style={{ fontWeight: 'bold' }}>{row.label}</span>
                </div>
            )
        },
        {
            header: 'Palabras Clave',
            accessor: 'keywords',
            render: (row) => (
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {(row.keywords || []).slice(0, 5).map((keyword, idx) => (
                        <span
                            key={idx}
                            style={{
                                background: 'rgba(0, 200, 255, 0.15)',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                border: '1px solid rgba(0, 200, 255, 0.3)',
                                color: 'var(--accent-cyan)'
                            }}
                        >
                            {keyword}
                        </span>
                    ))}
                    {row.keywords && row.keywords.length > 5 && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            +{row.keywords.length - 5} más
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Productos',
            accessor: 'id',
            render: (row) => {
                const count = getCategoryStats(row.id);
                return (
                    <span style={{
                        fontWeight: 'bold',
                        color: count > 0 ? 'var(--accent-green)' : 'var(--text-secondary)'
                    }}>
                        {count}
                    </span>
                );
            }
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
            {/* Compact Header Stats */}
            {/* Compact Header Stats */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Categorías</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Gestión y Clasificación</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Total</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{data.categories?.length || 0}</div>
                        </div>
                        <Tag size={18} color="var(--accent-cyan)" style={{ opacity: 0.5 }} />
                    </div>

                    <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Keywords</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
                                {(data.categories || []).reduce((sum, cat) => sum + (cat.keywords?.length || 0), 0)}
                            </div>
                        </div>
                        <Hash size={18} color="var(--accent-purple)" style={{ opacity: 0.5 }} />
                    </div>

                    <button
                        className="glass-button primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                    >
                        <Plus size={18} />
                        Nueva
                    </button>
                </div>
            </div>

            {/* Utility (Compact) */}
            <div style={{ fontSize: '0.85rem' }}>
                <RestoreDefaultCategories compact={true} />
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
                <DataTable columns={columns} data={data.categories || []} actions={actions} />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            Nombre de la Categoría
                        </label>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Ej. Bebidas, Postres, etc."
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            Palabras Clave (para sugerencias inteligentes)
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Ej. refresco, jugo, cola..."
                                style={{ flex: 1 }}
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyPress={handleKeywordKeyPress}
                            />
                            <button
                                className="glass-button primary"
                                onClick={addKeyword}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                                <Plus size={16} />
                                Agregar
                            </button>
                        </div>

                        {/* Keywords Display */}
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                            padding: '0.75rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            minHeight: '3rem',
                            border: '1px dashed rgba(255,255,255,0.1)'
                        }}>
                            {formData.keywords.length === 0 ? (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    Sin palabras clave. Agrega al menos una.
                                </span>
                            ) : (
                                formData.keywords.map((keyword, idx) => (
                                    <span
                                        key={idx}
                                        style={{
                                            background: 'rgba(0, 200, 255, 0.2)',
                                            padding: '0.35rem 0.6rem',
                                            borderRadius: '12px',
                                            fontSize: '0.85rem',
                                            border: '1px solid rgba(0, 200, 255, 0.4)',
                                            color: 'var(--accent-cyan)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={() => removeKeyword(keyword)}
                                        title="Clic para eliminar"
                                    >
                                        <Hash size={12} />
                                        {keyword}
                                        <X size={14} />
                                    </span>
                                ))
                            )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            💡 Presiona Enter o haz clic en Agregar. Clic en una palabra clave para eliminarla.
                        </p>
                    </div>

                    <button
                        className="glass-button primary"
                        style={{ marginTop: '1rem', width: '100%' }}
                        onClick={handleSave}
                    >
                        {editingCategory ? 'Actualizar Categoría' : 'Guardar Categoría'}
                    </button>
                </div>
            </Modal>
        </div >
    );
};
