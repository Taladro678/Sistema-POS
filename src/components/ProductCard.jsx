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
                {imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                            e.target.style.display = 'none'; // Hide broken image
                            // setImgSrc(null); // Force fallback render
                            // But better logic: if we tried local and failed, we show placeholder.
                            // The current DOM structure hides img and shows div if src is invalid? No, it shows alt.
                            // We need to conditionally render the fallback DIV if image errors.
                            e.currentTarget.parentElement.classList.add('image-error');
                        }}
                        onLoad={(e) => {
                            e.currentTarget.parentElement.classList.remove('image-error');
                        }}
                    />
                ) : null}

                {/* Fallback Placeholder - Show if img has error (via CSS class trick or state) */}
                {/* State based approach is cleaner but async */}
                <div
                    className="fallback-placeholder"
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex', // Default flex, we will hide it if image loads? 
                        // Actually, simplified: always render image, if it fails, hide it.
                        // ALWAYS render placeholder BEHIND image?
                        // If image loads, it covers placeholder. If image is transparent png, it works too.
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: -1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.25rem',
                        background: `hsl(${(product.name.charCodeAt(0) * 10) % 360}, 60%, 25%)`,
                        color: 'rgba(255,255,255,0.95)',
                        fontSize: product.name.length > 50 ? '0.5rem'
                            : product.name.length > 30 ? '0.55rem'
                                : product.name.length > 15 ? '0.65rem'
                                    : '0.8rem',
                        lineHeight: '1.2',
                        fontWeight: '700',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        overflowWrap: 'anywhere',
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
            <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.1rem', wordWrap: 'break-word', lineHeight: '1.2' }}>{product.name}</h3>
                <p style={{ color: 'var(--accent-orange)', fontWeight: 'bold', fontSize: '0.9rem' }}>${product.price.toFixed(2)}</p>
            </div>
        </div>
    );
};

export default ProductCard;
