import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { categories } from '../data/mockData';
import { useData } from '../context/DataContext';
import ProductCard from '../components/ProductCard';
import CartSidebar from '../components/CartSidebar';
import Modal from '../components/Modal';
import { ShoppingBag, X, Search, ChevronDown, Clock, FileText, DollarSign, Calendar } from 'lucide-react';

export const POSPage = () => {
    const [cart, setCart] = useState(() => {
        try {
            const savedCart = localStorage.getItem('pos_cart');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
            return [];
        }
    });

    // Persist cart to localStorage
    React.useEffect(() => {
        localStorage.setItem('pos_cart', JSON.stringify(cart));
    }, [cart]);
    // State
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [showAllCategories, setShowAllCategories] = useState(false);
    // Cart Open State (Restored)
    const [isCartOpen, setIsCartOpen] = useState(false);


    // Payment State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(''); // Kept for compatibility or default
    const [tipAmount, setTipAmount] = useState('');

    // Split Payment State
    const [payments, setPayments] = useState([]);
    const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
    const [currentPaymentMethod, setCurrentPaymentMethod] = useState('');

    // Discount & Notes State
    const [discountValue, setDiscountValue] = useState('');
    const [discountType, setDiscountType] = useState('amount'); // 'amount' or 'percent'
    const [orderNote, setOrderNote] = useState('');

    // Hold Order State
    const [isHeldOrdersModalOpen, setIsHeldOrdersModalOpen] = useState(false);
    const { holdOrder, data, deleteHeldOrder, addTip, addItem } = useData();
    const heldOrders = data.heldOrders || [];

    // Sales Report State
    const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);

    // Cart Expansion State
    const [isCartExpanded, setIsCartExpanded] = useState(false);

    // URL Params for Table
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const tableId = searchParams.get('tableId');
    // Removed duplicate useData here
    const tables = data.tables || [];
    const currentTable = tableId ? tables.find(t => t.id === parseInt(tableId)) : null;

    // Load table order if exists
    React.useEffect(() => {
        if (currentTable && currentTable.status === 'occupied' && currentTable.currentOrderId) {
            const existingOrder = data.heldOrders.find(o => o.id === currentTable.currentOrderId);
            if (existingOrder) {
                setCart(existingOrder.items);
                // We don't delete it yet, we just load it. 
                // In a real app, we might want to distinguish between "loaded from DB" and "local changes".
                // For simplicity, we assume we are editing the live order.
            }
        }
    }, [tableId, currentTable, data.heldOrders]);

    const handleHoldOrder = () => {
        if (cart.length === 0) return;

        if (currentTable) {
            // Update existing order or create new one linked to table
            const note = `Orden Mesa ${currentTable.name}`;

            // If table already has an order, we might want to update it instead of creating a new one
            // But holdOrder creates a new one. Let's stick to holdOrder for now, 
            // but we should probably delete the old one if we are "updating".
            // Actually, holdOrder logic in DataContext updates the table with the NEW order ID.
            // So we just need to ensure we don't leave orphan orders if we are replacing.

            if (currentTable.currentOrderId) {
                deleteHeldOrder(currentTable.currentOrderId); // Remove old version
            }

            holdOrder(cart, note, { tableId: currentTable.id });
            setCart([]);
            setIsCartOpen(false);
            alert(`Orden guardada para ${currentTable.name}`);
            // Navigate back to tables? Or stay?
            // navigate('/tables'); 
        } else {
            const note = prompt("Nota para la orden (opcional):");
            if (note !== null) {
                holdOrder(cart, note);
                setCart([]);
                setIsCartOpen(false);
                alert("Orden puesta en espera.");
            }
        }
    };



    const handleRecallOrder = (order) => {
        if (cart.length > 0) {
            if (!window.confirm("Hay productos en el carrito actual. ¿Deseas reemplazarlos?")) {
                return;
            }
        }
        setCart(order.items);
        // If it's a table order, we don't delete it from heldOrders, we just load it to edit.
        // But if it's a regular held order, we delete it from "held" to "active".
        if (!order.tableId) {
            deleteHeldOrder(order.id);
        }
        setIsHeldOrdersModalOpen(false);
        setIsCartOpen(true);
    };

    // ... (rest of the component)

    const handleFinalizePayment = (overridePaymentMethod, overridePayments) => {
        // Allow passing method directly to avoid state sync issues
        const method = typeof overridePaymentMethod === 'string' ? overridePaymentMethod : selectedPaymentMethod;

        if (!method) {
            alert('Por favor selecciona un método de pago');
            return;
        }

        const discountNum = parseFloat(discountValue) || 0;
        const discountAmount = discountType === 'percent' ? (total * (discountNum / 100)) : discountNum;
        const finalTotal = Math.max(0, total - discountAmount);

        const newSale = {
            id: window.crypto.randomUUID(),
            items: cart,
            subtotal: total,
            discount: {
                type: discountType,
                value: discountNum,
                amount: discountAmount
            },
            total: finalTotal,
            note: orderNote,
            paymentMethod: method,
            tip: tipAmount ? parseFloat(tipAmount) : 0,
            date: new Date().toISOString(),
            cashier: 'Cajero 1',
            tableId: currentTable ? currentTable.id : null,
            tableName: currentTable ? currentTable.name : null,
            payments: Array.isArray(overridePayments) ? overridePayments : payments
        };

        // Save Sale
        addItem('sales', newSale);

        // Save Tip if exists
        if (tipAmount && parseFloat(tipAmount) > 0) {
            addTip(parseFloat(tipAmount));
        }

        // Clear Table if applicable
        if (currentTable && currentTable.currentOrderId) {
            deleteHeldOrder(currentTable.currentOrderId); // This also frees the table in DataContext
        }

        alert(`Venta registrada exitosamente.`);
        setCart([]);
        setTipAmount('');
        setDiscountValue('');
        setOrderNote('');
        setPayments([]);
        setIsCartOpen(false);
        setIsPaymentModalOpen(false);
        setSelectedPaymentMethod('');
    };

    // ...

    const filteredProducts = useMemo(() => {
        let result = data.products || [];
        if (selectedCategory !== 'all') {
            result = result.filter(p => p.category === selectedCategory);
        }
        if (searchQuery) {
            result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return result;
    }, [selectedCategory, searchQuery, data.products]);

    const addToCart = (product) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.id === product.id);
            if (existingItemIndex >= 0) {
                const newCart = [...prevCart];
                newCart[existingItemIndex] = {
                    ...newCart[existingItemIndex],
                    quantity: (newCart[existingItemIndex].quantity || 1) + 1
                };
                return newCart;
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.id === productId);
            if (existingItemIndex >= 0) {
                const newCart = [...prevCart];
                if (newCart[existingItemIndex].quantity > 1) {
                    newCart[existingItemIndex] = {
                        ...newCart[existingItemIndex],
                        quantity: newCart[existingItemIndex].quantity - 1
                    };
                    return newCart;
                }
                newCart.splice(existingItemIndex, 1);
                return newCart;
            }
            return prevCart;
        });
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        if (window.confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
            setCart([]);
        }
    };

    const total = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const discountNum = parseFloat(discountValue) || 0;
    const discountAmount = discountType === 'percent' ? (total * (discountNum / 100)) : discountNum;


    const handlePayClick = () => {
        setIsPaymentModalOpen(true);
    };

    const paymentMethods = [
        { id: 'bancaribe', label: 'Bancaribe', color: '#0054a6' },
        { id: 'banplus', label: 'Banplus', color: '#8dc63f' },
        { id: 'banesco', label: 'Banesco', color: '#209e33' },
        { id: 'pago_movil', label: 'Pago Móvil', color: '#f5a623' },
        { id: 'zelle', label: 'Zelle', color: '#582c83' },
        { id: 'efectivo_bs', label: 'Efectivo Bs', color: '#7f8c8d' },
        { id: 'usd', label: 'USD ($)', color: '#27ae60' },
    ];

    // Sales Report Calculations
    const sales = data.sales || [];
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const salesByMethod = sales.reduce((acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
        return acc;
    }, {});

    return (
        <div className="pos-container">
            {/* Header Info for Table */}
            {currentTable && (
                <div style={{
                    background: 'var(--accent-blue)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontWeight: 'bold' }}>📍 {currentTable.name}</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{currentTable.status === 'occupied' ? 'Ocupada' : 'Nueva Orden'}</span>
                </div>
            )}

            {/* Main Content */}
            <div className="pos-grid-area">
                {/* ... existing header ... */}



                {/* Header Container */}
                <div className="pos-header" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>

                    {/* Integrated Search & Categories (Flex 1 to take available space) */}
                    <div style={{ display: 'flex', flex: 1, gap: '0.5rem', alignItems: 'center', position: 'relative', minWidth: 0 }}>

                        {/* Expandable Search */}
                        {isSearchExpanded ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="glass-panel">
                                <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    autoFocus
                                    className="glass-input"
                                    placeholder="Buscar producto..."
                                    style={{ border: 'none', background: 'transparent', width: '100%', height: '100%', padding: '0.25rem' }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onBlur={() => !searchQuery && setIsSearchExpanded(false)}
                                />
                                <button
                                    onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: 0 }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                className="glass-button"
                                onClick={() => setIsSearchExpanded(true)}
                                style={{ padding: '0.4rem', flexShrink: 0 }}
                                title="Buscar"
                            >
                                <Search size={18} />
                            </button>
                        )}

                        {/* Categories (Hidden if Search Expanded on small screens) */}
                        {!isSearchExpanded && (
                            <>
                                <button
                                    className={`glass-button ${selectedCategory === 'all' ? 'primary' : ''}`}
                                    onClick={() => setSelectedCategory('all')}
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                                >
                                    Todos
                                </button>

                                {/* Dynamic Category List (Scrollable) */}
                                <div className="no-scrollbar" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', flex: 1, alignItems: 'center', paddingRight: '1rem', minWidth: 0 }}>
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            className={`glass-button ${selectedCategory === cat.id ? 'primary' : ''}`}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Deploy Categories Button */}
                                <button
                                    className="glass-button"
                                    style={{ padding: '0.35rem', flexShrink: 0, marginLeft: '0.25rem' }}
                                    onClick={() => setShowAllCategories(!showAllCategories)}
                                    title="Ver todas las categorías"
                                >
                                    <ChevronDown size={18} style={{ transform: showAllCategories ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                </button>
                            </>
                        )}

                        {/* Expanded Categories Panel (Overlay) */}
                        {showAllCategories && (
                            <div className="glass-panel" style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 60,
                                padding: '1rem',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                gap: '0.75rem',
                                marginTop: '0.5rem',
                                background: 'black',
                                border: '1px solid var(--accent-blue)',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
                            }}>
                                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Categorías</span>
                                    <button onClick={() => setShowAllCategories(false)} style={{ background: 'none', border: 'none', color: 'white' }}><X size={16} /></button>
                                </div>
                                <button
                                    className={`glass-button ${selectedCategory === 'all' ? 'primary' : ''}`}
                                    onClick={() => { setSelectedCategory('all'); setShowAllCategories(false); }}
                                    style={{ justifyContent: 'center' }}
                                >
                                    Todos
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        className={`glass-button ${selectedCategory === cat.id ? 'primary' : ''}`}
                                        onClick={() => { setSelectedCategory(cat.id); setShowAllCategories(false); }}
                                        style={{ justifyContent: 'center' }}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Side Buttons Group */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        {/* Reports Button */}
                        <button
                            className="glass-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.35rem'
                            }}
                            onClick={() => setIsSalesModalOpen(true)}
                            title="Reporte de Ventas"
                        >
                            <FileText size={18} />
                        </button>

                        {/* Held Orders Button */}
                        <button
                            className="glass-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.35rem'
                            }}
                            onClick={() => setIsHeldOrdersModalOpen(true)}
                            title="Ver Órdenes en Espera"
                        >
                            <Clock size={18} />
                            {heldOrders.length > 0 && (
                                <span style={{
                                    marginLeft: '0.25rem',
                                    background: 'var(--accent-orange)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    fontSize: '0.7rem',
                                    width: '16px',
                                    height: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold'
                                }}>
                                    {heldOrders.length}
                                </span>
                            )}
                        </button>

                        {/* Cart Toggle */}
                        <button
                            className="glass-button accent"
                            style={{
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center',
                                padding: '0.35rem 0.75rem',
                                whiteSpace: 'nowrap'
                            }}
                            onClick={() => setIsCartOpen(!isCartOpen)}
                        >
                            <div style={{ position: 'relative', display: 'flex' }}>
                                <ShoppingBag size={18} />
                                {cart.length > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        background: 'var(--accent-red)',
                                        color: 'white',
                                        borderRadius: '50%',
                                        fontSize: '0.7rem',
                                        width: '16px',
                                        height: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}>
                                        {cart.length}
                                    </span>
                                )}
                            </div>
                            <span style={{ fontWeight: 'bold' }}>${total.toFixed(2)}</span>
                        </button>
                    </div>
                </div>

                {/* Product Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '0.75rem',
                    overflowY: 'auto',
                    paddingRight: '0.25rem'
                }}>
                    {filteredProducts.map(product => {
                        const cartItem = cart.find(c => c.id === product.id);
                        const quantity = cartItem ? cartItem.quantity : 0;
                        return (
                            <ProductCard
                                key={product.id}
                                product={{ ...product, quantity }}
                                onAdd={addToCart}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Sidebar / Drawer */}
            <div className={`pos-cart-area ${isCartOpen ? 'open' : ''} ${isCartExpanded ? 'full-screen' : ''}`}>
                <div style={{ position: 'relative', height: '100%' }}>
                    {/* Close Button for Mobile */}
                    <button
                        className="glass-button"
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            zIndex: 60,
                            padding: '0.5rem',
                            display: isCartOpen ? 'block' : 'none'
                        }}
                        onClick={() => setIsCartOpen(false)}
                    >
                        <X size={20} />
                    </button>

                    <CartSidebar
                        cart={cart}
                        onRemove={removeFromCart}
                        onAdd={addToCart}
                        onClear={clearCart}
                        onPay={handlePayClick}
                        total={total}
                        onHold={handleHoldOrder}
                        onToggleExpand={() => setIsCartExpanded(!isCartExpanded)}
                        isExpanded={isCartExpanded}
                    />
                </div>
            </div>

            {/* Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Procesar Pago"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Totals & Remaining Compact Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                        <div className="glass-panel" style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: 0 }}>Total $</p>
                            <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-green)', margin: 0 }}>${total.toFixed(2)}</p>
                        </div>
                        <div className="glass-panel" style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: 0 }}>Total Bs</p>
                            <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-blue)', margin: 0 }}>{(total * data.exchangeRate).toFixed(2)}</p>
                        </div>
                        <div className="glass-panel" style={{ padding: '0.5rem', textAlign: 'center', background: 'rgba(255, 165, 0, 0.15)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: 0 }}>Falta</p>
                            <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-orange)', margin: 0 }}>
                                ${Math.max(0, (total - discountAmount) - payments.reduce((sum, p) => p.currency === 'USD' ? sum + p.amount : sum + (p.amount / p.rate), 0)).toFixed(2)}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--accent-orange)', margin: 0, opacity: 0.8 }}>
                                Bs {(Math.max(0, (total - discountAmount) - payments.reduce((sum, p) => p.currency === 'USD' ? sum + p.amount : sum + (p.amount / p.rate), 0)) * data.exchangeRate).toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Discount & Notes Section */}
                    <div className="glass-panel" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Descuento</span>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button
                                    onClick={() => setDiscountType('amount')}
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        border: discountType === 'amount' ? '1px solid var(--accent-green)' : '1px solid transparent',
                                        background: discountType === 'amount' ? 'rgba(0,255,0,0.1)' : 'transparent',
                                        color: discountType === 'amount' ? 'var(--accent-green)' : 'var(--text-secondary)'
                                    }}
                                >
                                    $
                                </button>
                                <button
                                    onClick={() => setDiscountType('percent')}
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        border: discountType === 'percent' ? '1px solid var(--accent-blue)' : '1px solid transparent',
                                        background: discountType === 'percent' ? 'rgba(0,100,255,0.1)' : 'transparent',
                                        color: discountType === 'percent' ? 'var(--accent-blue)' : 'var(--text-secondary)'
                                    }}
                                >
                                    %
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="number"
                                className="glass-input"
                                placeholder={discountType === 'percent' ? "0%" : "$0.00"}
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value)}
                                style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                            />
                            {discountType === 'percent' && (
                                <button
                                    className="glass-button"
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: '1px dashed var(--accent-blue)' }}
                                    onClick={() => {
                                        if (data.defaultForeignCurrencyDiscountPercent) {
                                            setDiscountValue(data.defaultForeignCurrencyDiscountPercent.toString());
                                        } else {
                                            alert('No hay porcentaje configurado en Ajustes.');
                                        }
                                    }}
                                    title="Aplicar Promo Divisa Configurada"
                                >
                                    Promo Divisa
                                </button>
                            )}
                        </div>
                        <textarea
                            className="glass-input"
                            placeholder="Notas de la venta (opcional)..."
                            value={orderNote}
                            onChange={(e) => setOrderNote(e.target.value)}
                            style={{ width: '100%', height: '40px', fontSize: '0.85rem', resize: 'none' }}
                        />
                    </div>

                    {/* Add Payment Compact Section */}
                    <div className="glass-panel" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>


                        {/* Inputs Row */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="number"
                                className="glass-input"
                                placeholder="Monto"
                                value={currentPaymentAmount}
                                onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                                style={{ flex: 1, height: '32px', fontSize: '0.9rem' }}
                            />
                            <select
                                value={currentPaymentMethod}
                                onChange={(e) => setCurrentPaymentMethod(e.target.value)}
                                style={{
                                    flex: 1.5,
                                    height: '32px',
                                    fontSize: '0.9rem',
                                    color: '#ffffff',
                                    backgroundColor: '#000000',
                                    border: '1px solid #444',
                                    borderRadius: '4px',
                                    padding: '0 0.5rem'
                                }}
                            >
                                <option value="" style={{ color: '#ffffff', backgroundColor: '#000000' }}>Método...</option>
                                {paymentMethods.map(m => (
                                    <option key={m.id} value={m.label} style={{ color: '#ffffff', backgroundColor: '#000000' }}>{m.label}</option>
                                ))}
                            </select>
                            <button
                                className="glass-button accent"
                                onClick={() => {
                                    if (!currentPaymentAmount || !currentPaymentMethod) return;
                                    const amount = parseFloat(currentPaymentAmount);
                                    if (isNaN(amount) || amount <= 0) return;

                                    const selectedMethodObj = paymentMethods.find(m => m.label === currentPaymentMethod);
                                    const isBsMethod = selectedMethodObj && ['pago_movil', 'bancaribe', 'banplus', 'banesco', 'efectivo_bs'].includes(selectedMethodObj.id);

                                    const newPayment = {
                                        id: Date.now(),
                                        method: currentPaymentMethod,
                                        amount: amount,
                                        currency: isBsMethod ? 'Bs' : 'USD',
                                        rate: data.exchangeRate
                                    };
                                    setPayments([...payments, newPayment]);
                                    setCurrentPaymentAmount('');
                                    setCurrentPaymentMethod('');
                                }}
                                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            >
                                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
                            </button>
                        </div>
                    </div>

                    {/* Payments List (Compact) */}
                    {payments.length > 0 && (
                        <div style={{ maxHeight: '80px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {payments.map(p => (
                                <div key={p.id} className="glass-panel" style={{ padding: '0.25rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                    <span>{p.method} ({p.currency})</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontWeight: 'bold' }}>
                                            {p.currency === 'USD' ? `$${p.amount.toFixed(2)}` : `Bs ${p.amount.toFixed(2)}`}
                                        </span>
                                        <button
                                            onClick={() => setPayments(payments.filter(pay => pay.id !== p.id))}
                                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: 0, display: 'flex' }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tip & Confirm Row */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: '0 0 auto' }}>
                            <label style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Propina:</label>
                            <input
                                type="number"
                                className="glass-input"
                                placeholder="$0"
                                value={tipAmount}
                                onChange={(e) => setTipAmount(e.target.value)}
                                style={{ width: '60px', height: '28px', fontSize: '0.8rem', padding: '0.25rem' }}
                            />
                        </div>
                        <button
                            className="glass-button accent"
                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.9rem', justifyContent: 'center' }}
                            onClick={() => {
                                const totalPaid = payments.reduce((sum, p) => p.currency === 'USD' ? sum + p.amount : sum + (p.amount / p.rate), 0);
                                if (totalPaid < total - 0.01) {
                                    alert(`Falta por pagar: $${(total - totalPaid).toFixed(2)}`);
                                    return;
                                }
                                const methodString = payments.map(p => `${p.method} (${p.currency === 'USD' ? '$' : 'Bs'}${p.amount})`).join(', ');
                                handleFinalizePayment(methodString, payments);
                            }}
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Held Orders Modal */}
            <Modal
                isOpen={isHeldOrdersModalOpen}
                onClose={() => setIsHeldOrdersModalOpen(false)}
                title="Órdenes en Espera"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
                    {heldOrders.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay órdenes en espera.</p>
                    ) : (
                        heldOrders.map(order => (
                            <div key={order.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{order.note || 'Sin nota'}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {new Date(order.timestamp).toLocaleTimeString()} - {order.items.length} items
                                    </p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                                        Total: ${order.total.toFixed(2)}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="glass-button primary"
                                        onClick={() => handleRecallOrder(order)}
                                        style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                                    >
                                        Recuperar
                                    </button>
                                    <button
                                        className="glass-button"
                                        onClick={() => {
                                            if (window.confirm('¿Eliminar esta orden?')) {
                                                deleteHeldOrder(order.id);
                                            }
                                        }}
                                        style={{ fontSize: '0.8rem', padding: '0.5rem', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            {/* Sales Report Modal */}
            <Modal
                isOpen={isSalesModalOpen}
                onClose={() => setIsSalesModalOpen(false)}
                title="Reporte de Ventas"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>

                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', background: 'rgba(39, 174, 96, 0.1)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ventas Totales</p>
                            <h3 style={{ fontSize: '1.8rem', color: 'var(--accent-green)', margin: '0.5rem 0' }}>
                                ${totalSales.toFixed(2)}
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sales.length} transacciones</p>
                        </div>
                        <div className="glass-panel" style={{ padding: '1rem' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Por Método</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {Object.entries(salesByMethod).map(([method, amount]) => (
                                    <div key={method} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span>{method}</span>
                                        <span style={{ fontWeight: 'bold' }}>${amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Transaction List */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={16} /> Historial de Transacciones
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {sales.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay ventas registradas.</p>
                            ) : (
                                sales.slice().reverse().map(sale => (
                                    <div key={sale.id} className="glass-panel" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: 'bold' }}>${sale.total.toFixed(2)}</span>
                                                <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                                    {sale.paymentMethod}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                {new Date(sale.date).toLocaleString()} - {sale.items.length} items
                                            </p>
                                        </div>
                                        {sale.tip > 0 && (
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Propina</p>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--accent-green)' }}>+${sale.tip.toFixed(2)}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Overlay for mobile */}
            {isCartOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 40,
                        backdropFilter: 'blur(4px)'
                    }}
                    onClick={() => setIsCartOpen(false)}
                />
            )}
        </div>
    );
};
