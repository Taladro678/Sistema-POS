import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/glassmorphism.css'; // Ensure we use the glass styles

import { Settings } from 'lucide-react';

export const LoginPage = () => {
    const [pin, setPin] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    // Server Config
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [serverIp, setServerIp] = useState(() => localStorage.getItem('pos_server_url') || '');

    const saveServerConfig = () => {
        if (serverIp) {
            // Add http if missing
            let url = serverIp;
            if (!url.startsWith('http')) {
                url = `http://${url}`;
            }
            // Add port if missing (assuming 3001)
            if (!url.split(':')[2]) {
                url = `${url}:3001`;
            }
            localStorage.setItem('pos_server_url', url);
            alert('Configuración guardada. Recarga la página.');
            window.location.reload();
        } else {
            localStorage.removeItem('pos_server_url');
            alert('Configuración reseteada a automático.');
            window.location.reload();
        }
    };

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

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
                    <button
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
                    >
                        <Settings size={16} />
                    </button>
                </div>

                {isConfigOpen ? (
                    <div className="glass-panel" style={{ padding: '0.5rem', marginBottom: '0.5rem', background: 'rgba(0,0,0,0.5)' }}>
                        <p style={{ fontSize: '0.8rem', margin: '0 0 0.5rem 0' }}>IP Servidor Central</p>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Ej. 192.168.1.15"
                            value={serverIp}
                            onChange={(e) => setServerIp(e.target.value)}
                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.25rem' }}
                        />
                        <button
                            className="glass-button accent"
                            onClick={saveServerConfig}
                            style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.8rem' }}
                        >
                            Guardar Conexión
                        </button>
                        <p style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '0.5rem' }}>
                            Dejar vacío para automático.
                        </p>
                    </div>
                ) : null}

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
