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

import CashDenominationModal from '../components/CashDenominationModal';
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
        updateExchangeRate,
        refreshBcvRate,
        loadingBcv,
        formatAmount,
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
    const [pendingCurrency, setPendingCurrency] = useState('USD');
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
    const [tipType, setTipType] = useState('USD');
    const [payments, setPayments] = useState([]);
    const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
    const [isEditingRate, setIsEditingRate] = useState(false);
    const [tempRate, setTempRate] = useState('');
    const [currentPaymentMethod, setCurrentPaymentMethod] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [isCashModalOpen, setIsCashModalOpen] = useState(false);
    const [pendingPaymentData, setPendingPaymentData] = useState(null);

    // Discount & Notes
    const [discountValue, setDiscountValue] = useState('');
    const [discountType, setDiscountType] = useState('USD');
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

    const handleRefreshBcv = async () => {
        if (loadingBcv) return;
        await refreshBcvRate(true);
    };

    const handleSaveManualRate = () => {
        const val = parseFloat(tempRate);
        if (val > 0) {
            updateExchangeRate(val);
            setIsEditingRate(false);
        }
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

    const handleSetQuantity = async (product) => {
        const currentQty = cart.find(item => item.id === product.id)?.quantity || 0;
        const result = await prompt({
            title: 'Ingresar Cantidad',
            message: `Cantidad para "${product.name}":`,
            defaultValue: currentQty > 0 ? currentQty.toString() : '1',
            type: 'number'
        });

        if (result !== null) {
            const qty = parseInt(result);
            if (!isNaN(qty)) {
                setCart(prevCart => {
                    const existingItemIndex = prevCart.findIndex(item => item.id === product.id);
                    const newCart = [...prevCart];
                    if (qty <= 0) {
                        if (existingItemIndex >= 0) {
                            newCart.splice(existingItemIndex, 1);
                            return newCart;
                        }
                        return prevCart;
                    }

                    if (existingItemIndex >= 0) {
                        newCart[existingItemIndex] = { ...newCart[existingItemIndex], quantity: qty };
                        return newCart;
                    } else {
                        return [...prevCart, { ...product, quantity: qty }];
                    }
                });
            }
        }
    };

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
            <header style={{ padding: isMobile ? '0.4rem 0.5rem' : '0.5rem 1rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem', flexShrink: 0, width: '100%', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <div style={{ position: 'relative', flex: isSearchExpanded ? 1 : 'initial', flexShrink: 0 }}>
                        {isSearchExpanded ? (
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', display: 'flex', alignItems: 'center', padding: '0 8px', border: '1px solid var(--accent-blue)', minWidth: isMobile ? '120px' : '200px' }}>
                                <Search size={14} />
                                <input
                                    autoFocus
                                    className="glass-input"
                                    style={{ border: 'none', background: 'transparent', width: '100%', padding: '6px', fontSize: '0.8rem' }}
                                    placeholder="Buscar..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onBlur={() => !searchQuery && setIsSearchExpanded(false)}
                                />
                                <X size={14} onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }} style={{ cursor: 'pointer' }} />
                            </div>
                        ) : (
                            <button className="glass-button" onClick={() => setIsSearchExpanded(true)} style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Search size={18} />
                            </button>
                        )}
                    </div>
                    {!isSearchExpanded && (
                        <div className={`no-scrollbar ${isMobile ? 'grid grid-rows-2 grid-flow-col' : 'flex'}`} style={{ gap: '0.3rem', overflowX: 'auto', padding: '2px 0', flex: 1, minWidth: 0 }}>
                            <button className={`glass-button ${selectedCategory === 'all' ? 'primary' : ''}`} onClick={() => setSelectedCategory('all')} style={{ whiteSpace: 'nowrap', borderRadius: '20px', padding: '3px 10px', fontSize: '0.8rem' }}>Todos</button>
                            {displayCategories.map(cat => (
                                <button key={cat.id} className={`glass-button ${selectedCategory === cat.id ? 'primary' : ''}`} onClick={() => setSelectedCategory(cat.id)} style={{ whiteSpace: 'nowrap', borderRadius: '20px', padding: '3px 10px', fontSize: '0.8rem' }}>{cat.label}</button>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button className="glass-button" onClick={() => setIsHeldOrdersModalOpen(true)} style={{ position: 'relative', padding: isMobile ? '8px' : '0.5rem 1rem' }}>
                        <Clock size={20} />
                        {heldOrders.length > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--accent-orange)', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{heldOrders.length}</span>}
                    </button>
                    <button className="glass-button" onClick={() => setIsSalesModalOpen(true)} style={{ padding: isMobile ? '8px' : '0.5rem 1rem' }}><FileText size={20} /></button>
                    {isMobile && (
                        <button className="primary-button" onClick={() => setIsCartOpen(true)} style={{ gap: '5px', padding: '8px 12px' }}>
                            <ShoppingBag size={18} />
                            <span className="font-bold">{formatPrice(total)}</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Area */}
            <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }} className="no-scrollbar">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '130px' : '160px'}, 1fr))`,
                        gap: '1rem',
                        gridAutoRows: 'min-content',
                        alignContent: 'start'
                    }}>
                        {filteredProducts.map(p => (
                            <ProductCard
                                key={p.id}
                                product={{ ...p, quantity: cart.find(c => c.id === p.id)?.quantity || 0 }}
                                onAdd={addToCart}
                                onRemove={removeFromCart}
                                onLongPress={handleSetQuantity}
                                priceDisplay={formatPrice(p.price)}
                            />
                        ))}
                    </div>
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

            {/* Payment Modal (Ultra-Premium Redesign - Ph2) */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title={
                    <div className="flex items-center justify-between w-full pr-4">
                        <span className="text-lg font-black tracking-tight">Procesar Pago</span>
                        <div
                            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-300 ${loadingBcv
                                ? 'bg-orange-500/20 border-orange-500/50 animate-pulse'
                                : 'bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40'
                                } shadow-sm cursor-pointer`}
                        >
                            <span
                                className="text-[9px] text-orange-400 font-extrabold uppercase tracking-widest hover:text-orange-300 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRefreshBcv();
                                }}
                                title="Actualizar desde BCV"
                            >
                                {loadingBcv ? 'Cargando...' : 'Tasa'}
                            </span>

                            {isEditingRate ? (
                                <input
                                    autoFocus
                                    className="bg-transparent text-lg font-black text-white font-mono w-24 outline-none border-b border-orange-500/50 text-center"
                                    value={tempRate}
                                    onChange={(e) => setTempRate(e.target.value)}
                                    onBlur={handleSaveManualRate}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveManualRate();
                                        if (e.key === 'Escape') setIsEditingRate(false);
                                    }}
                                />
                            ) : (
                                <span
                                    className="text-lg font-black text-white font-mono hover:scale-105 transition-transform"
                                    onClick={() => {
                                        setTempRate(data.exchangeRate.toString());
                                        setIsEditingRate(true);
                                    }}
                                    title="Clic para editar manual"
                                >
                                    {formatAmount(data.exchangeRate, 'Bs', 2)}
                                </span>
                            )}

                            <span className="text-[9px] text-orange-400/60 font-bold uppercase">Bs/$</span>
                        </div>
                    </div>
                }
                fullscreen={isMobile}
                footer={
                    <button
                        className={`primary-button w-full py-4 text-xl font-black flex items-center justify-center gap-3 shadow-xl ${payments.length === 0 ? 'opacity-50 grayscale' : 'shadow-orange-600/20'}`}
                        style={{ borderRadius: '12px' }}
                        disabled={payments.length === 0}
                        onClick={handleFinalizePayment}
                    >
                        <ShoppingBag size={24} />
                        FINALIZAR VENTA
                    </button>
                }
            >
                <div className="animate-fade-in text-white h-full flex flex-col no-scrollbar">
                    <div className="flex-1 flex flex-col gap-4">
                        {/* 1. TOP BANNER: SALDO PENDIENTE */}
                        <div
                            className="glass-panel p-5 text-center border-orange-500/40 bg-orange-500/10 relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
                            style={{ borderRadius: '18px' }}
                            onClick={() => setPendingCurrency(c => c === 'USD' ? 'BS' : 'USD')}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 -mr-12 -mt-12 rounded-full"></div>
                            <span className="text-[10px] text-orange-400 font-black uppercase tracking-[0.2em] block mb-2">SALDO PENDIENTE ({pendingCurrency})</span>
                            {(() => {
                                const discVal = parseFloat(discountValue) || 0;
                                const tipVal = parseFloat(tipAmount) || 0;
                                const rate = data.exchangeRate || 1;

                                let finalDiscount = 0;
                                if (discountType === 'percent') finalDiscount = total * (discVal / 100);
                                else if (discountType === 'USD') finalDiscount = discVal;
                                else if (discountType === 'BS') finalDiscount = discVal / rate;

                                let finalTip = 0;
                                if (tipType === 'percent') finalTip = total * (tipVal / 100);
                                else if (tipType === 'USD') finalTip = tipVal;
                                else if (tipType === 'BS') finalTip = tipVal / rate;

                                const totalNeto = total - finalDiscount + finalTip;
                                const yaPagado = payments.reduce((sum, p) => sum + (p.currency === 'USD' ? p.amount : p.amount / p.rate), 0);
                                const pendingUSD = Math.max(0, totalNeto - yaPagado);

                                return (
                                    <>
                                        <h2 className="text-5xl font-black text-white flex items-center justify-center gap-2">
                                            {pendingCurrency === 'USD' ? (
                                                <><span className="text-2xl text-orange-500/60">$</span>{pendingUSD.toFixed(2)}</>
                                            ) : (
                                                <><span className="text-2xl text-orange-500/60 font-mono">Bs</span>{formatAmount(pendingUSD * rate, 'Bs', 2)}</>
                                            )}
                                        </h2>

                                        <div className="flex flex-col items-center gap-1 mt-4 pt-3 border-t border-white/5">
                                            <div className="text-xs flex items-center gap-2">
                                                <span className="text-orange-400 font-bold uppercase tracking-widest">Base:</span>
                                                <span className="text-white font-bold">${total.toFixed(2)} / Bs {formatAmount(total * rate, 'Bs', 2)}</span>
                                            </div>
                                            {finalDiscount > 0 && (
                                                <div className="text-xs flex items-center gap-2">
                                                    <span className="text-red-400 font-bold uppercase tracking-widest">Descuento:</span>
                                                    <span className="text-white font-bold">-${finalDiscount.toFixed(2)} / -Bs {formatAmount(finalDiscount * rate, 'Bs', 2)}</span>
                                                </div>
                                            )}
                                            {finalTip > 0 && (
                                                <div className="text-xs flex items-center gap-2">
                                                    <span className="text-green-400 font-bold uppercase tracking-widest">Propina:</span>
                                                    <span className="text-white font-bold">${finalTip.toFixed(2)} / Bs {formatAmount(finalTip * rate, 'Bs', 2)}</span>
                                                </div>
                                            )}
                                            <div className="text-xs flex items-center gap-2">
                                                <span className="text-orange-400 font-bold uppercase tracking-widest">Total Neto:</span>
                                                <span className="text-white font-black">${totalNeto.toFixed(2)} / Bs {formatAmount(totalNeto * rate, 'Bs', 2)}</span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* 2. MAIN GRID */}
                        <div className="flex flex-col md:flex-row gap-4 min-h-0">
                            <div className="flex-[1.2] flex flex-col gap-4">
                                {/* Form: Registrar Pago */}
                                <div className="glass-panel p-4 border-orange-500/20 bg-orange-500/5 relative overflow-hidden" style={{ borderRadius: '16px' }}>
                                    <label className="text-[10px] font-bold text-orange-400 mb-3 block uppercase tracking-widest">Registrar Pago</label>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="number"
                                                    className="glass-input w-full text-3xl font-black p-4 text-center ring-inset focus:ring-1 ring-orange-500/50"
                                                    style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}
                                                    value={currentPaymentAmount}
                                                    onChange={e => setCurrentPaymentAmount(e.target.value)}
                                                    placeholder="0.00"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black text-lg">
                                                    {(() => {
                                                        const methodObj = paymentMethods.find(m => m.label === currentPaymentMethod);
                                                        return (methodObj?.label.toLowerCase().includes('bs') || methodObj?.label.toLowerCase().includes('punto') || methodObj?.label.toLowerCase().includes('movil')) ? 'Bs' : '$';
                                                    })()}
                                                </div>
                                            </div>
                                            <select
                                                className="glass-input h-auto px-4 text-sm font-bold sm:w-44 bg-white/5"
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

                                        <div className="flex gap-2">
                                            <button
                                                className="glass-button flex-1 text-[10px] font-bold py-3 border-green-500/30 text-green-400 bg-green-500/5"
                                                style={{ borderRadius: '10px' }}
                                                onClick={() => {
                                                    const discVal = parseFloat(discountValue) || 0;
                                                    const tipVal = parseFloat(tipAmount) || 0;
                                                    const rate = data.exchangeRate || 1;
                                                    let finalDiscount = 0;
                                                    if (discountType === 'percent') finalDiscount = total * (discVal / 100);
                                                    else if (discountType === 'USD') finalDiscount = discVal;
                                                    else if (discountType === 'BS') finalDiscount = discVal / rate;

                                                    let finalTip = 0;
                                                    if (tipType === 'percent') finalTip = total * (tipVal / 100);
                                                    else if (tipType === 'USD') finalTip = tipVal;
                                                    else if (tipType === 'BS') finalTip = tipVal / rate;

                                                    const totalNeto = total - finalDiscount + finalTip;
                                                    const yaPagado = payments.reduce((sum, p) => sum + (p.currency === 'USD' ? p.amount : p.amount / p.rate), 0);
                                                    const faltaUSD = Math.max(0, totalNeto - yaPagado);
                                                    setCurrentPaymentAmount(pendingCurrency === 'BS' ? (faltaUSD * rate).toFixed(2) : faltaUSD.toFixed(2));
                                                }}
                                            >
                                                Monto Pendiente
                                            </button>
                                            <button
                                                className="primary-button flex-[2] p-3 text-lg font-black flex items-center justify-center gap-2 shadow-lg"
                                                style={{ borderRadius: '10px' }}
                                                onClick={() => {
                                                    if (!currentPaymentAmount || !currentPaymentMethod) return;
                                                    const method = currentPaymentMethod;
                                                    const isBs = method.toLowerCase().includes('bs') || method.toLowerCase().includes('punto') || method.toLowerCase().includes('pago movil');
                                                    const amount = parseFloat(currentPaymentAmount);

                                                    if (method.toLowerCase().includes('efectivo')) {
                                                        const discVal = parseFloat(discountValue) || 0;
                                                        const tipVal = parseFloat(tipAmount) || 0;
                                                        const rate = data.exchangeRate || 1;
                                                        let finalDiscount = 0;
                                                        if (discountType === 'percent') finalDiscount = total * (discVal / 100);
                                                        else if (discountType === 'USD') finalDiscount = discVal;
                                                        else if (discountType === 'BS') finalDiscount = discVal / rate;

                                                        let finalTip = 0;
                                                        if (tipType === 'percent') finalTip = total * (tipVal / 100);
                                                        else if (tipType === 'USD') finalTip = tipVal;
                                                        else if (tipType === 'BS') finalTip = tipVal / rate;

                                                        const totalNeto = total - finalDiscount + finalTip;
                                                        const yaPagado = payments.reduce((sum, p) => sum + (p.currency === 'USD' ? p.amount : p.amount / p.rate), 0);
                                                        const pendingDebt = Math.max(0, totalNeto - yaPagado);

                                                        setPendingPaymentData({
                                                            method,
                                                            amount,
                                                            debtAmount: pendingDebt,
                                                            currency: isBs ? 'BS' : 'USD',
                                                            rate: data.exchangeRate
                                                        });
                                                        setIsCashModalOpen(true);
                                                    } else {
                                                        setPayments([...payments, {
                                                            id: Date.now(),
                                                            method,
                                                            amount,
                                                            currency: isBs ? 'BS' : 'USD',
                                                            rate: data.exchangeRate
                                                        }]);
                                                        setCurrentPaymentAmount('');
                                                    }
                                                }}
                                            >
                                                AGREGAR PAGO <Check size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Amounts (Denominaciones) */}
                                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-2">
                                    {[1, 5, 10, 20, 50, 100].map(v => (
                                        <button
                                            key={v}
                                            className="glass-panel py-3 text-sm font-black border-white/5 bg-white/5 hover:bg-orange-600/20 hover:border-orange-500/40 active:scale-95 transition-all text-gray-400 hover:text-white"
                                            style={{ borderRadius: '14px' }}
                                            onClick={() => setCurrentPaymentAmount(v.toString())}
                                        >
                                            +${v}
                                        </button>
                                    ))}
                                </div>

                                {/* Adjustments */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="glass-panel p-4 border-white/10 bg-white/5 flex flex-col">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block tracking-widest">Descuento</label>
                                        <div className="flex gap-2 mt-auto">
                                            <input
                                                type="number"
                                                className="glass-input p-2 flex-1 text-base font-black text-center bg-transparent border-b border-white/10"
                                                style={{ border: 'none', borderBottom: '2px solid rgba(255,255,255,0.05)', borderRadius: 0 }}
                                                value={discountValue}
                                                onChange={e => setDiscountValue(e.target.value)}
                                                placeholder="0"
                                            />
                                            <div className="flex bg-black/20 rounded-xl p-1 border border-white/5">
                                                {['percent', 'USD', 'BS'].map((type) => (
                                                    <button
                                                        key={type}
                                                        className={`w-9 h-9 flex items-center justify-center rounded-lg font-black text-[10px] transition-all duration-200 active:scale-95 ${discountType === type ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                                        onClick={() => setDiscountType(type)}
                                                    >
                                                        {type === 'percent' ? '%' : type === 'USD' ? '$' : 'Bs'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="glass-panel p-4 border-white/10 bg-white/5 flex flex-col">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block tracking-widest">Propina</label>
                                        <div className="flex gap-2 mt-auto">
                                            <input
                                                type="number"
                                                className="glass-input p-2 flex-1 text-base font-black text-center bg-transparent border-b border-white/10"
                                                style={{ border: 'none', borderBottom: '2px solid rgba(255,255,255,0.05)', borderRadius: 0 }}
                                                value={tipAmount}
                                                onChange={e => setTipAmount(e.target.value)}
                                                placeholder="0.00"
                                            />
                                            <div className="flex bg-black/20 rounded-xl p-1 border border-white/5">
                                                {['percent', 'USD', 'BS'].map((type) => (
                                                    <button
                                                        key={type}
                                                        className={`w-9 h-9 flex items-center justify-center rounded-lg font-black text-[10px] transition-all duration-200 active:scale-95 ${tipType === type ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                                        onClick={() => setTipType(type)}
                                                    >
                                                        {type === 'percent' ? '%' : type === 'USD' ? '$' : 'Bs'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Payments */}
                            <div className="flex-1 flex flex-col gap-3 min-h-[300px]">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Pagos Registrados ({payments.length})</label>
                                <div className="flex-1 overflow-y-auto flex flex-col gap-2 no-scrollbar p-1">
                                    {payments.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-gray-700 border-2 border-dashed border-white/5 rounded-2xl opacity-40">
                                            <Wallet size={40} className="mb-2" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Sin pagos registrados</span>
                                        </div>
                                    ) : (
                                        payments.map(p => (
                                            <div key={p.id} className="glass-panel p-3 flex justify-between items-center bg-white/5 border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-orange-500/10 p-2.5 rounded-xl text-orange-400">
                                                        {p.method.toLowerCase().includes('efectivo') ? <Banknote size={20} /> : <CreditCard size={20} />}
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-gray-500 font-bold uppercase block tracking-tighter">{p.method}</span>
                                                        <span className="text-lg font-black text-white italic">
                                                            {p.currency === 'BS' ? 'Bs' : '$'} {formatAmount(p.amount, p.currency, 2)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    className="w-10 h-10 flex items-center justify-center text-red-400 bg-red-400/0 hover:bg-red-400/10 rounded-full"
                                                    onClick={() => setPayments(prev => prev.filter(pay => pay.id !== p.id))}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* DESIGNS: Volver al Carrito as a large body button */}
                        <div className="mt-2">
                            <button
                                className="glass-button w-full py-3.5 text-sm font-black uppercase tracking-widest text-gray-500 hover:text-gray-300 border-white/5 hover:bg-white/5"
                                style={{ borderRadius: '14px' }}
                                onClick={() => setIsPaymentModalOpen(false)}
                            >
                                VOLVER AL CARRITO
                            </button>
                        </div>
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
                    {currentUser?.role !== 'cashier' && (
                        <div className="glass-panel p-4 bg-green-500/10 border-green-500/30 text-center">
                            <span className="text-xs text-green-400 font-bold">VENTAS TOTALES (HOY)</span>
                            <h2 className="text-3xl font-black text-green-500">${(data.sales || []).reduce((sum, s) => sum + s.total, 0).toFixed(2)}</h2>
                        </div>
                    )}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(data.sales || []).slice().reverse().slice(0, currentUser?.role === 'cashier' ? 4 : undefined).map(sale => (
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

            {/* Cash Denomination Modal */}
            <CashDenominationModal
                isOpen={isCashModalOpen}
                onClose={() => setIsCashModalOpen(false)}
                amount={pendingPaymentData?.amount || 0}
                debtAmount={pendingPaymentData?.currency === 'BS' ? (pendingPaymentData.debtAmount * pendingPaymentData.rate) : pendingPaymentData?.debtAmount}
                currency={pendingPaymentData?.currency}
                denominationsConfig={pendingPaymentData?.currency === 'BS' ? data.denominationsBS : data.denominationsUSD}
                onConfirm={(breakdown, totalReceived, changeAmount, changeMethod) => {
                    const amountToPay = pendingPaymentData?.amount || 0;
                    const effectiveAmount = Math.min(totalReceived, amountToPay);

                    setPayments([...payments, {
                        ...pendingPaymentData,
                        id: Date.now(),
                        amount: effectiveAmount,
                        denominations: breakdown,
                        received: totalReceived,
                        change: changeAmount,
                        changeMethod: changeMethod
                    }]);
                    setIsCashModalOpen(false);
                    setPendingPaymentData(null);
                    setCurrentPaymentAmount('');
                }}
            />

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
