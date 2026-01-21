import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, footer, fullscreen = false }) => {
    if (!isOpen) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: fullscreen ? '0' : '1rem'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: fullscreen ? '100%' : '540px',
                height: fullscreen ? '100%' : 'auto',
                maxHeight: fullscreen ? '100%' : '90vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-dark)',
                border: fullscreen ? 'none' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                borderRadius: fullscreen ? '0' : '16px',
                overflow: 'hidden'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    flexShrink: 0
                }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', flex: 1, margin: 0 }}>{title}</h2>
                    <button
                        onClick={onClose}
                        className="glass-button"
                        style={{ padding: '0.25rem', border: 'none' }}
                    >
                        <X size={18} />
                    </button>
                </div>
                <div style={{
                    padding: '1rem',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                }} className="no-scrollbar">
                    {children}
                </div>
                {footer && (
                    <div style={{
                        padding: '1rem',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.2)',
                        flexShrink: 0
                    }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
