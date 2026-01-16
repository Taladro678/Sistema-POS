import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useDialog } from '../context/DialogContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ExcelImporter from '../components/ExcelImporter';
import { Plus, Upload, Edit, Trash2, ShoppingCart, Package, Camera, Search, DollarSign, FileSpreadsheet, Sparkles, X } from 'lucide-react';
import { suggestCategory } from '../services/categorySuggestion';
import { CategoriesPage } from './CategoriesPage';

export const ProductsPage = () => {
    const { data, addItem, updateItem, deleteItem, updateData } = useData();
    const { confirm, alert } = useDialog();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [activeTab, setActiveTab] = useState('products'); // 'products' or 'categories'

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        costPrice: '', // Precio de costo
        stock: '', // Cantidad disponible
        category: '',
        image: '',
        showInPOS: true // true = se vende en POS, false = materia prima
    });


    const [suggestedCategory, setSuggestedCategory] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price,
            costPrice: product.costPrice || '',
            stock: product.stock !== undefined ? product.stock : '',
            category: product.category,
            image: product.image || '',
            showInPOS: product.showInPOS !== undefined ? product.showInPOS : true
        });
        setSuggestedCategory(null); // Clear suggestion when editing
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const ok = await confirm({
            title: 'Eliminar Producto',
            message: '¿Estás seguro de eliminar este producto? Se borrará del POS inmediatamente.'
        });
        if (ok) {
            deleteItem('products', id);
        }
    };

    const handleDeleteAll = async () => {
        const ok = await confirm({
            title: '⚠️ PELIGRO: Borrar Todo',
            message: '¿Estás seguro de que quieres BORRAR TODOS los productos?\n\nEsta acción eliminará todo el inventario de productos permanentemente y no se puede deshacer.'
        });
        if (ok) {
            const finalOk = await confirm({
                title: 'Confirmación Final',
                message: '¿Realmente deseas vaciar la lista de productos?'
            });
            if (finalOk) {
                updateData('products', []);
            }
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price) return await alert({ title: 'Campos requeridos', message: 'Nombre y Precio son obligatorios' });

        let imageLink = formData.image;

        if (photoFile) {
            setIsUploading(true);
            const result = await data.uploadToDrive(photoFile, 'Fotos Productos');
            setIsUploading(false);

            if (result && result.webViewLink) {
                imageLink = result.webViewLink;
            } else {
                const ok = await confirm({
                    title: 'Error de carga',
                    message: 'No se pudo subir la foto. ¿Deseas guardar sin actualizar la foto?'
                });
                if (!ok) return;
            }
        }

        const productData = {
            name: formData.name,
            price: parseFloat(formData.price),
            costPrice: formData.costPrice ? parseFloat(formData.costPrice) : 0,
            stock: formData.stock ? parseInt(formData.stock) : 0,
            category: formData.category,
            showInPOS: formData.showInPOS,
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

    // Intelligent category suggestion when product name changes
    useEffect(() => {
        if (formData.name && !editingProduct && (data.categories || []).length > 0) {
            const suggestion = suggestCategory(formData.name, data.categories);
            setSuggestedCategory(suggestion);

            // Auto-apply suggestion after 1 second if user hasn't selected a category
            const timer = setTimeout(() => {
                if (suggestion && (!formData.category || formData.category === '')) {
                    setFormData(prev => ({ ...prev, category: suggestion.id }));
                }
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [formData.name, editingProduct, data.categories, formData.category]);

    const resetForm = () => {
        setEditingProduct(null);
        setFormData({
            name: '',
            price: '',
            costPrice: '',
            stock: '',
            category: '',
            image: '',
            showInPOS: true
        });
        setPhotoFile(null);
        setSuggestedCategory(null);
    };

    const handleImportData = async (excelData) => {
        let successCount = 0;
        let autoCategorized = 0;

        for (const row of excelData) {
            let rawSymbol = row['A'];
            let rawName = row['B'];
            let rawCost = row['K'];
            let rawPrice = row['N'];

            if (!rawName && rawSymbol && String(rawSymbol).length > 3) {
                rawName = rawSymbol;
            }

            if (!rawName) continue;

            let strName = String(rawName).trim();
            if (strName === 'Nombre' || strName === 'NOMBRE') continue;

            const skipKeywords = ['Periodo Mensual', 'Existencia Inicial', 'Ordenes de', 'Facturas Ventas', 'Notas de', 'Recep. de', 'Existencia Final', 'Total'];
            if (skipKeywords.some(kw => strName.includes(kw))) continue;
            if (/^\d+$/.test(strName)) continue;

            let cleanName = strName.replace(/^[+\-*]\s*/, '').trim();
            if (!cleanName) continue;

            const parseCurrency = (val) => {
                if (typeof val === 'number') return val;
                if (typeof val === 'string') {
                    let cleanVal = val.replace(/[^\d,.-]/g, '');
                    cleanVal = cleanVal.replace(',', '.');
                    return parseFloat(cleanVal) || 0;
                }
                return 0;
            };

            let price = parseCurrency(rawPrice);
            if (price === 0 && row['O']) price = parseCurrency(row['O']);
            const cost = parseCurrency(rawCost);

            let category = '';
            if (data.categories && data.categories.length > 0) {
                const suggestion = suggestCategory(cleanName, data.categories);
                if (suggestion && suggestion.confidence !== 'low') {
                    category = suggestion.id;
                    autoCategorized++;
                }
            }

            // Duplicate Handling: Check if product already exists by name
            const existingProduct = (data.products || []).find(p => p.name.toLowerCase() === cleanName.toLowerCase());

            const productData = {
                name: cleanName,
                price: price,
                costPrice: cost,
                stock: existingProduct ? existingProduct.stock : 0,
                category: category || (existingProduct ? existingProduct.category : ''),
                image: existingProduct ? existingProduct.image : '',
                showInPOS: true
            };

            if (existingProduct) {
                updateItem('products', existingProduct.id, productData);
            } else {
                addItem('products', productData);
            }
            successCount++;
        }

        setShowImportModal(false);

        if (successCount === 0) {
            const firstRow = excelData.find(r => r['B'] && String(r['B']).length > 3) || excelData[0];
            await alert({
                title: 'Importación Fallida',
                message: `⚠️ No se importaron productos.\n\n` +
                    `Depuración (Fila Ejemplo): ${JSON.stringify(firstRow)}\n\n` +
                    `El sistema buscó el nombre en la Columna B y el precio en la Columna N.`
            });
        } else {
            await alert({
                title: 'Importación Exitosa',
                message: `✅ Importación completada\n\n` +
                    `Productos procesados: ${successCount} \n` +
                    `Categorizados automáticamente: ${autoCategorized}`
            });
        }
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
                    {(data.categories || []).find(c => c.id === row.category)?.label || row.category}
                </span>
            )
        },
        {
            header: 'Precio Venta',
            accessor: 'price',
            render: (row) => (
                <span style={{
                    color: 'var(--accent-green)',
                    fontWeight: 'bold',
                    fontSize: '1.05rem'
                }}>
                    ${row.price.toFixed(2)}
                </span>
            )
        },
        {
            header: 'Precio Costo',
            accessor: 'costPrice',
            render: (row) => {
                const cost = row.costPrice || 0;
                const margin = row.price - cost;
                const marginPercent = cost > 0 ? ((margin / cost) * 100).toFixed(0) : 0;
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                            ${cost.toFixed(2)}
                        </span>
                        {cost > 0 && (
                            <span style={{
                                fontSize: '0.7rem',
                                color: margin > 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                            }}>
                                +{marginPercent}%
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Cantidad',
            accessor: 'stock',
            render: (row) => {
                const stock = row.stock !== undefined ? row.stock : 0;
                const isLow = stock < 10;
                const isEmpty = stock === 0;
                return (
                    <span style={{
                        color: isEmpty ? 'var(--accent-red)' : isLow ? 'var(--accent-orange)' : 'var(--text-primary)',
                        fontWeight: isEmpty || isLow ? 'bold' : 'normal'
                    }}>
                        {stock} {isEmpty ? '⚠️' : isLow ? '⚡' : ''}
                    </span>
                );
            }
        },
        {
            header: 'Tipo',
            accessor: 'showInPOS',
            render: (row) => {
                const isPOS = row.showInPOS !== undefined ? row.showInPOS : true;
                return (
                    <span style={{
                        background: isPOS ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 165, 0, 0.1)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        border: `1px solid ${isPOS ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 165, 0, 0.3)'}`,
                        color: isPOS ? 'var(--accent-green)' : 'var(--accent-orange)'
                    }}>
                        {isPOS ? '🛒 Venta POS' : '📦 Materia Prima'}
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
                style={{ padding: '0.5rem' }}
                onClick={() => handleDelete(row.id)}
                title="Eliminar"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1.5rem', height: '100%' }}>
            {/* Ultra Compact Header Toolbar */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '0.75rem',
                alignItems: isMobile ? 'stretch' : 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem'
            }}>
                {/* Left: Tabs as Segmented Control */}
                <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                    <div className="glass-panel" style={{ padding: '0.25rem', display: 'flex', flexDirection: 'row', gap: '0.25rem', borderRadius: '10px', background: 'rgba(0,0,0,0.2)' }}>
                        <button
                            className={`glass-button ${activeTab === 'products' ? 'primary' : ''}`}
                            onClick={() => setActiveTab('products')}
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', borderRadius: '8px', height: '32px' }}
                        >
                            <Package size={14} style={{ marginRight: '0.4rem' }} />
                            Prod.
                        </button>
                        <button
                            className={`glass-button ${activeTab === 'categories' ? 'primary' : ''}`}
                            onClick={() => setActiveTab('categories')}
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', borderRadius: '8px', height: '32px' }}
                        >
                            <Sparkles size={14} style={{ marginRight: '0.4rem' }} />
                            Cat.
                        </button>
                    </div>
                </div>

                {/* Center: Stats OR Search Bar */}
                {activeTab === 'products' && (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        {isSearchActive ? (
                            <div className="glass-panel" style={{
                                padding: '0.25rem 0.75rem',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '0.5rem',
                                borderRadius: '20px',
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid var(--accent-blue)',
                                width: '100%',
                                maxWidth: '400px'
                            }}>
                                <Search size={16} className="text-blue-400" />
                                <input
                                    type="text"
                                    autoFocus
                                    className="bg-transparent border-none text-white placeholder-gray-400 w-full focus:outline-none text-sm"
                                    placeholder="Buscar..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onBlur={() => !searchQuery && setIsSearchActive(false)}
                                />
                                <button
                                    onClick={() => { setSearchQuery(''); setIsSearchActive(false); }}
                                    className="p-1 hover:text-white text-gray-400"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : !isMobile ? (
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>Total:</span>
                                    <span style={{ color: 'white', fontWeight: 'bold' }}>{data.products?.length || 0}</span>
                                </div>
                                <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }}></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>Valor:</span>
                                    <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>
                                        ${(data.products || []).reduce((acc, curr) => acc + curr.price, 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Right: Actions */}
                {activeTab === 'products' && (
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                        {isMobile && !isSearchActive && (
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <span style={{ color: 'white' }}>{data.products?.length || 0}</span> Prod.
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {!isSearchActive && (
                                <button
                                    className="glass-button"
                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', height: '32px' }}
                                    onClick={() => setIsSearchActive(true)}
                                    title="Buscar"
                                >
                                    <Search size={16} />
                                </button>
                            )}
                            <button
                                className="glass-button primary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', height: '32px' }}
                                onClick={() => { resetForm(); setIsModalOpen(true); }}
                            >
                                <Plus size={16} style={{ marginRight: isMobile ? 0 : '0.4rem' }} />
                                {!isMobile && 'Nuevo Producto'}
                            </button>
                            <button
                                className="glass-button"
                                style={{ padding: '0.4rem 0.6rem', height: '32px' }}
                                onClick={() => setShowImportModal(true)}
                                title="Importar Excel"
                            >
                                <Upload size={16} />
                            </button>
                            <button
                                className="glass-button"
                                onClick={handleDeleteAll}
                                title="Borrar Todo"
                                style={{ padding: '0.4rem 0.6rem', height: '32px', color: 'var(--accent-red)' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {activeTab === 'categories' ? (
                <CategoriesPage />
            ) : (
                <>


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


                                {/* Price Fields */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', gridColumn: '1 / -1' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                            Precio de Costo *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="glass-input"
                                            placeholder="0.00"
                                            value={formData.costPrice}
                                            onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                            Precio de Venta * (POS)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="glass-input"
                                            placeholder="0.00"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Margin Calculation Display */}
                                {formData.costPrice && formData.price && parseFloat(formData.costPrice) > 0 && (
                                    <div className="glass-panel" style={{
                                        gridColumn: '1 / -1',
                                        padding: '0.75rem',
                                        background: 'rgba(0, 255, 0, 0.05)',
                                        border: '1px solid rgba(0, 255, 0, 0.2)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                            <span>Margen de Ganancia:</span>
                                            <strong style={{ color: 'var(--accent-green)' }}>
                                                ${(parseFloat(formData.price) - parseFloat(formData.costPrice)).toFixed(2)}
                                                ({(((parseFloat(formData.price) - parseFloat(formData.costPrice)) / parseFloat(formData.costPrice)) * 100).toFixed(0)}%)
                                            </strong>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                        Cantidad Disponible (Stock)
                                    </label>
                                    <input
                                        type="number"
                                        className="glass-input"
                                        placeholder="0"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                    />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                                        Inventario actual del producto
                                    </span>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Categoría</label>

                                    {/* Smart Suggestion Badge */}
                                    {suggestedCategory && !editingProduct && suggestedCategory.confidence !== 'low' && (
                                        <div style={{
                                            background: 'rgba(168, 85, 247, 0.1)',
                                            border: '1px solid rgba(168, 85, 247, 0.3)',
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '8px',
                                            marginBottom: '0.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            animation: 'pulse 2s ease-in-out infinite'
                                        }}>
                                            <Sparkles size={16} color="rgb(168, 85, 247)" />
                                            <span style={{ fontSize: '0.85rem', color: 'rgb(168, 85, 247)' }}>
                                                <strong>Sugerencia:</strong> {suggestedCategory.label}
                                            </span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                marginLeft: 'auto',
                                                opacity: 0.7
                                            }}>
                                                Confianza: {suggestedCategory.confidence === 'high' ? '🔥 Alta' : '✓ Media'}
                                            </span>
                                        </div>
                                    )}

                                    <select
                                        className="glass-input"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {(data.categories || []).map(cat => (
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

                            {/* Nuevo: Tipo de Producto */}
                            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255, 165, 0, 0.05)', border: '1px solid rgba(255, 165, 0, 0.2)' }}>
                                <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--accent-orange)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    Tipo de Producto
                                </label>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        cursor: 'pointer',
                                        padding: '0.75rem',
                                        background: formData.showInPOS ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255,255,255,0.03)',
                                        borderRadius: '8px',
                                        border: `2px solid ${formData.showInPOS ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)'} `,
                                        transition: 'all 0.2s'
                                    }}>
                                        <input
                                            type="radio"
                                            name="productType"
                                            checked={formData.showInPOS}
                                            onChange={() => setFormData({ ...formData, showInPOS: true })}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>🛒 Producto de Venta</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                Se muestra en el POS y se puede vender directamente
                                            </div>
                                        </div>
                                    </label>

                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        cursor: 'pointer',
                                        padding: '0.75rem',
                                        background: !formData.showInPOS ? 'rgba(255, 165, 0, 0.1)' : 'rgba(255,255,255,0.03)',
                                        borderRadius: '8px',
                                        border: `2px solid ${!formData.showInPOS ? 'var(--accent-orange)' : 'rgba(255,255,255,0.1)'} `,
                                        transition: 'all 0.2s'
                                    }}>
                                        <input
                                            type="radio"
                                            name="productType"
                                            checked={!formData.showInPOS}
                                            onChange={() => setFormData({ ...formData, showInPOS: false })}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>📦 Materia Prima</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                NO se muestra en POS. Solo para inventario (ej: Cochino en canal)
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                {!formData.showInPOS && (
                                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(255, 165, 0, 0.1)', borderRadius: '6px', fontSize: '0.75rem' }}>
                                        💡 <strong>Ejemplo:</strong> "Cochino en canal" es materia prima. Luego vendes productos finales como "Cochino Frito" o "Cochino en Brasa"
                                    </div>
                                )}
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

                    {/* Excel Import Modal */}
                    <Modal
                        isOpen={showImportModal}
                        onClose={() => setShowImportModal(false)}
                        title="Importar Productos desde Excel"
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0, 200, 255, 0.05)', border: '1px solid rgba(0, 200, 255, 0.2)' }}>
                                <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    📋 Formato del Excel
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                    El archivo debe tener las siguientes columnas:
                                </p>
                                <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.5rem', margin: 0 }}>
                                    <li><strong>Nombre</strong> (obligatorio)</li>
                                    <li><strong>Precio</strong> (obligatorio, número)</li>
                                    <li><strong>Categoría</strong> (opcional - se sugerirá automáticamente si está vacío)</li>
                                    <li><strong>Imagen</strong> (opcional, URL)</li>
                                </ul>
                            </div>

                            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Sparkles size={16} color="rgb(168, 85, 247)" />
                                    <h3 style={{ color: 'rgb(168, 85, 247)', fontSize: '0.9rem', margin: 0 }}>
                                        Categorización Inteligente
                                    </h3>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    Si un producto no tiene categoría, el sistema la sugerirá automáticamente según su nombre.
                                    Ejemplo: "Coca-Cola" → Bebidas, "Hamburguesa Doble" → Hamburguesas
                                </p>
                            </div>

                            <ExcelImporter
                                buttonText="Seleccionar Archivo Excel"
                                templateName="productos"
                                sheetToJsonOptions={{ header: "A", defval: "" }} // Usar letras de columna (A, B, C...)
                                onDataLoaded={handleImportData}
                            />
                        </div>
                    </Modal>
                </>
            )}
        </div>
    );
};

