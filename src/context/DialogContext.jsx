import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Info, CheckCircle, HelpCircle, X } from 'lucide-react';

const DialogContext = createContext();

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

export const DialogProvider = ({ children }) => {
    const [dialog, setDialog] = useState(null);

    const confirm = useCallback(({ title = 'Confirmar', message, confirmText = 'Aceptar', cancelText = 'Cancelar', type = 'confirm' }) => {
        return new Promise((resolve) => {
            setDialog({
                title,
                message,
                confirmText,
                cancelText,
                type,
                onConfirm: () => {
                    setDialog(null);
                    resolve(true);
                },
                onCancel: () => {
                    setDialog(null);
                    resolve(false);
                }
            });
        });
    }, []);

    const alert = useCallback(({ title = 'Aviso', message, confirmText = 'Aceptar', type = 'alert' }) => {
        return new Promise((resolve) => {
            setDialog({
                title,
                message,
                confirmText,
                type,
                onConfirm: () => {
                    setDialog(null);
                    resolve(true);
                },
                onCancel: () => {
                    setDialog(null);
                    resolve(true);
                }
            });
        });
    }, []);

    // Also support prompt if needed, but for now let's focus on these two
    const prompt = useCallback(({ title = 'Entrada', message, defaultValue = '', confirmText = 'Aceptar', cancelText = 'Cancelar' }) => {
        return new Promise((resolve) => {
            setDialog({
                title,
                message,
                confirmText,
                cancelText,
                type: 'prompt',
                defaultValue,
                onConfirm: (value) => {
                    setDialog(null);
                    resolve(value);
                },
                onCancel: () => {
                    setDialog(null);
                    resolve(null);
                }
            });
        });
    }, []);

    const [promptValue, setPromptValue] = useState('');

    React.useEffect(() => {
        if (dialog?.type === 'prompt') {
            setPromptValue(dialog.defaultValue || '');
        }
    }, [dialog]);

    return (
        <DialogContext.Provider value={{ confirm, alert, prompt }}>
            {children}
            {dialog && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 20000, // Above everything
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="glass-panel" style={{
                        width: '100%',
                        maxWidth: '400px',
                        background: 'var(--bg-dark)',
                        border: '1px solid var(--accent-blue)',
                        boxShadow: '0 0 30px rgba(0, 242, 255, 0.2)',
                        overflow: 'hidden',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '1rem',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.02)'
                        }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: dialog.type === 'alert' ? 'rgba(0,212,255,0.1)' : dialog.type === 'confirm' ? 'rgba(255,165,0,0.1)' : 'rgba(0,212,255,0.1)',
                                color: dialog.type === 'alert' ? 'var(--accent-blue)' : dialog.type === 'confirm' ? 'var(--accent-orange)' : 'var(--accent-blue)'
                            }}>
                                {dialog.type === 'alert' && <Info size={18} />}
                                {dialog.type === 'confirm' && <HelpCircle size={18} />}
                                {dialog.type === 'prompt' && <CheckCircle size={18} />}
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{dialog.title}</h3>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.5rem' }}>
                            <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.9)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                {dialog.message}
                            </p>

                            {dialog.type === 'prompt' && (
                                <input
                                    type="text"
                                    className="glass-input"
                                    autoFocus
                                    style={{ width: '100%', marginTop: '1rem' }}
                                    value={promptValue}
                                    onChange={(e) => setPromptValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') dialog.onConfirm(promptValue);
                                        if (e.key === 'Escape') dialog.onCancel();
                                    }}
                                />
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.75rem',
                            padding: '1rem',
                            background: 'rgba(0,0,0,0.2)',
                            borderTop: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {dialog.type !== 'alert' && (
                                <button
                                    className="glass-button"
                                    onClick={dialog.onCancel}
                                    style={{ flex: 1, padding: '0.75rem' }}
                                >
                                    {dialog.cancelText || 'Cancelar'}
                                </button>
                            )}
                            <button
                                className="glass-button primary"
                                onClick={() => dialog.onConfirm(dialog.type === 'prompt' ? promptValue : true)}
                                style={{ flex: 1, padding: '0.75rem' }}
                            >
                                {dialog.confirmText || 'Aceptar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </DialogContext.Provider>
    );
};
