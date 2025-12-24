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
            </div>
            <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h3>
                <p style={{ color: 'var(--accent-orange)', fontWeight: 'bold', fontSize: '0.9rem' }}>${product.price.toFixed(2)}</p>
            </div>
        </div>
    );
};

export default ProductCard;
