import React from 'react';
import { Trash2, CreditCard, Clock, Maximize2, Minimize2 } from 'lucide-react';

const CartSidebar = ({ cart, onRemove, onAdd, onPay, total, onHold, onToggleExpand, isExpanded }) => {
    return (
        <div className="glass-panel" style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Orden Actual</h2>
                    {cart.length > 0 && (
                        <span style={{
                            background: 'var(--accent-green)',
                            color: 'white',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                        }}>
                            {cart.length} items
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={onHold}
                        className="glass-button"
                        style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Poner en Espera"
                        disabled={cart.length === 0}
                    >
                        <Clock size={18} />
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

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {cart.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
                        Carrito vacío
                    </p>
                ) : (
                    cart.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="glass-panel" style={{
                            padding: '0.25rem 0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(255,255,255,0.03)'
                        }}>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '0.8rem', marginBottom: '0', lineHeight: '1' }}>{item.name}</h4>
                                <p style={{ fontSize: '0.7rem', color: 'var(--accent-orange)', marginTop: '2px' }}>${item.price.toFixed(2)}</p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <button
                                    onClick={() => onRemove(item.id)}
                                    className="glass-button"
                                    style={{ padding: '0', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}
                                >
                                    -
                                </button>
                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', minWidth: '1.2rem', textAlign: 'center' }}>{item.quantity || 1}</span>
                                <button
                                    onClick={() => onAdd(item)}
                                    className="glass-button primary"
                                    style={{ padding: '0', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}
                                >
                                    +
                                </button>
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
