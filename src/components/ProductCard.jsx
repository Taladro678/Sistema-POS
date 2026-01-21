import React from 'react';
import { Plus, Minus } from 'lucide-react';

const ProductCard = React.memo(({ product, onAdd, onRemove, onLongPress, priceDisplay }) => {
    // Helper to sanitize name for filenames
    const safeName = React.useMemo(() => {
        return product.name
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }, [product.name]);

    const [imgSrc, setImgSrc] = React.useState(product.image || `/products/${safeName}.jpg`);
    const longPressTimer = React.useRef(null);
    const [isPressing, setIsPressing] = React.useState(false);
    const pointerStartPos = React.useRef({ x: 0, y: 0 });

    React.useEffect(() => {
        const newSrc = product.image || `/products/${safeName}.jpg`;
        setImgSrc(prev => prev !== newSrc ? newSrc : prev);
    }, [product.image, safeName]);

    // LONG PRESS LOGIC WITH POINTER EVENTS
    const handlePointerDown = React.useCallback((e) => {
        // Only trigger on main click/pointer
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        pointerStartPos.current = { x: e.clientX, y: e.clientY };
        setIsPressing(true);

        longPressTimer.current = setTimeout(() => {
            if (onLongPress) {
                onLongPress(product);
                setIsPressing(false);
            }
        }, 500);
    }, [onLongPress, product]);

    const handlePointerUp = React.useCallback((e) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;

            if (isPressing) {
                onAdd(product);
            }
        }
        setIsPressing(false);
    }, [isPressing, onAdd, product]);

    const handlePointerMove = React.useCallback((e) => {
        if (!isPressing) return;

        const moveX = Math.abs(e.clientX - pointerStartPos.current.x);
        const moveY = Math.abs(e.clientY - pointerStartPos.current.y);

        if (moveX > 15 || moveY > 15) { // Slightly larger threshold for pointer movement
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
            setIsPressing(false);
        }
    }, [isPressing]);

    const handlePointerCancel = React.useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setIsPressing(false);
    }, []);

    return (
        <div
            className={`glass-panel group ProductCard ${isPressing ? 'scale-95' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerCancel={handlePointerCancel}
            style={{
                padding: '0.4rem',
                cursor: 'pointer',
                transition: 'transform 0.1s ease-out, border 0.2s ease, background 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                position: 'relative',
                overflow: 'hidden',
                border: product.quantity > 0 ? '2px solid #fb923c' : '1px solid rgba(255, 255, 255, 0.1)',
                background: product.quantity > 0 ? 'rgba(251, 146, 60, 0.1)' : undefined,
                touchAction: 'pan-y', // Allow native vertical scrolling
                userSelect: 'none',
                WebkitUserSelect: 'none'
            }}
            title={product.name}
        >
            {/* Quantity Indicator Badge */}
            {product.quantity > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: '#fb923c',
                    color: 'white',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: '950',
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    border: '2px solid rgba(255,255,255,0.4)'
                }}>
                    {product.quantity}
                </div>
            )}

            <div style={{
                width: '100%',
                height: '80px',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
                backgroundColor: 'rgba(0,0,0,0.2)'
            }}>
                {imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={product.name}
                        loading="lazy"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: product.quantity > 0 ? 0.7 : 1,
                            transition: 'opacity 0.2s ease'
                        }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.currentTarget.parentElement.classList.add('image-error');
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
                        background: `hsl(${(product.name.charCodeAt(0) * 15) % 360}, 40%, 15%)`,
                    }}
                >
                    <div style={{ opacity: 0.2, fontSize: '2rem' }}>📦</div>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0px', textAlign: 'center', justifyContent: 'center' }}>
                <h3 style={{
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    color: 'white',
                    lineHeight: '1.1',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    margin: 0,
                    padding: '0 2px'
                }}>
                    {product.name}
                </h3>
                <p style={{ color: '#fb923c', fontWeight: '950', fontSize: '1.1rem', margin: 0, marginTop: '2px' }}>
                    {priceDisplay || `$${product.price.toFixed(2)}`}
                </p>
            </div>
        </div>
    );
});

export default ProductCard;
