import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ProductCard from '../components/ProductCard';
import CartSidebar from '../components/CartSidebar';
import Modal from '../components/Modal';
import { ShoppingBag, X, Search, ChevronDown, Clock, FileText, DollarSign, Calendar, Coffee, UserPlus, User, Trash2, AlertTriangle, Plus } from 'lucide-react';

import ClientSearchModal from '../components/ClientSearchModal';

export const POSPage = () => {
    const { holdOrder, data, deleteHeldOrder, cancelHeldOrder, restoreCancelledOrder, permanentlyDeleteOrder, addTip, addItem, updateItem, sendOrderToProduction } = useData();
    const { currentUser } = useAuth();
    const { addToast } = useToast();

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

    // Use defined categories from data context to ensure all are visible, not just those with products
    const displayCategories = data.categories || [];
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [showAllCategories, setShowAllCategories] = useState(false);
    // Cart Open State (Restored)
    const [isCartOpen, setIsCartOpen] = useState(false);
    // Mobile Detection
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    // Payment State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(''); // Kept for compatibility or default
    const [tipAmount, setTipAmount] = useState('');

    // Split Payment State
    const [payments, setPayments] = useState([]);
    const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
    const [currentPaymentMethod, setCurrentPaymentMethod] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState(''); // For Credit Payments

    // Discount & Notes State
    const [discountValue, setDiscountValue] = useState('');
    const [discountType, setDiscountType] = useState('amount'); // 'amount' or 'percent'
    const [orderNote, setOrderNote] = useState('');

    // Client Search Modal
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);

    // Hold Order State
    const [isHeldOrdersModalOpen, setIsHeldOrdersModalOpen] = useState(false);
    const [heldOrderTab, setHeldOrderTab] = useState('active'); // 'active' | 'trash'

    // Auth Context
    // const { currentUser } = useAuth(); // Moved to top
    const heldOrders = data.heldOrders || [];
    const cancelledOrders = data.cancelledOrders || [];

    // Sales Report State
    const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);

    // Cart Expansion State
    const [isCartExpanded, setIsCartExpanded] = useState(false);

    // Priority State
    const [orderPriority, setOrderPriority] = useState('normal');
    // Takeaway State
    const [isTakeaway, setIsTakeaway] = useState(false);

    const updateItemPriority = (index, priority) => {
        const newCart = [...cart];
        if (newCart[index]) {
            newCart[index] = { ...newCart[index], priority };
            setCart(newCart);
        }
    };

    const toggleItemTakeaway = (index) => {
        const newCart = [...cart];
        if (newCart[index]) {
            newCart[index] = { ...newCart[index], isTakeaway: !newCart[index].isTakeaway };
            setCart(newCart);
        }
    };

    // URL Params for Table
    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(location.search);
    const tableId = searchParams.get('tableId');
    const orderId = searchParams.get('orderId');

    // State for Editing
    const [originalOrder, setOriginalOrder] = useState(null);

    // Removed duplicate useData here
    const tables = data.tables || [];
    const currentTable = tableId ? tables.find(t => t.id === parseInt(tableId)) : null;

    // Load table order if exists
    React.useEffect(() => {
        if (currentTable && currentTable.status === 'occupied' && currentTable.currentOrderId) {
            const existingOrder = data.heldOrders.find(o => o.id === currentTable.currentOrderId);
            if (existingOrder) {
                setCart(existingOrder.items);
                setOriginalOrder(existingOrder);
                setOrderNote(existingOrder.note || '');
                setIsTakeaway(existingOrder.takeaway || false);
                setOrderPriority(existingOrder.priority || 'normal');
            }
        }
    }, [tableId, currentTable, data.heldOrders]);

    // Load non-table order (Edit Mode)
    React.useEffect(() => {
        if (orderId && !tableId) {
            const existingOrder = data.heldOrders.find(o => o.id === parseInt(orderId) || o.id === orderId); // Check both types
            if (existingOrder) {
                setCart(existingOrder.items);
                setOriginalOrder(existingOrder);
                setOrderNote(existingOrder.note || '');
                setIsTakeaway(existingOrder.takeaway || false);
                setOrderPriority(existingOrder.priority || 'normal');
                // Allow editing customer if linked
                if (existingOrder.customerId) setSelectedCustomerId(existingOrder.customerId);
            }
        }
    }, [orderId, data.heldOrders, tableId]);

    const handleCancelCurrentOrder = () => {
        if (!currentTable) return;

        if (window.confirm(`⚠️ ¿Estás seguro de CANCELAR el pedido de la mesa ${currentTable.name}? \n\nEsta acción registrará el pedido como cancelado en el historial y liberará la mesa.`)) {
            if (currentTable.currentOrderId) {
                cancelHeldOrder(currentTable.currentOrderId);
                alert('Pedido cancelado y mesa liberada.');
                navigate('/tables');
            } else {
                updateItem('tables', currentTable.id, { currentOrder: [], status: 'available' });
                setCart([]);
                alert('Mesa liberada.');
                navigate('/tables');
            }
        }
    };

    const handleHoldOrder = () => {
        if (cart.length === 0) return;

        const note = prompt("Nota para poner en espera (opcional):", orderNote);
        if (note !== null) {
            // Strict "En Espera" Logic: ONLY 'Hold' button sets isWaitList=true
            // If editing, delete original?
            // "Hold" usually usually implies "Save as Draft".
            // If I was editing "Order 123", and I click Hold, should I update 123 or create new?
            // User flow: "Edit order -> Hold" changes it to "En Espera" status?
            // Let's assume yes.
            if (originalOrder && !originalOrder.tableId) {
                deleteHeldOrder(originalOrder.id);
            }

            const metadata = {
                isWaitList: true,
                takeaway: isTakeaway,
                priority: orderPriority,
                customerId: selectedCustomerId,
                createdBy: originalOrder?.createdBy || currentUser?.username || 'Cajero', // Preserve creator
                modifiedBy: originalOrder ? (currentUser?.username || 'Cajero') : null
            };

            holdOrder(cart, note || 'En Espera', metadata);
            setCart([]);
            setOriginalOrder(null);
            setIsCartOpen(false);
            setOrderNote('');
            setIsTakeaway(false);
            alert("Orden puesta en espera.");
            addToast("Orden puesta en espera", 'info');
            if (orderId) navigate('/'); // Clear URL
        }
    };

    const handleSendToKitchen = () => {
        if (cart.length === 0) return;

        // Resolve Customer Name
        const selectedCustomer = data.customers.find(c => c.id === selectedCustomerId);
        const customerName = selectedCustomer ? selectedCustomer.name : 'Cliente General';

        const orderMetadata = {
            createdBy: originalOrder?.createdBy || currentUser?.username || 'Cajero', // Persist Original Creator
            modifiedBy: originalOrder ? (currentUser?.username || 'Cajero') : null, // Add modifier
            customerId: selectedCustomerId,
            customerName: customerName,
            priority: orderPriority,
            takeaway: isTakeaway
        };

        if (currentTable) {
            // Table Order
            orderMetadata.tableId = currentTable.id;
            orderMetadata.tableName = currentTable.name;

            // Send to Production (Kitchen & Bar)
            sendOrderToProduction(cart, `Orden Mesa ${currentTable.name}`, orderMetadata);

            // Update Table Status
            updateItem('tables', currentTable.id, {
                status: 'occupied',
                occupiedAt: currentTable.occupiedAt || new Date().toISOString()
            });

            setCart([]);
            setOriginalOrder(null);
            setIsCartOpen(false);
            // alert(`Orden enviada a cocina para ${currentTable.name}`);
            addToast(`Orden enviada a cocina para ${currentTable.name}`, 'success');
            navigate('/tables');
        } else {
            // Retail / Takeaway / Fast Food Order

            // If we are editing an existing order, DELETE the old one before creating the new one
            // This acts as an "Update"
            if (originalOrder && !originalOrder.tableId) {
                deleteHeldOrder(originalOrder.id);
            }

            // Logic based on Takeaway Toggle
            const locationName = isTakeaway ? "Llevar" : "Sin Mesa";

            orderMetadata.tableName = locationName;

            // Critical: isWaitList is NOT set (defaults to false in DataContext) so it doesn't show in "En Espera" list
            // Unless it was already there? No, "Send to Kitchen" removes it from "Wait List" effectively by not setting the flag.

            sendOrderToProduction(cart, "Pedido Rápido", orderMetadata);

            setCart([]);
            setOriginalOrder(null);
            setIsCartOpen(false);
            setOrderNote('');
            setIsTakeaway(false);
            alert("Orden enviada a barra/cocina correctamente.");
            addToast("Orden enviada a barra/cocina", 'success');
            if (orderId) navigate('/'); // Clear URL
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

    const handleRestoreOrder = (order) => {
        restoreCancelledOrder(order.id);
        alert('Orden restaurada a "En Espera".');
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

        // Accounts Receivable Logic
        const creditPayments = (Array.isArray(overridePayments) ? overridePayments : payments).filter(p => p.method === 'Crédito (Fiado)');
        if (creditPayments.length > 0) {
            // Validate Customer Selection
            // If we have a single 'Credit' payment covering everything or mixed. 
            // We need to associate the debt to a customer.
            // Ideally we should have selected a customer before adding the payment, but for now we enforce it at finalize if not flexible.
            // Actually, let's look for `selectedCustomerId` state.

            if (!selectedCustomerId) {
                alert('Para ventas a crédito debe seleccionar un Cliente.');
                return;
            }

            // Update Customer Balance
            const customer = data.customers.find(c => c.id === parseInt(selectedCustomerId));
            if (customer) {
                const totalCreditAmount = creditPayments.reduce((sum, p) => sum + p.amount, 0); // Amount is already in USD base
                const newBalance = (customer.balance || 0) + totalCreditAmount;
                updateItem('customers', customer.id, { balance: newBalance });
            }
        }

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

        // Clear Table or Held Order if applicable
        if (originalOrder && originalOrder.id) {
            deleteHeldOrder(originalOrder.id);
        } else if (currentTable && currentTable.currentOrderId) {
            deleteHeldOrder(currentTable.currentOrderId); // Fallback for table orders
        }

        // alert(`Venta registrada exitosamente.`);
        addToast(`Venta registrada exitosamente`, 'success');
        setCart([]);
        setTipAmount('');
        setDiscountValue('');
        setOrderNote('');
        setPayments([]);
        setIsCartOpen(false);
        setIsPaymentModalOpen(false);
        setSelectedPaymentMethod('');
        setSelectedCustomerId('');
        setOriginalOrder(null);
    };

    // ...

    const filteredProducts = useMemo(() => {
        let result = data.products || [];

        // Special "Best Sellers" Filter
        if (selectedCategory === 'mas_vendidos') {
            const productCounts = {};
            (data.sales || []).forEach(sale => {
                (sale.items || []).forEach(item => {
                    productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1);
                });
            });

            // Sort products by sales count (descending)
            return [...result]
                .map(p => ({ ...p, salesCount: productCounts[p.name] || 0 }))
                .sort((a, b) => b.salesCount - a.salesCount)
                .slice(0, 20); // Top 20
        }

        if (selectedCategory !== 'all') {
            result = result.filter(p => p.category === selectedCategory);
        }
        if (searchQuery) {
            result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return result;
    }, [selectedCategory, searchQuery, data.products, data.sales]);

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
            setOriginalOrder(null);
            setOrderNote('');
            setIsTakeaway(false);
            setOrderPriority('normal');
            localStorage.removeItem('pos_cart');
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
        { id: 'credito', label: 'Crédito (Fiado)', color: '#e74c3c' },
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


            {/* Main Content */}
            <div className="pos-grid-area">
                {/* ... existing header ... */}



                {/* Header Container */}
                <div className="pos-header" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>

                    {/* Badge de Mesa */}
                    {currentTable && (
                        <div style={{
                            background: '#00d4ff',
                            color: '#000',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            flexShrink: 0
                        }}>
                            <Coffee size={12} color="#000" strokeWidth={2} />
                            {currentTable.name}
                        </div>
                    )}



                    {/* Customer Selector */}
                    <div style={{ position: 'relative', zIndex: 50 }}>
                        <button
                            className="glass-button"
                            onClick={() => setIsClientModalOpen(true)}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <User size={16} />
                            {selectedCustomerId
                                ? (data.customers.find(c => c.id === selectedCustomerId)?.name || 'Cliente')
                                : 'Cliente General'}
                        </button>
                        {selectedCustomerId && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedCustomerId(''); }}
                                style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '16px', height: '16px', border: 'none', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                <X size={10} />
                            </button>
                        )}
                    </div>

                    {isClientModalOpen && (
                        <ClientSearchModal
                            isOpen={isClientModalOpen}
                            onClose={() => setIsClientModalOpen(false)}
                            onSelectClient={(client) => setSelectedCustomerId(client.id)}
                        />
                    )}

                    {/* Integrated Search & Categories (Flex 1 to take available space) */}
                    <div style={{ display: 'flex', flex: 1, gap: '0.5rem', alignItems: 'center', position: 'relative', minWidth: 0 }}>

                        {/* Expandable Search */}
                        {isSearchExpanded ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="glass-panel">
                                <Search size={18} style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }} />
                                <input
                                    type="text"
                                    autoFocus
                                    className="glass-input"
                                    placeholder="Buscar..."
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        width: '100%',
                                        height: '100%',
                                        padding: '0.25rem',
                                        outline: 'none',
                                        boxShadow: 'none'
                                    }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onBlur={() => !searchQuery && setIsSearchExpanded(false)}
                                />
                                <button
                                    onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '0 0.5rem', cursor: 'pointer' }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                className="glass-button"
                                onClick={() => setIsSearchExpanded(true)}
                                style={{ padding: '0.5rem', flexShrink: 0, height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Buscar"
                            >
                                <Search size={20} />
                            </button>
                        )}

                        {/* Categories List (Hidden if Search Expanded) */}
                        {!isSearchExpanded && (
                            <>
                                <div className="no-scrollbar" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', flex: 1, alignItems: 'center', paddingRight: '0.5rem', minWidth: 0 }}>
                                    <button
                                        className={`glass-button ${selectedCategory === 'all' ? 'primary' : ''}`}
                                        onClick={() => setSelectedCategory('all')}
                                        style={{
                                            padding: '0.5rem 1.25rem',
                                            fontSize: '0.9rem',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                            height: '40px',
                                            borderRadius: '20px', // Pill shape
                                            border: selectedCategory === 'all' ? '1px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        Todos
                                    </button>

                                    <button
                                        className={`glass-button ${selectedCategory === 'mas_vendidos' ? 'primary' : ''}`}
                                        onClick={() => setSelectedCategory('mas_vendidos')}
                                        style={{
                                            padding: '0.5rem 1.25rem',
                                            fontSize: '0.9rem',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                            fontWeight: 'bold',
                                            height: '40px',
                                            borderRadius: '20px',
                                            border: selectedCategory === 'mas_vendidos' ? '1px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        ⭐ Top
                                    </button>
                                    {displayCategories.map(cat => (
                                        <button
                                            key={cat.id}
                                            className={`glass-button ${selectedCategory === cat.id ? 'primary' : ''}`}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            style={{
                                                padding: '0.5rem 1.25rem',
                                                fontSize: '0.9rem',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                                height: '40px',
                                                borderRadius: '20px',
                                                border: selectedCategory === cat.id ? '1px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.1)'
                                            }}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Deploy Categories Button */}
                                <button
                                    className="glass-button"
                                    style={{ padding: '0.5rem', flexShrink: 0, height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={() => setShowAllCategories(!showAllCategories)}
                                    title="Ver todas las categorías"
                                >
                                    <ChevronDown size={20} style={{ transform: showAllCategories ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
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
                                {displayCategories.map(cat => (
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
                        {/* Cancel Table Order Button (Only for Tables) */}
                        {currentTable && (
                            <button
                                className="glass-button"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.5rem',
                                    height: '40px',
                                    width: '40px',
                                    borderColor: 'var(--accent-red)',
                                    color: 'var(--accent-red)'
                                }}
                                onClick={handleCancelCurrentOrder}
                                title="Cancelar Pedido y Liberar Mesa"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}

                        {/* Reports Button - REMOVED AS PER USER REQUEST */}
                        {/* <button
                            className="glass-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.5rem',
                                height: '40px',
                                width: '40px'
                            }}
                            onClick={() => setIsSalesModalOpen(true)}
                            title="Reporte de Ventas"
                        >
                            <FileText size={20} />
                        </button> */}

                        {/* Held Orders Button */}
                        <button
                            className="glass-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.5rem',
                                height: '40px',
                                minWidth: '40px'
                            }}
                            onClick={() => setIsHeldOrdersModalOpen(true)}
                            title="Ver Órdenes en Espera"
                        >
                            <Clock size={20} />
                            {heldOrders.filter(o => o.isWaitList).length > 0 && (
                                <span style={{
                                    marginLeft: '0.25rem',
                                    background: 'var(--accent-orange)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    fontSize: '0.75rem',
                                    width: '18px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold'
                                }}>
                                    {heldOrders.filter(o => o.isWaitList).length}
                                </span>
                            )}
                        </button>

                        {/* Cart Toggle (Mobile) */}
                        {isMobile && (
                            <button
                                className="glass-button accent"
                                style={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    alignItems: 'center',
                                    padding: '0.5rem 1rem',
                                    whiteSpace: 'nowrap',
                                    height: '40px'
                                }}
                                onClick={() => setIsCartOpen(!isCartOpen)}
                            >
                                <div style={{ position: 'relative', display: 'flex' }}>
                                    <ShoppingBag size={20} />
                                    {cart.length > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            right: '-8px',
                                            background: 'var(--accent-red)',
                                            color: 'white',
                                            borderRadius: '50%',
                                            fontSize: '0.75rem',
                                            width: '18px',
                                            height: '18px',
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
                                <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>${total.toFixed(2)}</span>
                            </button>
                        )}

                        {/* Exchange Rate Display (Always Visible) */}
                        <div
                            className="glass-panel"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0 1rem',
                                height: '40px',
                                background: 'rgba(0, 255, 0, 0.1)', // Subtle green tint
                                border: '1px solid rgba(0, 255, 0, 0.2)',
                                color: 'var(--accent-green)',
                                whiteSpace: 'nowrap',
                                display: isMobile && isSearchExpanded ? 'none' : 'flex' // Hide on mobile if search is expanded to save space
                            }}
                            title="Tasa de Cambio del Día"
                        >
                            <DollarSign size={18} />
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                {data.exchangeRate ? `${data.exchangeRate.toFixed(2)} Bs/$` : 'N/A'}
                            </span>
                        </div>
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
            <div
                className={`pos-cart-area ${isCartOpen ? 'open' : ''} ${isCartExpanded ? 'full-screen' : ''}`}
                style={{
                    backgroundColor: '#181818', // Darker than main bg
                    borderLeft: '1px solid var(--vscode-border)'
                }}
            >
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
                        onSendToKitchen={handleSendToKitchen}
                        currentTable={currentTable}
                        onToggleExpand={() => setIsCartExpanded(!isCartExpanded)}
                        isExpanded={isCartExpanded}
                        orderPriority={orderPriority}
                        setOrderPriority={setOrderPriority}
                        onUpdateItemPriority={updateItemPriority}
                        isTakeaway={isTakeaway}
                        setIsTakeaway={setIsTakeaway}
                        onToggleItemTakeaway={toggleItemTakeaway}
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

                    {/* Discount Section */}
                    <div className="glass-panel p-4">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-[var(--vscode-text-secondary)]">Descuento</label>
                                {discountType === 'percent' && (
                                    <button
                                        className="px-2 py-0.5 text-[10px] border border-blue-500/30 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-all"
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
                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                                <button
                                    onClick={() => setDiscountType('amount')}
                                    className={`px-3 py-1 rounded-md text-xs transition-all ${discountType === 'amount' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                >$</button>
                                <button
                                    onClick={() => setDiscountType('percent')}
                                    className={`px-3 py-1 rounded-md text-xs transition-all ${discountType === 'percent' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                >%</button>
                            </div>
                        </div>
                        <input
                            type="number"
                            className="vscode-input w-full text-lg font-bold"
                            placeholder={discountType === 'percent' ? "0%" : "$0.00"}
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                        />
                    </div>

                    {/* Order Note */}
                    <div className="glass-panel p-4">
                        <label className="block text-sm font-medium text-[var(--vscode-text-secondary)] mb-2">Nota del Pedido</label>
                        <textarea
                            className="vscode-input w-full h-20 resize-none text-sm"
                            placeholder="Añadir nota especial..."
                            value={orderNote}
                            onChange={(e) => setOrderNote(e.target.value)}
                        />
                    </div>

                    {/* Add Payment Section */}
                    <div className="glass-panel p-4 border-blue-500/20 bg-blue-500/5">
                        <label className="block text-sm font-medium text-blue-400 mb-3">Agregar Pago</label>
                        <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-4">
                                <input
                                    type="number"
                                    className="vscode-input w-full h-10 text-base"
                                    placeholder="Monto"
                                    value={currentPaymentAmount}
                                    onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                                />
                            </div>
                            <div className="col-span-6">
                                <select
                                    value={currentPaymentMethod}
                                    onChange={(e) => setCurrentPaymentMethod(e.target.value)}
                                    className="vscode-select w-full h-10 text-sm"
                                >
                                    <option value="">Método...</option>
                                    {paymentMethods.map(m => (
                                        <option key={m.id} value={m.label}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <button
                                    className="primary-button w-full h-10 flex items-center justify-center p-0"
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
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            {currentPaymentMethod === 'Crédito (Fiado)' && (
                                <div className="col-span-12 mt-2">
                                    <select
                                        value={selectedCustomerId}
                                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                                        className="vscode-select w-full border-red-500/50"
                                    >
                                        <option value="">Seleccionar Cliente para Crédito...</option>
                                        {data.customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payments List */}
                    {payments.length > 0 && (
                        <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1">
                            {payments.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10 group hover:bg-white/10 transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-[var(--vscode-text-secondary)]">{p.method}</span>
                                        <span className="text-sm font-bold text-white">
                                            {p.currency === 'USD' ? `$${p.amount.toFixed(2)}` : `Bs ${p.amount.toFixed(2)}`}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setPayments(payments.filter(pay => pay.id !== p.id))}
                                        className="p-2 rounded-full hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer: Tip & Confirm */}
                    <div className="mt-2 pt-5 border-t border-white/10 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-[var(--vscode-text-secondary)]">Propina:</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                                    <input
                                        type="number"
                                        className="vscode-input w-24 pl-7 h-9 text-sm"
                                        placeholder="0.00"
                                        value={tipAmount}
                                        onChange={(e) => setTipAmount(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-[var(--vscode-text-secondary)]">Total a Pagar</div>
                                <div className="text-2xl font-black text-white">${total.toFixed(2)}</div>
                            </div>
                        </div>

                        <button
                            className="primary-button w-full py-4 text-lg font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all"
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
                            Finalizar Venta
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Held Orders Modal */}
            <Modal
                isOpen={isHeldOrdersModalOpen}
                onClose={() => setIsHeldOrdersModalOpen(false)}
                title="Ordenes en espera"
            >
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--vscode-border)', paddingBottom: '0.5rem' }}>
                    <button
                        className={`glass-button ${heldOrderTab === 'active' ? 'primary' : ''}`}
                        onClick={() => setHeldOrderTab('active')}
                        style={{ flex: 1, justifyContent: 'center', opacity: heldOrderTab === 'active' ? 1 : 0.7 }}
                    >
                        En Espera ({heldOrders.filter(o => o.status !== 'kitchen').length})
                    </button>
                    <button
                        className={`glass-button ${heldOrderTab === 'trash' ? 'primary' : ''}`}
                        onClick={() => setHeldOrderTab('trash')}
                        style={{ flex: 1, justifyContent: 'center', opacity: heldOrderTab === 'trash' ? 1 : 0.7, borderColor: heldOrderTab === 'trash' ? 'var(--accent-red)' : 'transparent', color: heldOrderTab === 'trash' ? 'var(--accent-red)' : 'inherit' }}
                    >
                        Papelera ({cancelledOrders.filter(o => !o.tableId).length})
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>

                    {/* Active Orders List */}
                    {heldOrderTab === 'active' && (
                        heldOrders.filter(o => o.status !== 'kitchen').length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay órdenes en espera.</p>
                        ) : (
                            heldOrders.filter(o => o.status !== 'kitchen').map(order => (
                                <div key={order.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1rem' }}>{order.note || 'Sin nota'} {order.tableName ? `(${order.tableName})` : ''}</h4>
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
                                                if (window.confirm('¿Cancelar esta orden? Se moverá a la papelera.')) {
                                                    cancelHeldOrder(order.id);
                                                }
                                            }}
                                            style={{ fontSize: '0.8rem', padding: '0.5rem', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )
                    )}

                    {/* Cancelled Orders List (Trash) */}
                    {heldOrderTab === 'trash' && (
                        cancelledOrders.filter(o => !o.tableId).length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay órdenes recientes en la papelera.</p>
                        ) : (
                            cancelledOrders.filter(o => !o.tableId).slice().reverse().map(order => (
                                <div key={order.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8, borderColor: 'rgba(239, 68, 68, 0.3)' }}>

                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '1rem', textDecoration: 'line-through' }}>{order.note || 'Sin nota'} {order.tableName ? `(${order.tableName})` : ''}</h4>
                                            <span style={{ fontSize: '0.7rem', background: 'var(--accent-red)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>CANCELADA</span>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            Cancelado: {order.cancelledAt ? new Date(order.cancelledAt).toLocaleTimeString() : 'N/A'}
                                        </p>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                                            Total: ${order.total.toFixed(2)}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="glass-button"
                                            onClick={() => handleRestoreOrder(order)}
                                            style={{ fontSize: '0.8rem', padding: '0.5rem', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}
                                            title="Restaurar a En Espera"
                                        >
                                            Restaurar
                                        </button>
                                        <button
                                            className="glass-button"
                                            onClick={() => {
                                                if (window.confirm('¿Eliminar PERMANENTEMENTE esta orden? No se podrá recuperar.')) {
                                                    permanentlyDeleteOrder(order.id);
                                                }
                                            }}
                                            style={{ fontSize: '0.8rem', padding: '0.5rem', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                                            title="Eliminar permanentemente"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )
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
