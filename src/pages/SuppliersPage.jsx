import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useDialog } from '../context/DialogContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import {
    Plus, Search, Edit, Edit2, Trash2, Camera, Phone, MessageCircle,
    ChevronRight, ChevronLeft, Download, Filter,
    AlertCircle, AlertTriangle, FileText, Share2, Mail,
    Box, BookOpen, DollarSign, X
} from 'lucide-react';

// --- Sub-component: Searchable Product Selection ---
const SearchableProductSelect = ({ products, onSelect, placeholder = "Buscar producto..." }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10); // Limit results for performance/viewability

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    className="glass-input"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    style={{ paddingRight: '2.5rem' }}
                />
                <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                    <Search size={18} />
                </div>
            </div>

            {isOpen && searchTerm.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    marginTop: '0.25rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}>
                    {filtered.map(p => (
                        <div
                            key={p.id}
                            onClick={() => {
                                onSelect(p);
                                setSearchTerm('');
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '0.75rem',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            className="hover-card"
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                Costo: ${p.costPrice?.toFixed(2) || '0.00'} | Venta: ${p.price?.toFixed(2) || '0.00'}
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>
                            No se encontraron productos
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const SuppliersPage = () => {
    const { data, addItem, deleteItem, updateItem, uploadToDrive } = useData();
    const suppliers = data.suppliers || [];
    const { confirm, alert } = useDialog();
    const isMobile = window.innerWidth < 768;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [photoFile, setPhotoFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
    const [selectedTransactionId, setSelectedTransactionId] = useState(null);
    const [isNoteViewOpen, setIsNoteViewOpen] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState(null);
    const [deliveryPhotoFile, setDeliveryPhotoFile] = useState(null);

    const currentSupplier = data.suppliers.find(s => s.id === selectedSupplierId);
    const selectedTransaction = currentSupplier?.transactions?.find(t => t.id === selectedTransactionId);

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

    const [deliveryData, setDeliveryData] = useState({
        supplierId: null,
        productId: '',
        quantity: '',
        costPrice: 0
    });

    const handleDelete = async (id) => {
        const supplier = data.suppliers.find(s => s.id === id);

        if (supplier && (supplier.debt || 0) > 0) {
            return await alert({
                title: 'Acción Bloqueada',
                message: `No se puede eliminar al proveedor "${supplier.name}" porque tiene una deuda pendiente de $${supplier.debt.toFixed(2)}. Primero debes saldar la cuenta.`
            });
        }

        const ok = await confirm({
            title: 'Eliminar Proveedor',
            message: '¿Estás seguro de eliminar este proveedor?'
        });
        if (ok) {
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

    const handleAddProduct = () => {
        // Option A: Linked from inventory
        if (newProduct.productId) {
            const existingGlobalProduct = (data.products || []).find(p => p.id == newProduct.productId);
            if (!existingGlobalProduct) return;
            if (formData.products.some(p => p.id == existingGlobalProduct.id)) return;

            const product = {
                id: existingGlobalProduct.id,
                name: existingGlobalProduct.name,
                costPrice: parseFloat(newProduct.costPrice || existingGlobalProduct.costPrice || 0),
                salePrice: parseFloat(newProduct.salePrice || existingGlobalProduct.price || 0),
                isNewInInventory: false
            };

            setFormData({
                ...formData,
                products: [...formData.products, product]
            });
        }
        // Option B: New manual product
        else if (newProduct.name) {
            const product = {
                id: Date.now(),
                name: newProduct.name,
                costPrice: parseFloat(newProduct.costPrice || 0),
                salePrice: parseFloat(newProduct.salePrice || 0),
                isNewInInventory: true
            };

            setFormData({
                ...formData,
                products: [...formData.products, product]
            });
        } else {
            return;
        }

        // Reset product form
        setNewProduct({ productId: '', name: '', costPrice: '', salePrice: '' });
    };

    // Función para eliminar producto del proveedor
    const handleRemoveProduct = (productId) => {
        setFormData({
            ...formData,
            products: formData.products.filter(p => p.id !== productId)
        });
    };

    const handleSave = async () => {
        if (!formData.name) return await alert({ title: 'Error', message: 'El nombre es obligatorio' });

        let finalSupplierId = editingId;

        if (isEditing && editingId) {
            updateItem('suppliers', editingId, formData);
        } else {
            const newId = Date.now();
            finalSupplierId = newId;
            addItem('suppliers', { ...formData, id: newId });
        }

        // --- LINK PRODUCTS TO THIS SUPPLIER ---
        if (formData.products && formData.products.length > 0) {
            formData.products.forEach(p => {
                if (p.isNewInInventory) {
                    // Create NEW product in global inventory
                    addItem('products', {
                        id: p.id,
                        name: p.name,
                        costPrice: p.costPrice,
                        price: p.salePrice || 0,
                        stock: 0,
                        category: (data.categories && data.categories[0]?.id) || 'sin_categoria',
                        supplierId: finalSupplierId,
                        showInPOS: true
                    });
                } else {
                    // Update existing
                    updateItem('products', p.id, { supplierId: finalSupplierId });
                }
            });
        }

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
            inputCurrency: 'USD',
            source: 'Caja Chica',
            reference: '',
            note: '', // Field for long notes
            proof: null
        });
        setIsPaymentModalOpen(true);
    };

    const sharePaymentWhatsApp = (t, supplierName, supplierPhone) => {
        const rate = t.exchangeRate || data.exchangeRate || 1;
        const amountBs = t.originalCurrency === 'Bs' ? t.originalAmount : t.amount * rate;
        const amountUsd = t.originalCurrency === 'USD' ? t.originalAmount : t.amount;

        const message = `*Confirmación de Pago - La Auténtica POS*\n\n` +
            `📅 *Fecha:* ${new Date(t.date).toLocaleDateString()}\n` +
            `👤 *Proveedor:* ${supplierName}\n` +
            (t.originalCurrency === 'Bs' ?
                `🇻🇪 *Monto:* ${amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs ($${amountUsd.toFixed(2)})\n` :
                `💵 *Monto:* $${amountUsd.toFixed(2)} (${amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs)\n`
            ) +
            `📈 *Tasa:* ${rate.toFixed(2)} Bs/$\n` +
            `💳 *Método:* ${t.source}\n` +
            (t.reference ? `🔢 *Ref:* ${t.reference}\n` : '') +
            (t.note ? `📝 *Nota:* ${t.note}\n` : '') +
            ((t.proof && !t.proof.includes('Subiendo') && !t.proof.includes('Falló')) || t.localProof ? `📄 *Comprobante:* ${t.proof?.startsWith('http') ? t.proof : t.localProof}\n\n` : '\n') +
            `¡Gracias por su confianza!`;

        const encoded = encodeURIComponent(message);
        const phone = supplierPhone?.replace(/\D/g, '') || '';
        window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
    };

    const sharePaymentEmail = (t) => {
        const rate = t.exchangeRate || data.exchangeRate;
        const supplierName = currentSupplier?.name || 'Proveedor';
        const amountBs = t.originalCurrency === 'Bs' ? t.originalAmount : t.amount * rate;
        const amountUsd = t.originalCurrency === 'USD' ? t.originalAmount : t.amount;
        const proofLink = t.proof?.startsWith('http') && !t.proof.includes('Subiendo') ? t.proof : t.localProof;

        const subject = encodeURIComponent(`Comprobante de Pago - ${supplierName}`);
        const body = encodeURIComponent(
            `Confirmación de Pago - La Auténtica POS\n\n` +
            `Fecha: ${new Date(t.date).toLocaleDateString()}\n` +
            `Proveedor: ${supplierName}\n` +
            `Monto: ${t.originalCurrency === 'Bs' ? `${amountBs.toLocaleString()} Bs ($${amountUsd.toFixed(2)})` : `$${amountUsd.toFixed(2)} (${amountBs.toLocaleString()} Bs)`}\n` +
            `Método: ${t.source}\n` +
            (t.reference ? `Referencia: ${t.reference}\n` : '') +
            (t.note ? `Nota: ${t.note}\n` : '') +
            (proofLink ? `Comprobante: ${proofLink}\n` : '') +
            `¡Gracias!`
        );

        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    const handleRegisterPayment = async () => {
        if (!paymentData.amount || paymentData.amount <= 0) return await alert({ title: 'Error', message: 'El monto debe ser mayor a 0' });
        if (!paymentData.source) return await alert({ title: 'Error', message: 'Selecciona una fuente de pago' });
        if (!photoFile) return await alert({ title: 'Comprobante Obligatorio', message: 'Debes adjuntar una foto del comprobante para registrar el pago.' });

        const supplier = data.suppliers.find(s => s.id === paymentData.supplierId);
        if (!supplier) return;

        const rate = data.exchangeRate || 1;
        const amountInUsd = paymentData.inputCurrency === 'Bs' ?
            parseFloat(paymentData.amount) / rate :
            parseFloat(paymentData.amount);

        if (amountInUsd > (supplier.debt + 0.01)) return await alert({ title: 'Error', message: 'El monto no puede ser mayor a la deuda actual' });

        const newDebt = Math.max(0, supplier.debt - amountInUsd);
        const transactionId = Date.now();
        const fileToUpload = photoFile; // Capture for background scope

        // 1. Instant Preview (Blob URL)
        // This allows the user to see the picture immediately in the UI 
        // while the background upload happens.
        const previewUrl = URL.createObjectURL(fileToUpload);

        const transaction = {
            id: transactionId,
            date: new Date().toISOString(),
            type: 'Pago',
            amount: amountInUsd,
            originalAmount: parseFloat(paymentData.amount),
            originalCurrency: paymentData.inputCurrency,
            source: paymentData.source,
            reference: paymentData.reference,
            note: paymentData.note,
            proof: '⏳ Subiendo...',
            localProof: previewUrl, // Use blob for instant view
            exchangeRate: rate,
            balanceAfter: newDebt
        };

        // Update state immediately
        updateItem('suppliers', supplier.id, prev => ({
            debt: newDebt,
            transactions: [transaction, ...(prev.transactions || [])]
        }));

        // 2. Clear UI
        setIsPaymentModalOpen(false);
        setPhotoFile(null);
        setPaymentData(prev => ({ ...prev, amount: '', reference: '', note: '' }));

        // Create expense entry for secondary record
        const expenseId = transactionId + 100;
        addItem('expenses', {
            id: expenseId,
            date: new Date().toISOString(),
            description: `Pago a Proveedor: ${supplier.name} ${paymentData.note ? `- ${paymentData.note}` : ''}`,
            category: 'Pagos Proveedores',
            amount: amountInUsd,
            method: paymentData.source,
            proof: photoFile ? '⏳ Subiendo...' : 'N/A',
            localProof: previewUrl,
            supplierId: supplier.id,
            transactionId: transactionId
        });

        // 3. Background Upload (LOCAL + DRIVE)
        (async () => {
            let finalLocalLink = null;
            let finalCloudLink = null;

            // Step A: Local Server Upload (Faster, works offline/lan)
            try {
                const formData = new FormData();
                formData.append('proof', fileToUpload);

                // Better Server Discovery
                const serverUrl = localStorage.getItem('pos_server_url') ||
                    `${window.location.protocol}//${window.location.hostname}:3001`;

                console.log('📤 Subiendo comprobante a:', `${serverUrl}/api/upload-proof`);

                const response = await fetch(`${serverUrl}/api/upload-proof`, {
                    method: 'POST',
                    body: formData
                });
                const localResult = await response.json();
                if (localResult.success) {
                    finalLocalLink = localResult.url;
                    // Update state with permanent local link (replaces blob)
                    updateItem('suppliers', supplier.id, prev => ({
                        transactions: (prev.transactions || []).map(t =>
                            t.id === transactionId ? { ...t, localProof: finalLocalLink, proof: t.proof === '⏳ Subiendo...' ? finalLocalLink : t.proof } : t
                        )
                    }));
                    updateItem('expenses', expenseId, { proof: finalLocalLink });
                }
            } catch (err) {
                console.error('Local upload failed:', err);
            }

            // Step B: Google Drive Upload (Cloud Sync)
            try {
                const result = await uploadToDrive(fileToUpload, 'ERP La Autentica', 'Comprobantes Pago');
                if (result && result.webViewLink) {
                    finalCloudLink = result.webViewLink;
                    // Update state with cloud link as priority for "proof" field
                    updateItem('suppliers', supplier.id, prev => ({
                        transactions: (prev.transactions || []).map(t =>
                            t.id === transactionId ? { ...t, proof: finalCloudLink, localProof: finalLocalLink || t.localProof } : t
                        )
                    }));
                    updateItem('expenses', expenseId, { proof: finalCloudLink });
                } else {
                    // Drive failed, check if we have local
                    if (!finalLocalLink) {
                        updateItem('suppliers', supplier.id, prev => ({
                            transactions: (prev.transactions || []).map(t =>
                                t.id === transactionId ? { ...t, proof: '❌ Falló subida' } : t
                            )
                        }));
                        updateItem('expenses', expenseId, { proof: '❌ Falló subida' });
                    } else {
                        // If we have local but Drive failed, update status to reflect it's only local
                        updateItem('suppliers', supplier.id, prev => ({
                            transactions: (prev.transactions || []).map(t =>
                                t.id === transactionId ? { ...t, proof: finalLocalLink } : t
                            )
                        }));
                    }
                }
            } catch (err) {
                console.error('Cloud upload failed:', err);
                if (!finalLocalLink) {
                    updateItem('suppliers', supplier.id, prev => ({
                        transactions: (prev.transactions || []).map(t =>
                            t.id === transactionId ? { ...t, proof: '❌ Falló subida' } : t
                        )
                    }));
                }
            }
        })();
        // 4. WhatsApp Prompt (after closing modal)
        const ok = await confirm({
            title: 'Pago Registrado',
            message: '¿Deseas enviar el comprobante por WhatsApp al proveedor?',
            confirmText: 'Enviar WhatsApp',
            cancelText: 'Cerrar'
        });

        if (ok) {
            sharePaymentWhatsApp(transaction, supplier.name, supplier.phone);
        }
    };

    const handleOpenDelivery = (row) => {
        const supplierProducts = (data.products || []).filter(p => p.supplierId == row.id);

        if (supplierProducts.length === 0) {
            return alert({
                title: 'Sin Productos',
                message: 'No hay productos vinculados a este proveedor en el Inventario. Primero debes asignar al menos un producto a este proveedor.'
            });
        }

        setDeliveryData({
            supplierId: row.id,
            productId: supplierProducts[0].id,
            quantity: '',
            costPrice: supplierProducts[0].costPrice || 0
        });
        setIsDeliveryModalOpen(true);
    };

    const handleRegisterDelivery = async () => {
        if (!deliveryData.quantity || deliveryData.quantity <= 0) {
            return await alert({ title: 'Error', message: 'Ingresa una cantidad válida' });
        }

        if (!deliveryPhotoFile) {
            return await alert({
                title: 'Foto Obligatoria',
                message: 'Debes capturar o subir una foto de la mercancía recibida para continuar.'
            });
        }

        const supplier = data.suppliers.find(s => s.id === deliveryData.supplierId);
        // Look for the product in the global products list
        const product = (data.products || []).find(p => p.id == deliveryData.productId);

        if (!product) {
            return await alert({ title: 'Error', message: 'Producto no encontrado en el inventario global.' });
        }

        const currentQty = parseFloat(deliveryData.quantity);
        const totalCost = currentQty * (product.costPrice || 0);
        const transactionId = Date.now();

        // 1. Instant Preview (Blob URL)
        const previewUrl = URL.createObjectURL(deliveryPhotoFile);
        const fileToUpload = deliveryPhotoFile;
        setDeliveryPhotoFile(null); // Clear for next use

        // 2. Update Supplier Debt and Transactions
        updateItem('suppliers', supplier.id, prev => ({
            debt: (prev.debt || 0) + totalCost,
            transactions: [
                {
                    id: transactionId,
                    date: new Date().toISOString(),
                    type: 'Entrega',
                    productId: product.id,
                    productName: product.name,
                    quantity: currentQty,
                    amount: totalCost,
                    balanceAfter: (prev.debt || 0) + totalCost,
                    proof: '⏳ Subiendo...',
                    localProof: previewUrl
                },
                ...(prev.transactions || [])
            ]
        }));

        // 3. Update Global Product Stock
        updateItem('products', product.id, prev => ({
            stock: (prev.stock || 0) + currentQty
        }));

        setIsDeliveryModalOpen(false);

        // 4. Background Upload (LOCAL + DRIVE)
        (async () => {
            let finalLocalLink = '';
            let finalCloudLink = '';

            // Step A: Local Server Upload
            try {
                const formData = new FormData();
                formData.append('proof', fileToUpload);
                const serverUrl = localStorage.getItem('pos_server_url') || `${window.location.protocol}//${window.location.hostname}:3001`;
                const response = await fetch(`${serverUrl}/api/upload-proof`, {
                    method: 'POST',
                    body: formData
                });
                const localResult = await response.json();
                if (localResult.success) {
                    finalLocalLink = localResult.url;
                    updateItem('suppliers', supplier.id, prev => ({
                        transactions: (prev.transactions || []).map(t =>
                            t.id === transactionId ? { ...t, localProof: finalLocalLink, proof: t.proof === '⏳ Subiendo...' ? finalLocalLink : t.proof } : t
                        )
                    }));
                }
            } catch (err) { console.error('Local delivery photo upload failed:', err); }

            // Step B: Google Drive Upload
            try {
                const result = await uploadToDrive(fileToUpload, 'ERP La Autentica', 'Comprobantes Entrega');
                if (result && result.webViewLink) {
                    finalCloudLink = result.webViewLink;
                    updateItem('suppliers', supplier.id, prev => ({
                        transactions: (prev.transactions || []).map(t =>
                            t.id === transactionId ? { ...t, proof: finalCloudLink, localProof: finalLocalLink || t.localProof } : t
                        )
                    }));
                } else if (!finalLocalLink) {
                    updateItem('suppliers', supplier.id, prev => ({
                        transactions: (prev.transactions || []).map(t =>
                            t.id === transactionId ? { ...t, proof: '❌ Falló subida' } : t
                        )
                    }));
                }
            } catch (err) { console.error('Drive delivery photo upload failed:', err); }
        })();

        await alert({
            title: 'Entrega Registrada',
            message: `Se han añadido ${currentQty} unidades de "${product.name}" al inventario y se sumaron $${totalCost.toFixed(2)} a la deuda del proveedor.`
        });
    };

    const handleOpenLedger = (supplier) => {
        setSelectedSupplierId(supplier.id);
        setIsLedgerModalOpen(true);
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
        {
            header: 'Proveedor',
            accessor: 'name',
            render: (row) => (
                <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                    {row.name}
                </span>
            )
        },
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
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
            <button
                className="glass-button"
                style={{ padding: '0.5rem', color: 'var(--accent-orange)' }}
                title="Registrar Entrega"
                onClick={() => handleOpenDelivery(row)}
            >
                <Box size={16} />
            </button>
            <button
                className="glass-button"
                style={{ padding: '0.5rem', color: 'var(--accent-green)' }}
                title="Ver Libro Mayor"
                onClick={() => handleOpenLedger(row)}
            >
                <BookOpen size={16} />
            </button>
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

            <DataTable
                columns={columns}
                data={sortedSuppliers}
                actions={actions}
                onRowClick={handleOpenLedger}
            />

            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '1rem' }}>
                        <span>Registrar Pago a Proveedor</span>
                        <div style={{
                            fontSize: '0.75rem',
                            background: 'rgba(255,165,0,0.1)',
                            color: 'var(--accent-orange)',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,165,0,0.2)',
                            fontWeight: 'bold'
                        }}>
                            Tasa: {data.exchangeRate.toFixed(2)} Bs/$
                        </div>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label style={{ color: 'var(--text-secondary)' }}>Monto a Pagar ({paymentData.inputCurrency === 'USD' ? '$' : 'Bs'})</label>
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
                                <button
                                    className={`glass-button ${paymentData.inputCurrency === 'USD' ? 'active' : ''}`}
                                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', border: 'none', background: paymentData.inputCurrency === 'USD' ? 'var(--accent-blue)' : 'transparent', color: paymentData.inputCurrency === 'USD' ? '#000' : '#fff' }}
                                    onClick={() => setPaymentData({ ...paymentData, inputCurrency: 'USD' })}
                                >$</button>
                                <button
                                    className={`glass-button ${paymentData.inputCurrency === 'Bs' ? 'active' : ''}`}
                                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', border: 'none', background: paymentData.inputCurrency === 'Bs' ? 'var(--accent-blue)' : 'transparent', color: paymentData.inputCurrency === 'Bs' ? '#000' : '#fff' }}
                                    onClick={() => setPaymentData({ ...paymentData, inputCurrency: 'Bs' })}
                                >Bs</button>
                            </div>
                        </div>
                        <input
                            type="number"
                            className="glass-input"
                            placeholder="0.00"
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>
                                {paymentData.inputCurrency === 'USD' ? 'Equiv. Bs: ' : 'Equiv. USD: '}
                                <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                                    {paymentData.inputCurrency === 'USD' ?
                                        `${((parseFloat(paymentData.amount) || 0) * (data.exchangeRate || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs` :
                                        `$${((parseFloat(paymentData.amount) || 0) / (data.exchangeRate || 1)).toFixed(2)}`
                                    }
                                </span>
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>
                                Deuda: <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>
                                    ${data.suppliers.find(s => s.id === paymentData.supplierId)?.debt.toFixed(2)}
                                    <span style={{ fontSize: '0.7rem', marginLeft: '0.25rem' }}>
                                        ({((data.suppliers.find(s => s.id === paymentData.supplierId)?.debt || 0) * (data.exchangeRate || 1)).toLocaleString('es-VE', { minimumFractionDigits: 0 })} Bs)
                                    </span>
                                </span>
                            </span>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Fuente de Pago</label>
                        <select
                            className="glass-input"
                            value={paymentData.source}
                            onChange={(e) => setPaymentData({ ...paymentData, source: e.target.value })}
                        >
                            <option value="">-- Seleccionar --</option>
                            {(data.paymentMethods || []).map(pm => (
                                <option key={pm.id} value={pm.name}>{pm.name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Referencia</label>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Ref..."
                                value={paymentData.reference}
                                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                            />
                        </div>
                        <div style={{ flex: 2 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nota / Observación</label>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="..."
                                value={paymentData.note || ''}
                                onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })}
                            />
                        </div>
                    </div>
                    {/* Proof Upload (Reusing Camera/File Input logic logic) */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Comprobante (Obligatorio) 📸</label>
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
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nombre del Proveedor</label>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Ej: Distribuidora, Lácteos, etc."
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
                                                Costo: <span style={{ color: 'var(--accent-orange)' }}>${product.costPrice.toFixed(2)}</span>
                                                {product.salePrice > 0 && (
                                                    <span style={{ marginLeft: '1rem' }}>
                                                        | Venta: <span style={{ color: 'var(--accent-green)' }}>${product.salePrice.toFixed(2)}</span>
                                                    </span>
                                                )}
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
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                    className="glass-input"
                                    value={newProduct.productId}
                                    onChange={(e) => {
                                        const p = (data.products || []).find(prod => prod.id == e.target.value);
                                        setNewProduct({
                                            ...newProduct,
                                            productId: e.target.value,
                                            name: p?.name || '',
                                            costPrice: p?.costPrice || '',
                                            salePrice: p?.price || ''
                                        });
                                    }}
                                    style={{ flex: 1, fontSize: '0.9rem' }}
                                >
                                    <option value="">-- Vincular Producto del Inventario --</option>
                                    {(data.products || [])
                                        .filter(p => !p.supplierId || p.supplierId == (editingId || ''))
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (${(p.costPrice || 0).toFixed(2)})</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div style={{ marginBottom: '0.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>O escribe un nuevo nombre:</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="Nombre de producto nuevo..."
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value, productId: '' })}
                                    style={{ fontSize: '0.9rem' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Buscador de Productos</label>
                                <SearchableProductSelect
                                    products={(data.products || []).filter(p => !p.supplierId || p.supplierId == (editingId || ''))}
                                    onSelect={(p) => {
                                        setNewProduct({
                                            ...newProduct,
                                            productId: p.id,
                                            name: p.name,
                                            costPrice: p.costPrice || '',
                                            salePrice: p.price || ''
                                        });
                                    }}
                                    placeholder="Escribe para buscar..."
                                />
                            </div>

                            {/* Alternative: Manual/New product could be handled by going to ProductsPage first, 
                                but let's keep it simple for linking existing ones */}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    className="glass-input"
                                    placeholder="Confirmar Costo ($)"
                                    value={newProduct.costPrice}
                                    onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                                    style={{ fontSize: '0.85rem' }}
                                />
                                <input
                                    type="number"
                                    className="glass-input"
                                    placeholder="Confirmar Venta ($)"
                                    value={newProduct.salePrice}
                                    onChange={(e) => setNewProduct({ ...newProduct, salePrice: e.target.value })}
                                    style={{ fontSize: '0.85rem' }}
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
            <Modal
                isOpen={isDeliveryModalOpen}
                onClose={() => setIsDeliveryModalOpen(false)}
                title="Registrar Entrega de Producto"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Seleccionar Producto</label>

                        <div style={{ marginBottom: '0.5rem' }}>
                            <SearchableProductSelect
                                products={(data.products || []).filter(p => p.supplierId == deliveryData.supplierId)}
                                onSelect={(p) => {
                                    setDeliveryData({ ...deliveryData, productId: p.id, costPrice: p.costPrice || 0 });
                                }}
                                placeholder="Buscar en productos de este proveedor..."
                            />
                        </div>

                        <select
                            className="glass-input"
                            value={deliveryData.productId}
                            onChange={(e) => {
                                const prod = (data.products || []).find(p => p.id == e.target.value);
                                setDeliveryData({ ...deliveryData, productId: e.target.value, costPrice: prod?.costPrice || 0 });
                            }}
                        >
                            <option value="">-- Seleccionar --</option>
                            {(data.products || [])
                                .filter(p => p.supplierId == deliveryData.supplierId)
                                .map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (${(p.costPrice || 0).toFixed(2)})</option>
                                ))
                            }
                        </select>
                        {(data.products || []).filter(p => p.supplierId == deliveryData.supplierId).length === 0 && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', marginTop: '0.5rem' }}>
                                Nota: Este proveedor no tiene productos asignados en el inventario.
                            </p>
                        )}
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Cantidad (Unidades / Litros / Kg)</label>
                        <input
                            type="number"
                            className="glass-input"
                            placeholder="0.00"
                            value={deliveryData.quantity}
                            onChange={(e) => setDeliveryData({ ...deliveryData, quantity: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Foto de Mercancía (Obligatoria)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                background: 'rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `2px ${deliveryPhotoFile ? 'solid var(--accent-green)' : 'dashed rgba(255,255,255,0.2)'}`
                            }}>
                                {deliveryPhotoFile ? (
                                    <img
                                        src={URL.createObjectURL(deliveryPhotoFile)}
                                        alt="Preview"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <Camera size={24} color="var(--text-secondary)" />
                                )}
                            </div>

                            <label className="glass-button" style={{ cursor: 'pointer', flex: 1, textAlign: 'center', borderColor: 'var(--accent-blue)' }}>
                                {deliveryPhotoFile ? 'Cambiar Foto' : 'Tomar/Subir Foto'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    style={{ display: 'none' }}
                                    onChange={(e) => setDeliveryPhotoFile(e.target.files[0])}
                                />
                            </label>
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Total a sumar a deuda:</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-orange)' }}>
                                ${((parseFloat(deliveryData.quantity) || 0) * (deliveryData.costPrice || 0)).toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <button
                        className="glass-button primary"
                        style={{ marginTop: '0.5rem' }}
                        onClick={handleRegisterDelivery}
                    >
                        Confirmar Entrega
                    </button>
                </div>
            </Modal>

            <Modal
                isOpen={isLedgerModalOpen}
                onClose={() => setIsLedgerModalOpen(false)}
                title={`Libro Mayor: ${data.suppliers.find(s => s.id === selectedSupplierId)?.name}`}
            >
                {data.suppliers.find(s => s.id === selectedSupplierId) && (() => {
                    const currentSupplier = data.suppliers.find(s => s.id === selectedSupplierId);
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', overflowX: 'hidden' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                <div className="glass-panel" style={{ padding: '0.75rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Deuda Actual</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-red)' }}>${currentSupplier.debt.toFixed(2)}</div>
                                </div>
                                <div className="glass-panel" style={{ padding: '0.75rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ultima Entrega</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{currentSupplier.lastDelivery}</div>
                                </div>
                            </div>

                            <div style={{
                                maxHeight: '400px',
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                width: '100%',
                                display: 'block'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', tableLayout: 'fixed' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#111', zIndex: 1 }}>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <th style={{ padding: '0.75rem' }}>Fecha</th>
                                            <th style={{ padding: '0.75rem' }}>Tipo</th>
                                            <th style={{ padding: '0.75rem' }}>Detalle</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Monto</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(currentSupplier.transactions || []).length > 0 ? (
                                            currentSupplier.transactions.map((t, idx) => (
                                                <tr
                                                    key={idx}
                                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                                                    onClick={() => {
                                                        setSelectedTransactionId(t.id);
                                                        setIsNoteViewOpen(true);
                                                    }}
                                                >
                                                    <td style={{ padding: '0.75rem', opacity: 0.7 }}>{new Date(t.date).toLocaleDateString()}</td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <span style={{
                                                            padding: '0.15rem 0.4rem',
                                                            borderRadius: '4px',
                                                            fontSize: '0.7rem',
                                                            background: t.type === 'Entrega' ? 'rgba(255,165,0,0.1)' : 'rgba(0,255,0,0.1)',
                                                            color: t.type === 'Entrega' ? 'var(--accent-orange)' : 'var(--accent-green)'
                                                        }}>
                                                            {t.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        {t.type === 'Entrega' ? (
                                                            <div style={{ fontSize: '0.8rem' }}>{t.quantity} x {t.productName}</div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                                <div style={{ fontSize: '0.8rem', fontWeight: '500' }}>{t.source}</div>
                                                                {t.note && <div style={{ fontSize: '0.7rem', color: 'var(--accent-orange)', fontStyle: 'italic' }}>{t.note}</div>}
                                                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                                                    {(t.proof || t.localProof) && (t.proof !== 'N/A') && (
                                                                        (t.proof?.includes('Subiendo') && !t.localProof) ? (
                                                                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-orange)' }}>{t.proof}</span>
                                                                        ) : (t.proof?.includes('Falló') && !t.localProof) ? (
                                                                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-red)' }}>{t.proof}</span>
                                                                        ) : (
                                                                            <a
                                                                                href={t.proof?.startsWith('http') && !t.proof.includes('Subiendo') ? t.proof : t.localProof}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="glass-button"
                                                                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem', textDecoration: 'none', color: 'var(--accent-blue)' }}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                📄 Ver Comprobante
                                                                            </a>
                                                                        )
                                                                    )}
                                                                    <button
                                                                        className="glass-button"
                                                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            sharePaymentWhatsApp(t, currentSupplier.name, currentSupplier.phone);
                                                                        }}
                                                                    >
                                                                        <MessageCircle size={12} /> WhatsApp
                                                                    </button>
                                                                    <button
                                                                        className="glass-button"
                                                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            sharePaymentEmail(t, currentSupplier.name);
                                                                        }}
                                                                    >
                                                                        <Mail size={12} /> Correo
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 'bold' }}>
                                                            {t.type === 'Entrega' ? `+$${t.amount.toFixed(2)}` : `-$${t.amount.toFixed(2)}`}
                                                        </div>
                                                        {t.originalCurrency === 'Bs' && (
                                                            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>
                                                                ({t.originalAmount.toLocaleString('es-VE')} Bs)
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', opacity: 0.8 }}>
                                                        ${t.balanceAfter?.toFixed(2) || '---'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                    No hay transacciones registradas.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* Note/Details Modal */}
            <Modal
                isOpen={isNoteViewOpen}
                onClose={() => setIsNoteViewOpen(false)}
                title="Detalle de Transacción"
            >
                {selectedTransaction && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="glass-panel" style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Fecha:</span>
                                <span>{new Date(selectedTransaction.date).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Monto:</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', color: selectedTransaction.type === 'Entrega' ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
                                        {selectedTransaction.type === 'Entrega' ? '+' : '-'}${selectedTransaction.amount.toFixed(2)}
                                    </div>
                                    {(selectedTransaction.originalCurrency === 'Bs' || selectedTransaction.exchangeRate) && (
                                        <div style={{ fontSize: '0.85rem', opacity: 0.8, color: 'var(--accent-blue)' }}>
                                            ≈ {(selectedTransaction.originalCurrency === 'Bs' ? selectedTransaction.originalAmount : (selectedTransaction.amount * (selectedTransaction.exchangeRate || data.exchangeRate))).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                                        </div>
                                    )}
                                </div>
                            </div>
                            {selectedTransaction.note && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Nota:</span>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontStyle: 'italic' }}>
                                        {selectedTransaction.note}
                                    </div>
                                </div>
                            )}
                            {selectedTransaction.reference && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Referencia:</span>
                                    <code>{selectedTransaction.reference}</code>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Deuda Restante:</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                        ${selectedTransaction.balanceAfter?.toFixed(2) || '0.00'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                        ≈ {(selectedTransaction.balanceAfter * (selectedTransaction.exchangeRate || data.exchangeRate)).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                                    </div>
                                </div>
                            </div>
                        </div>

                        {(selectedTransaction.proof || selectedTransaction.localProof) && (
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Comprobante:</p>
                                {((selectedTransaction.proof?.includes('Subiendo') || selectedTransaction.proof?.includes('Falló')) && !selectedTransaction.localProof) ? (
                                    <p style={{ color: 'var(--accent-orange)' }}>{selectedTransaction.proof}</p>
                                ) : (
                                    <div style={{ position: 'relative' }}>
                                        <img
                                            src={selectedTransaction.proof?.startsWith('http') && !selectedTransaction.proof.includes('Subiendo') ? selectedTransaction.proof : selectedTransaction.localProof}
                                            alt="Comprobante"
                                            style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in' }}
                                            onClick={() => window.open(selectedTransaction.proof?.startsWith('http') && !selectedTransaction.proof.includes('Subiendo') ? selectedTransaction.proof : selectedTransaction.localProof, '_blank')}
                                            onError={(e) => {
                                                // If priority link fails, try local link
                                                if (selectedTransaction.localProof && e.target.src !== selectedTransaction.localProof) {
                                                    console.log('Falla link prioridad, intentando backup local...');
                                                    e.target.src = selectedTransaction.localProof;
                                                }
                                            }}
                                        />
                                        {(selectedTransaction.proof?.includes('Falló') && selectedTransaction.localProof) && (
                                            <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', color: 'var(--accent-orange)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem' }}>
                                                Respaldo Local
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};
