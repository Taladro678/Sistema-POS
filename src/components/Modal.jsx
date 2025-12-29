import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, fullscreen = false }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: fullscreen ? '1rem' : '1rem'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: fullscreen ? '100%' : '400px',
                height: fullscreen ? '95vh' : 'auto',
                maxHeight: fullscreen ? '95vh' : '90vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-dark)',
                border: '1px solid var(--accent-blue)',
                boxShadow: '0 0 20px rgba(0, 242, 255, 0.2)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    flexShrink: 0
                }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{title}</h2>
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
                    flex: 1
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
