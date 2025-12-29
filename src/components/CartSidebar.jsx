import React from 'react';
import { Trash2, CreditCard, Clock, Maximize2, Minimize2, ChefHat, AlertCircle, ShoppingBag } from 'lucide-react';

const CartSidebar = ({
    cart,
    onRemove,
    onAdd,
    onClear,
    onPay,
    total,
    onHold,
    onSendToKitchen,
    onToggleExpand,
    isExpanded,
    currentTable,
    orderPriority,
    setOrderPriority,
    onUpdateItemPriority,
    isTakeaway,
    setIsTakeaway,
    onToggleItemTakeaway
}) => {

    const priorities = [
        { id: 'normal', label: 'Normal', color: '#94a3b8' },
        { id: 'priority', label: 'Prioridad', color: '#f59e0b' },
        { id: 'high', label: 'Alta', color: '#ef4444' }
    ];

    const getPriorityColor = (pId) => priorities.find(p => p.id === pId)?.color || '#94a3b8';

    return (
        /* ... existing structure ... */
        <div className="glass-panel" style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            boxSizing: 'border-box'
        }}>
            {/* Header ... */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                        onClick={onClear}
                        className="glass-button"
                        style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-red)', borderColor: 'var(--accent-red)', marginRight: '0.5rem' }}
                        title="Vaciar Carrito"
                        disabled={cart.length === 0}
                    >
                        <Trash2 size={18} />
                    </button>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Orden Actual</h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* Hold Button - ALWAYS SHOW */}
                    <button
                        onClick={onHold}
                        className="glass-button"
                        style={{
                            padding: '0.4rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="Poner en Espera / Guardar Borrador"
                        disabled={cart.length === 0}
                    >
                        <Clock size={18} />
                    </button>

                    {/* Send to Kitchen Button */}
                    <button
                        onClick={onSendToKitchen}
                        className={`glass-button ${currentTable ? 'active-table-btn' : ''}`}
                        style={{
                            padding: '0.4rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderColor: currentTable ? 'var(--accent-orange)' : undefined,
                            color: currentTable ? 'var(--accent-orange)' : 'inherit'
                        }}
                        title={currentTable ? `Enviar a Cocina` : "Enviar a Cocina / Barra"}
                        disabled={cart.length === 0}
                    >
                        <ChefHat size={18} color={currentTable && cart.length > 0 ? "var(--accent-orange)" : "currentColor"} />
                    </button>
                    <button
                        onClick={onToggleExpand}
                        className="glass-button"
                        style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={isExpanded ? "Contraer" : "Expandir"}
                    >
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>

            {/* Order Priority & Options Selector */}
            {cart.length > 0 && (
                <div className="glass-panel" style={{ padding: '0.5rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.2)' }}>
                    {/* Priority Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={14} className="text-gray-400" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Prioridad:</span>
                        <div style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
                            {priorities.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setOrderPriority(p.id)}
                                    style={{
                                        flex: 1,
                                        fontSize: '0.65rem',
                                        padding: '0.2rem',
                                        borderRadius: '4px',
                                        border: `1px solid ${orderPriority === p.id ? p.color : 'rgba(255,255,255,0.1)'}`,
                                        background: orderPriority === p.id ? `${p.color}22` : 'transparent',
                                        color: orderPriority === p.id ? p.color : 'var(--text-secondary)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Takeaway Row (Global) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShoppingBag size={14} className="text-gray-400" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Opción:</span>
                        <button
                            onClick={() => setIsTakeaway(!isTakeaway)}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                fontSize: '0.75rem',
                                padding: '0.3rem',
                                borderRadius: '4px',
                                border: `1px solid ${isTakeaway ? '#818cf8' : 'rgba(255,255,255,0.1)'}`, // Indigo color
                                background: isTakeaway ? '#818cf822' : 'transparent',
                                color: isTakeaway ? '#818cf8' : 'var(--text-secondary)',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }}
                        >
                            <ShoppingBag size={14} />
                            {isTakeaway ? 'PARA LLEVAR (Toda la Orden)' : 'Comer Aquí'}
                        </button>
                    </div>
                </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {cart.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
                        Carrito vacío
                    </p>
                ) : (
                    cart.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="glass-panel" style={{
                            padding: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderLeftWidth: '3px',
                            borderLeftColor: getPriorityColor(item.priority || 'normal')
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '0.85rem', margin: 0, fontWeight: '600' }}>
                                        {item.name}
                                        {item.isTakeaway && (
                                            <span style={{ fontSize: '0.6rem', marginLeft: '0.5rem', background: '#818cf8', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                                                LLEVAR
                                            </span>
                                        )}
                                    </h4>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--accent-orange)', margin: 0 }}>${item.price.toFixed(2)}</p>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    {/* Item Takeaway Toggle */}
                                    <button
                                        onClick={() => onToggleItemTakeaway(index)}
                                        className="glass-button"
                                        style={{
                                            padding: '0',
                                            width: '26px',
                                            height: '26px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: item.isTakeaway ? '#818cf8' : 'var(--text-secondary)',
                                            borderColor: item.isTakeaway ? '#818cf8' : 'rgba(255,255,255,0.1)'
                                        }}
                                        title="Marcar este item para llevar"
                                    >
                                        <ShoppingBag size={14} />
                                    </button>

                                    <button
                                        onClick={() => onRemove(item.id)}
                                        className="glass-button"
                                        style={{ padding: '0', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        -
                                    </button>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', minWidth: '1.2rem', textAlign: 'center' }}>{item.quantity || 1}</span>
                                    <button
                                        onClick={() => onAdd(item)}
                                        className="glass-button primary"
                                        style={{ padding: '0', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Item Priority */}
                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                                {priorities.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => onUpdateItemPriority(index, p.id)}
                                        style={{
                                            fontSize: '0.6rem',
                                            padding: '0.15rem 0.4rem',
                                            borderRadius: '3px',
                                            border: 'none',
                                            background: (item.priority || 'normal') === p.id ? p.color : 'rgba(255,255,255,0.05)',
                                            color: (item.priority || 'normal') === p.id ? '#000' : 'var(--text-secondary)',
                                            fontWeight: (item.priority || 'normal') === p.id ? 'bold' : 'normal',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Subtotal</span>
                    <span style={{ fontSize: '0.8rem' }}>${total.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Impuesto (0%)</span>
                    <span style={{ fontSize: '0.8rem' }}>$0.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--accent-orange)' }}>${total.toFixed(2)}</span>
                </div>

                <button
                    className="glass-button primary"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    onClick={onPay}
                    disabled={cart.length === 0}
                >
                    <CreditCard size={20} />
                    PAGAR AHORA
                </button>
            </div>
        </div>
    );
};

export default CartSidebar;

