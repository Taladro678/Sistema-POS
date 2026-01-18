import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext';
import ProductCard from '../components/ProductCard';
import CartSidebar from '../components/CartSidebar';
import Modal from '../components/Modal';
import {
    ShoppingBag, X, Search, ChevronDown, Clock, FileText,
    DollarSign, Calendar, Coffee, UserPlus, User, Trash2,
    AlertTriangle, Plus, Sparkles, Check, ChevronRight,
    Banknote, CreditCard, Wallet, Coins
} from 'lucide-react';

import ClientSearchModal from '../components/ClientSearchModal';

export const POSPage = () => {
    const {
        holdOrder,
        data,
        deleteHeldOrder,
        cancelHeldOrder,
        restoreCancelledOrder,
        permanentlyDeleteOrder,
        addTip,
        addItem,
        updateItem,
        sendOrderToProduction,
        sendLiveCartUpdate
    } = useData();
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const { confirm, alert, prompt } = useDialog();

    // Local cart state
    const [cart, setCart] = useState(() => {
        try {
            const savedCart = localStorage.getItem('pos_cart');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
            return [];
        }
    });

    // Persist cart
    useEffect(() => {
        localStorage.setItem('pos_cart', JSON.stringify(cart));
    }, [cart]);

    // UI state
    const [selectedCategory, setSelectedCategory] = useState('all');
    const displayCategories = data.categories || [];
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [showAllCategories, setShowAllCategories] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Payment state
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [tipAmount, setTipAmount] = useState('');
    const [payments, setPayments] = useState([]);
    const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
    const [currentPaymentMethod, setCurrentPaymentMethod] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');

    // Discount & Notes
    const [discountValue, setDiscountValue] = useState('');
    const [discountType, setDiscountType] = useState('amount');
    const [orderNote, setOrderNote] = useState('');

    // Active Cart Broadcast
    useEffect(() => {
        if (typeof sendLiveCartUpdate === 'function') {
            const timeoutId = setTimeout(() => {
                sendLiveCartUpdate(currentUser, cart);
            }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [cart, currentUser, sendLiveCartUpdate]);

    // Modals visibility
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isHeldOrdersModalOpen, setIsHeldOrdersModalOpen] = useState(false);
    const [heldOrderTab, setHeldOrderTab] = useState('active');
    const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
    const [isCartExpanded, setIsCartExpanded] = useState(false);
    const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
    const [orderPriority, setOrderPriority] = useState('normal');
    const [isTakeaway, setIsTakeaway] = useState(false);
    const [displayCurrency, setDisplayCurrency] = useState('USD');

    const heldOrders = data.heldOrders || [];
    const cancelledOrders = data.cancelledOrders || [];

    const formatPrice = (amount) => {
        if (displayCurrency === 'BS') {
            const rate = data.exchangeRate || 1;
            return `Bs. ${(amount * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `$ ${amount.toFixed(2)}`;
    };

    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(location.search);
    const tableId = searchParams.get('tableId');
    const orderId = searchParams.get('orderId');

    const [originalOrder, setOriginalOrder] = useState(null);
    const tables = data.tables || [];
    const currentTable = tableId ? tables.find(t => t.id === parseInt(tableId)) : null;

    useEffect(() => {
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

    useEffect(() => {
        if (orderId && !tableId) {
            const existingOrder = data.heldOrders.find(o => o.id === parseInt(orderId) || o.id === orderId);
            if (existingOrder) {
                setCart(existingOrder.items);
                setOriginalOrder(existingOrder);
                setOrderNote(existingOrder.note || '');
                setIsTakeaway(existingOrder.takeaway || false);
                setOrderPriority(existingOrder.priority || 'normal');
                if (existingOrder.customerId) setSelectedCustomerId(existingOrder.customerId);
            }
        }
    }, [orderId, data.heldOrders, tableId]);

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

    const clearCart = async () => {
        if (cart.length === 0) return;
        const ok = await confirm({
            title: 'Vaciar Carrito',
            message: '¿Estás seguro de que deseas vaciar el carrito?'
        });
        if (ok) {
            setCart([]);
            setOriginalOrder(null);
            setOrderNote('');
            setIsTakeaway(false);
            setOrderPriority('normal');
        }
    };

    const total = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

    const handleHoldOrder = async () => {
        if (cart.length === 0) return;
        const note = await prompt({
            title: 'Poner en Espera',
            message: 'Nota para el pedido:',
            defaultValue: orderNote
        });
        if (note !== null) {
            const metadata = {
                isWaitList: true,
                takeaway: isTakeaway,
                priority: orderPriority,
                customerId: selectedCustomerId,
                createdBy: originalOrder?.createdBy || currentUser?.username || 'Cajero'
            };
            holdOrder(cart, note || 'Sin nota', metadata);
            setCart([]);
            setOrderNote('');
            setIsCartOpen(false);
            addToast("Orden en espera", 'info');
            if (tableId || orderId) navigate('/');
        }
    };

    const handleSendToKitchen = () => {
        if (cart.length === 0) return;
        setIsProductionModalOpen(true);
    };

    const confirmSendToProduction = () => {
        const metadata = {
            priority: orderPriority,
            takeaway: isTakeaway,
            customerId: selectedCustomerId,
            tableId: currentTable?.id,
            tableName: currentTable?.name
        };
        sendOrderToProduction(cart, orderNote || (currentTable ? `Mesa ${currentTable.name}` : 'Pedido Rápido'), metadata);
        setCart([]);
        setIsProductionModalOpen(false);
        setIsCartOpen(false);
        addToast("Pedido enviado a producción", 'success');
        if (tableId) navigate('/tables');
    };

    const handleFinalizePayment = async () => {
        if (payments.length === 0) {
            await alert({ title: 'Error', message: 'Debe agregar al menos un pago.' });
            return;
        }

        const discountNum = parseFloat(discountValue) || 0;
        const discountAmount = discountType === 'percent' ? (total * (discountNum / 100)) : discountNum;
        const finalTotal = total - discountAmount;

        const paidAmount = payments.reduce((sum, p) => sum + (p.currency === 'USD' ? p.amount : p.amount / p.rate), 0);

        if (paidAmount < (finalTotal - 0.01)) {
            const ok = await confirm({
                title: 'Saldo Incompleto',
                message: `El monto pagado ($${paidAmount.toFixed(2)}) es menor al total ($${finalTotal.toFixed(2)}). ¿Desea procesar como venta parcial o crédito?`
            });
            if (!ok) return;
        }

        const newSale = {
            id: Date.now(),
            items: cart,
            subtotal: total,
            total: finalTotal,
            discount: { type: discountType, value: discountNum, amount: discountAmount },
            payments: payments,
            tip: parseFloat(tipAmount) || 0,
            date: new Date().toISOString(),
            cashier: currentUser?.username || 'Cajero',
            customerId: selectedCustomerId,
            tableId: currentTable?.id
        };

        addItem('sales', newSale);
        if (originalOrder) deleteHeldOrder(originalOrder.id);

        setCart([]);
        setPayments([]);
        setDiscountValue('');
        setTipAmount('');
        setIsPaymentModalOpen(false);
        setIsCartOpen(false);
        addToast("Venta completada", 'success');
        if (tableId) navigate('/tables');
    };

    const paymentMethods = [
        { id: 'efectivo_usd', label: 'Efectivo $', color: '#27ae60' },
        { id: 'efectivo_bs', label: 'Efectivo Bs', color: '#7f8c8d' },
        { id: 'zelle', label: 'Zelle', color: '#582c83' },
        { id: 'pm_banesco', label: 'P.Moro Banesco', color: '#209e33' },
        { id: 'punto', label: 'Punto Venta', color: '#2980b9' },
        { id: 'credito', label: 'Crédito', color: '#e67e22' }
    ];

    const filteredProducts = useMemo(() => {
        let res = data.products || [];
        if (selectedCategory !== 'all') res = res.filter(p => p.category === selectedCategory);
        if (searchQuery) res = res.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return res;
    }, [data.products, selectedCategory, searchQuery]);

    const handleRecallOrder = (order) => {
        setCart(order.items);
        setOriginalOrder(order);
        setOrderNote(order.note || '');
        deleteHeldOrder(order.id);
        setIsHeldOrdersModalOpen(false);
        setIsCartOpen(true);
    };

    return (
        <div className="pos-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: 'white', overflow: 'hidden' }}>
            {/* Header */}
            <header style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <div style={{ position: 'relative', flex: isSearchExpanded ? 1 : 'none' }}>
                        {isSearchExpanded ? (
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', display: 'flex', alignItems: 'center', padding: '0 10px', border: '1px solid var(--accent-blue)' }}>
                                <Search size={16} />
                                <input
                                    autoFocus
                                    className="glass-input"
                                    style={{ border: 'none', background: 'transparent', width: '100%', padding: '8px' }}
                                    placeholder="Buscar producto..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onBlur={() => !searchQuery && setIsSearchExpanded(false)}
                                />
                                <X size={16} onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }} style={{ cursor: 'pointer' }} />
                            </div>
                        ) : (
                            <button className="glass-button" onClick={() => setIsSearchExpanded(true)} style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Search size={20} />
                            </button>
                        )}
                    </div>
                    {!isSearchExpanded && (
                        <div className="no-scrollbar" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '5px 0' }}>
                            <button className={`glass-button ${selectedCategory === 'all' ? 'primary' : ''}`} onClick={() => setSelectedCategory('all')} style={{ whiteSpace: 'nowrap', borderRadius: '20px', padding: '5px 15px' }}>Todos</button>
                            {displayCategories.map(cat => (
                                <button key={cat.id} className={`glass-button ${selectedCategory === cat.id ? 'primary' : ''}`} onClick={() => setSelectedCategory(cat.id)} style={{ whiteSpace: 'nowrap', borderRadius: '20px', padding: '5px 15px' }}>{cat.label}</button>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="glass-button" onClick={() => setIsHeldOrdersModalOpen(true)} style={{ position: 'relative' }}>
                        <Clock size={20} />
                        {heldOrders.length > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--accent-orange)', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{heldOrders.length}</span>}
                    </button>
                    <button className="glass-button" onClick={() => setIsSalesModalOpen(true)}><FileText size={20} /></button>
                    {isMobile && (
                        <button className="primary-button" onClick={() => setIsCartOpen(true)} style={{ gap: '5px' }}>
                            <ShoppingBag size={18} />
                            <span>{formatPrice(total)}</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Area */}
            <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', alignContent: 'start' }}>
                    {filteredProducts.map(p => (
                        <ProductCard
                            key={p.id}
                            product={{ ...p, quantity: cart.find(c => c.id === p.id)?.quantity || 0 }}
                            onAdd={addToCart}
                            priceDisplay={formatPrice(p.price)}
                        />
                    ))}
                </div>

                {!isMobile && (
                    <aside style={{ width: '350px', background: 'rgba(0,0,0,0.2)', borderLeft: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                        <CartSidebar
                            cart={cart} onRemove={removeFromCart} onAdd={addToCart} onClear={clearCart}
                            onPay={() => setIsPaymentModalOpen(true)} total={total} onHold={handleHoldOrder}
                            onSendToKitchen={handleSendToKitchen} currentTable={currentTable}
                            formatPrice={formatPrice}
                        />
                    </aside>
                )}
            </main>

            {/* Mobile Cart Drawer */}
            {isMobile && isCartOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '90%', background: '#121212', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <h2 style={{ fontWeight: 'bold' }}>Carrito ({cart.length})</h2>
                            <X size={24} onClick={() => setIsCartOpen(false)} />
                        </div>
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <CartSidebar
                                cart={cart} onRemove={removeFromCart} onAdd={addToCart} onClear={clearCart}
                                onPay={() => setIsPaymentModalOpen(true)} total={total} onHold={handleHoldOrder}
                                onSendToKitchen={handleSendToKitchen} currentTable={currentTable}
                                formatPrice={formatPrice}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal (Ultra-Responsive Redesign) */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Procesar Pago"
                fullscreen={isMobile}
            >
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }} className="animate-fade-in">
                    {/* Main Content Area - Grid on Desktop */}
                    <div className="flex flex-col md:flex-row gap-4 min-h-0 flex-1">

                        {/* LEFT COLUMN: Input and Form */}
                        <div className="flex-1 flex flex-col gap-4">
                            {/* Mobile-Friendly Totals Summary */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="glass-panel p-3 text-center border-blue-500/20" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block mb-1">Total USD</span>
                                    <span className="text-2xl font-black text-white">${total.toFixed(2)}</span>
                                </div>
                                <div className="glass-panel p-3 text-center border-green-500/20" style={{ background: 'rgba(34, 197, 94, 0.05)' }}>
                                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider block mb-1">Total BS</span>
                                    <span className="text-2xl font-black text-white">{(total * data.exchangeRate).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Payment Entry Form */}
                            <div className="glass-panel p-4 border-blue-500/30 bg-blue-500/5 relative overflow-hidden" style={{ borderRadius: '16px' }}>
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <label className="text-xs font-bold text-blue-400 mb-3 block flex items-center gap-2">
                                    <div className="bg-blue-500/20 p-1 rounded-full"><Plus size={14} /></div>
                                    REGISTRAR PAGO
                                </label>

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                className="glass-input w-full text-3xl font-black p-4 text-center"
                                                style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}
                                                value={currentPaymentAmount}
                                                onChange={e => setCurrentPaymentAmount(e.target.value)}
                                                placeholder="0.00"
                                                autoFocus
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xl">$</div>
                                        </div>
                                        <select
                                            className="glass-input h-auto px-4 text-base font-bold sm:w-44"
                                            style={{ borderRadius: '12px' }}
                                            value={currentPaymentMethod}
                                            onChange={e => setCurrentPaymentMethod(e.target.value)}
                                        >
                                            <option value="">Método...</option>
                                            {paymentMethods.map(m => (
                                                <option key={m.id} value={m.label}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Quick Amount Buttons - Fixed Overflow */}
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {[1, 5, 10, 20, 50, 100].map(v => (
                                            <button
                                                key={v}
                                                className="glass-button flex-1 text-sm font-bold py-2 border-white/5 bg-white/5 active:scale-95 transition-transform"
                                                style={{ minWidth: '60px' }}
                                                onClick={() => setCurrentPaymentAmount(v.toString())}
                                            >
                                                +${v}
                                            </button>
                                        ))}
                                        <button
                                            className="glass-button text-sm font-bold py-2 border-green-500/40 text-green-400 bg-green-500/5 hover:bg-green-500/10 active:scale-95 transition-transform"
                                            style={{ flex: '2', minWidth: '80px' }}
                                            onClick={() => {
                                                const falta = Math.max(0, (total - (discountType === 'percent' ? (total * (parseFloat(discountValue) / 100 || 0)) : (parseFloat(discountValue) || 0))) - payments.reduce((sum, p) => sum + (p.currency === 'USD' ? p.amount : p.amount / p.rate), 0));
                                                setCurrentPaymentAmount(falta.toFixed(2));
                                            }}
                                        >
                                            Saldar Falta
                                        </button>
                                    </div>

                                    <button
                                        className="primary-button p-4 text-lg font-black flex items-center justify-center gap-2 group shadow-lg shadow-blue-500/20"
                                        style={{ borderRadius: '12px' }}
                                        onClick={() => {
                                            if (!currentPaymentAmount || !currentPaymentMethod) return;
                                            const method = currentPaymentMethod;
                                            const isBs = method.toLowerCase().includes('bs') || method.toLowerCase().includes('punto') || method.toLowerCase().includes('pago movil');
                                            setPayments([...payments, {
                                                id: Date.now(),
                                                method,
                                                amount: parseFloat(currentPaymentAmount),
                                                currency: isBs ? 'BS' : 'USD',
                                                rate: data.exchangeRate
                                            }]);
                                            setCurrentPaymentAmount('');
                                        }}
                                    >
                                        <div className="group-hover:translate-y-[-2px] transition-transform">AGREGAR PAGO</div>
                                        <Check size={20} className="group-hover:scale-125 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* Discount & Tip Section - Compact */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="glass-panel p-3 border-white/10 bg-white/5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Descuento</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="glass-input p-1.5 flex-1 text-sm text-center"
                                            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: 0 }}
                                            value={discountValue}
                                            onChange={e => setDiscountValue(e.target.value)}
                                            placeholder="0"
                                        />
                                        <button
                                            className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs transition-colors ${discountType === 'percent' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                                            onClick={() => setDiscountType(t => t === 'percent' ? 'amount' : 'percent')}
                                        >
                                            {discountType === 'percent' ? '%' : '$'}
                                        </button>
                                    </div>
                                </div>
                                <div className="glass-panel p-3 border-white/10 bg-white/5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Propina $</label>
                                    <div className="flex items-center">
                                        <div className="text-gray-500 mr-1">$</div>
                                        <input
                                            type="number"
                                            className="glass-input p-1.5 w-full text-sm text-center"
                                            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: 0 }}
                                            value={tipAmount}
                                            onChange={e => setTipAmount(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Summary & Pending Status */}
                        <div className="flex-1 flex flex-col gap-4 min-h-0">
                            {/* Status Panel: PENDING / CHANGE */}
                            <div className="glass-panel p-5 text-center border-orange-500/40 bg-orange-500/10 relative overflow-hidden" style={{ borderRadius: '16px' }}>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 -mr-8 -mt-8 rounded-full"></div>
                                <span className="text-xs text-orange-400 font-bold uppercase tracking-[0.2em] block mb-2">SALDO PENDIENTE</span>
                                <h2 className="text-5xl font-black text-white flex items-center justify-center gap-1">
                                    <span className="text-2xl text-orange-500/70">$</span>
                                    {Math.max(0, (total - (discountType === 'percent' ? (total * (parseFloat(discountValue) / 100 || 0)) : (parseFloat(discountValue) || 0))) - payments.reduce((sum, p) => sum + (p.currency === 'USD' ? p.amount : p.amount / p.rate), 0)).toFixed(2)}
                                </h2>
                            </div>

                            {/* List of added payments - Auto Scroll */}
                            <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 no-scrollbar min-h-0">
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block sticky top-0 bg-[#1e1e1e] py-1 z-10">PAGOS REGISTRADOS ({payments.length})</label>
                                {payments.length === 0 ? (
                                    <div className="glass-panel p-10 flex flex-col items-center justify-center text-gray-600 border-dashed border-2">
                                        <Wallet size={40} className="mb-2 opacity-20" />
                                        <span className="text-sm font-medium">No se han añadido pagos</span>
                                    </div>
                                ) : (
                                    payments.map(p => (
                                        <div key={p.id} className="glass-panel p-3 flex justify-between items-center bg-gradient-to-r from-white/5 to-transparent border-white/5 hover:border-white/20 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white/5 p-2 rounded-lg text-gray-400 group-hover:text-blue-400 transition-colors">
                                                    {p.method.toLowerCase().includes('efectivo') ? <Banknote size={20} /> : <CreditCard size={20} />}
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold block text-white">{p.method}</span>
                                                    <span className="text-[10px] text-gray-500 font-medium">
                                                        {p.currency === 'BS' ? `Tasa: ${p.rate}` : 'Ref: Divisa'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className="text-lg font-black text-white italic">{p.currency === 'BS' ? 'Bs' : '$'} {p.amount.toFixed(2)}</span>
                                                    {p.currency === 'BS' && (
                                                        <span className="text-[10px] text-gray-500 block">≈ ${(p.amount / p.rate).toFixed(2)}</span>
                                                    )}
                                                </div>
                                                <button
                                                    className="w-10 h-10 flex items-center justify-center text-red-500 bg-red-500/0 hover:bg-red-500/10 rounded-full transition-colors"
                                                    onClick={() => setPayments(prev => prev.filter(pay => pay.id !== p.id))}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Final Actions Area */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10 bg-[#1e1e1e] sticky bottom-0">
                        <button
                            className="glass-button py-4 px-6 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white"
                            style={{ borderRadius: '12px' }}
                            onClick={() => setIsPaymentModalOpen(false)}
                        >
                            Volver al Carrito
                        </button>
                        <button
                            className={`primary-button flex-1 py-4 text-xl font-black flex items-center justify-center gap-3 shadow-xl ${payments.length === 0 ? 'opacity-50 grayscale' : 'shadow-blue-600/20'}`}
                            style={{ borderRadius: '12px' }}
                            disabled={payments.length === 0}
                            onClick={handleFinalizePayment}
                        >
                            <ShoppingBag size={24} />
                            FINALIZAR VENTA
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Held Orders Modal */}
            <Modal
                isOpen={isHeldOrdersModalOpen}
                onClose={() => setIsHeldOrdersModalOpen(false)}
                title="Órdenes en Espera"
                fullscreen={isMobile}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                    <div className="flex gap-2">
                        <button className={`glass-button flex-1 ${heldOrderTab === 'active' ? 'primary' : ''}`} onClick={() => setHeldOrderTab('active')}>Activas</button>
                        <button className={`glass-button flex-1 ${heldOrderTab === 'trash' ? 'primary' : ''}`} onClick={() => setHeldOrderTab('trash')}>Papelera</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {heldOrderTab === 'active' ? (
                            heldOrders.length === 0 ? <p className="text-center text-gray-500 py-10">No hay órdenes pendientes</p> :
                                heldOrders.map(o => (
                                    <div key={o.id} className="glass-panel p-4 flex justify-between items-center bg-white/5">
                                        <div>
                                            <h4 className="font-bold text-lg">{o.note || 'Sin Nota'}</h4>
                                            <span className="text-xs text-gray-400">{new Date(o.timestamp).toLocaleTimeString()} - {o.items.length} items</span>
                                            <p className="text-green-400 font-bold mt-1">Total: ${o.total.toFixed(2)}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="primary-button p-2 px-4 text-sm" onClick={() => handleRecallOrder(o)}>Recobrar</button>
                                            <button className="glass-button p-2 text-red-500" onClick={() => cancelHeldOrder(o.id)}><X size={20} /></button>
                                        </div>
                                    </div>
                                ))
                        ) : (
                            cancelledOrders.length === 0 ? <p className="text-center text-gray-500 py-10">Papelera vacía</p> :
                                cancelledOrders.map(o => (
                                    <div key={o.id} className="glass-panel p-4 flex justify-between items-center opacity-70">
                                        <div>
                                            <h4 className="font-bold">{o.note || 'Sin Nota'}</h4>
                                            <span className="text-[10px] text-gray-400">Cancelado: {new Date(o.cancelledAt).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="glass-button text-xs py-1 px-2" onClick={() => restoreCancelledOrder(o.id)}>Restaurar</button>
                                            <button className="glass-button text-red-600 border-red-600/30 py-1 px-2" onClick={() => permanentlyDeleteOrder(o.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* Sales Reports Modal */}
            <Modal
                isOpen={isSalesModalOpen}
                onClose={() => setIsSalesModalOpen(false)}
                title="Historial de Ventas"
                fullscreen={isMobile}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                    <div className="glass-panel p-4 bg-green-500/10 border-green-500/30 text-center">
                        <span className="text-xs text-green-400 font-bold">VENTAS TOTALES (HOY)</span>
                        <h2 className="text-3xl font-black text-green-500">${(data.sales || []).reduce((sum, s) => sum + s.total, 0).toFixed(2)}</h2>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(data.sales || []).slice().reverse().map(sale => (
                            <div key={sale.id} className="glass-panel p-3 text-xs bg-white/5 flex justify-between items-center">
                                <div>
                                    <span className="font-bold block">{new Date(sale.date).toLocaleTimeString()} - {sale.cashier}</span>
                                    <span className="text-gray-400">{sale.items.length} productos | {sale.paymentMethod}</span>
                                </div>
                                <span className="text-lg font-black text-blue-400">${sale.total.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Production Configuration Modal */}
            <Modal
                isOpen={isProductionModalOpen}
                onClose={() => setIsProductionModalOpen(false)}
                title="Enviar a Producción"
            >
                <div className="flex flex-col gap-5 p-2">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Prioridad de la Orden</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['normal', 'priority', 'high'].map(p => (
                                <button
                                    key={p}
                                    className={`p-3 rounded-lg text-xs font-bold border ${orderPriority === p ? 'bg-blue-600 border-blue-400' : 'bg-white/5 border-white/10'}`}
                                    onClick={() => setOrderPriority(p)}
                                >
                                    {p.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Tipo de Entrega</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                className={`p-4 rounded-xl flex flex-col items-center gap-2 border ${!isTakeaway ? 'bg-orange-600 border-orange-400' : 'bg-white/5 border-white/10'}`}
                                onClick={() => setIsTakeaway(false)}
                            >
                                <Coffee size={24} /> <span className="font-bold">PARA AQUÍ</span>
                            </button>
                            <button
                                className={`p-4 rounded-xl flex flex-col items-center gap-2 border ${isTakeaway ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/10'}`}
                                onClick={() => setIsTakeaway(true)}
                            >
                                <ShoppingBag size={24} /> <span className="font-bold">PARA LLEVAR</span>
                            </button>
                        </div>
                    </div>
                    <button className="primary-button p-4 text-xl font-black mt-2" onClick={confirmSendToProduction}>
                        CONFIRMAR Y ENVIAR
                    </button>
                </div>
            </Modal>

            {/* Client Search Modal Wrapper */}
            <ClientSearchModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onSelectClient={(client) => {
                    setSelectedCustomerId(client.id);
                    setIsClientModalOpen(false);
                }}
            />

            {/* Backdrop for Sidebar on mobile */}
            {isMobile && isCartOpen && <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />}
        </div>
    );
};
