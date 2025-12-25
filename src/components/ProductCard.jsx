import React from 'react';

const ProductCard = ({ product, onAdd }) => {
    return (
        <div
            className="glass-panel"
            onClick={() => onAdd(product)}
            style={{
                padding: '0.5rem',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{
                width: '100%',
                height: '100px',
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <img
                    src={product.image}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {product.quantity > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'var(--accent-red)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        {product.quantity}
                    </div>
                )}
            </div>
            <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h3>
                <p style={{ color: 'var(--accent-orange)', fontWeight: 'bold', fontSize: '0.9rem' }}>${product.price.toFixed(2)}</p>
            </div>
        </div>
    );
};

export default ProductCard;
