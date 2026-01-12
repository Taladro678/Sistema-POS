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
    formatPrice,
    onUpdatePriority,
    onToggleTakeaway
}) => {

    const priorities = [
        { id: 'normal', label: 'Normal', color: '#94a3b8' },
        { id: 'priority', label: 'Prioridad', color: '#f59e0b' },
        { id: 'high', label: 'Alta', color: '#ef4444' }
    ];

    const getPriorityColor = (pId) => priorities.find(p => p.id === pId)?.color || '#94a3b8';

    return (
        <div className="glass-panel" style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            boxSizing: 'border-box'
        }}>
            {/* Header */}
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

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="no-scrollbar">
                {cart.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                        <ShoppingBag size={48} style={{ marginBottom: '1rem' }} />
                        <p>Carrito vacío</p>
                    </div>
                ) : (
                    cart.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="glass-panel" style={{
                            padding: '0.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderLeftWidth: '3px',
                            borderLeftColor: getPriorityColor(item.priority || 'normal')
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    background: item.image ? 'transparent' : `hsl(${(item.name.charCodeAt(0) * 5) % 360}, 70%, 30%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }}>
                                    {item.image ? (
                                        <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        item.name.substring(0, 2).toUpperCase()
                                    )}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ fontSize: '0.9rem', margin: 0, fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.name}
                                    </h4>
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.2rem' }}>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--accent-orange)', margin: 0, fontWeight: '700' }}>
                                            {formatPrice ? formatPrice(item.price * (item.quantity || 1)) : `$${(item.price * (item.quantity || 1)).toFixed(2)}`}
                                        </p>
                                        {item.isTakeaway && (
                                            <span
                                                onClick={() => onToggleTakeaway && onToggleTakeaway(index)}
                                                style={{ fontSize: '0.6rem', background: '#818cf8', color: 'white', padding: '0.05rem 0.3rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                LLEVAR
                                            </span>
                                        )}
                                        {item.priority && item.priority !== 'normal' && (
                                            <span
                                                onClick={() => onUpdatePriority && onUpdatePriority(index, 'normal')}
                                                style={{ fontSize: '0.6rem', background: getPriorityColor(item.priority), color: 'black', padding: '0.05rem 0.3rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                {item.priority.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <button
                                        onClick={() => onRemove(item.id)}
                                        className="glass-button"
                                        style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                    >
                                        -
                                    </button>
                                    <span style={{ fontWeight: 'bold', fontSize: '1rem', minWidth: '1.2rem', textAlign: 'center' }}>{item.quantity || 1}</span>
                                    <button
                                        onClick={() => onAdd(item)}
                                        className="glass-button primary"
                                        style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--accent-orange)' }}>
                        {formatPrice ? formatPrice(total) : `$${total.toFixed(2)}`}
                    </span>
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

