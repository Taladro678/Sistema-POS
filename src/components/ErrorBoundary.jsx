import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    height: '100vh',
                    width: '100vw',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    color: '#fff',
                    fontFamily: 'sans-serif'
                }}>
                    <div className="glass-panel" style={{
                        padding: '2rem',
                        borderRadius: '16px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'center',
                        maxWidth: '500px'
                    }}>
                        <AlertTriangle size={48} color="#ff6b6b" style={{ marginBottom: '1rem' }} />
                        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>¡Ups! Algo salió mal</h1>
                        <p style={{ color: '#a0a0a0', marginBottom: '1.5rem' }}>
                            Ha ocurrido un error inesperado en la aplicación.
                        </p>

                        {this.state.error && (
                            <div style={{
                                background: 'rgba(0,0,0,0.3)',
                                padding: '1rem',
                                borderRadius: '8px',
                                marginBottom: '1.5rem',
                                textAlign: 'left',
                                overflow: 'auto',
                                maxHeight: '150px',
                                fontSize: '0.8rem',
                                fontFamily: 'monospace'
                            }}>
                                {this.state.error.toString()}
                            </div>
                        )}

                        <button
                            onClick={this.handleReload}
                            style={{
                                background: 'linear-gradient(135deg, #00f260 0%, #0575e6 100%)',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                margin: '0 auto'
                            }}
                        >
                            <RefreshCw size={18} />
                            Recargar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
