import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/glassmorphism.css'; // Ensure we use the glass styles

export const LoginPage = () => {
    const [pin, setPin] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleNumberClick = (num) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
            setError('');
        }
    };

    const handleClear = () => {
        setPin('');
        setError('');
    };

    const handleLogin = () => {
        const result = login(pin);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.message);
            setPin('');
        }
    };

    return (
        <div className="login-container" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '1rem',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white',
            overflowY: 'auto'
        }}>
            <div className="glass-panel" style={{
                padding: '1.5rem',
                width: '100%',
                maxWidth: '320px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Bienvenido</h2>
                <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>Ingresa tu PIN</p>

                <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '0.5rem',
                    borderRadius: '10px',
                    fontSize: '1.5rem',
                    letterSpacing: '8px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.5rem'
                }}>
                    {'•'.repeat(pin.length)}
                </div>

                {error && <p style={{ color: '#ff6b6b', fontSize: '0.8rem', margin: 0 }}>{error}</p>}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num.toString())}
                            className="glass-button"
                            style={{ fontSize: '1.25rem', padding: '10px', touchAction: 'manipulation' }}
                        >
                            {num}
                        </button>
                    ))}
                    <button onClick={handleClear} className="glass-button" style={{ background: 'rgba(255,107,107,0.3)', padding: '10px', touchAction: 'manipulation' }}>C</button>
                    <button onClick={() => handleNumberClick('0')} className="glass-button" style={{ fontSize: '1.25rem', padding: '10px', touchAction: 'manipulation' }}>0</button>
                    <button onClick={handleLogin} className="glass-button" style={{ background: 'rgba(107,255,107,0.3)', padding: '10px', touchAction: 'manipulation' }}>➜</button>
                </div>
            </div>
        </div>
    );
};
