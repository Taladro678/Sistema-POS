import React from 'react';

const ProductCard = ({ product, onAdd }) => {
    // Helper to sanitize name for filenames
    // Replace non-alphanumeric chars with underscore, lowercase
    const safeName = React.useMemo(() => {
        return product.name
            .toLowerCase()
            .replace(/ñ/g, 'n')
            .replace(/[áäà]/g, 'a')
            .replace(/[éëè]/g, 'e')
            .replace(/[íïì]/g, 'i')
            .replace(/[óöò]/g, 'o')
            .replace(/[úüù]/g, 'u')
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }, [product.name]);

    // Use a ref to check if local image failed, to avoid infinite loop or flicker if handled poorly
    // Simpler approach: use generic onError
    const [imgSrc, setImgSrc] = React.useState(product.image || `/products/${safeName}.jpg`);

    // Reset when product changes
    React.useEffect(() => {
        setImgSrc(product.image || `/products/${safeName}.jpg`);
    }, [product, safeName]);

    return (
        <div
            className="glass-panel"
            onClick={() => onAdd(product)}
            style={{
                padding: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                height: '100%' // Ensure card takes full height of grid cell
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            title={product.name}
        >
            <div style={{
                width: '100%',
                height: '100px', // Fixed height for image area
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0 // Prevent image from shrinking
            }}>
                {imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.currentTarget.parentElement.classList.add('image-error');
                        }}
                        onLoad={(e) => {
                            e.currentTarget.parentElement.classList.remove('image-error');
                        }}
                    />
                ) : null}

                <div
                    className="fallback-placeholder"
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: -1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.25rem',
                        background: `hsl(${(product.name.charCodeAt(0) * 10) % 360}, 60%, 25%)`,
                        color: 'rgba(255,255,255,0.95)',
                        // Dynamic Font Size for Placeholder
                        fontSize: product.name.length > 50 ? '0.55rem'
                            : product.name.length > 30 ? '0.65rem'
                                : product.name.length > 15 ? '0.75rem'
                                    : '0.9rem',
                        lineHeight: '1.2',
                        fontWeight: '700',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        hyphens: 'auto',
                        flexDirection: 'column',
                    }}
                >
                    {product.name}
                </div>
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '0.1rem' }}>
                <h3 style={{
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    marginBottom: '0',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    lineHeight: '1.2',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {product.name}
                </h3>
                <p style={{ color: 'var(--accent-orange)', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '0' }}>
                    ${product.price.toFixed(2)}
                </p>
            </div>
        </div>
    );
};

export default ProductCard;
