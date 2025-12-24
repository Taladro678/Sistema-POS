import React from 'react';

const LoadingSpinner = ({ fullScreen = false, message = 'Cargando...' }) => {
    const spinnerStyle = {
        width: '40px',
        height: '40px',
        border: '4px solid rgba(255, 255, 255, 0.1)',
        borderLeftColor: 'var(--accent-blue, #00f260)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    };

    const containerStyle = fullScreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(26, 26, 46, 0.8)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999
    } : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
    };

    return (
        <div style={containerStyle}>
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
            <div style={spinnerStyle}></div>
            {message && <p style={{ marginTop: '1rem', color: 'var(--text-secondary, #a0a0a0)' }}>{message}</p>}
        </div>
    );
};

export default LoadingSpinner;
