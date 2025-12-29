import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/glassmorphism.css'; // Ensure we use the glass styles

import { Settings } from 'lucide-react';

export const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        const result = login(username, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.message);
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
            color: 'white'
        }}>
            <div className="glass-panel" style={{
                padding: '2rem',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
                    <button
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
                    >
                        <Settings size={16} />
                    </button>
                </div>

                {isConfigOpen && (
                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.5)', marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>IP Servidor Central</p>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Ej. 192.168.1.15"
                            value={serverIp}
                            onChange={(e) => setServerIp(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                        />
                        <button className="glass-button accent" onClick={saveServerConfig} style={{ width: '100%' }}>
                            Guardar Conexión
                        </button>
                    </div>
                )}

                <div>
                    <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>La Auténtica</h2>
                    <p style={{ margin: '0.5rem 0 0', color: '#aaa' }}>Sistema POS</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        className="glass-input"
                        placeholder="Usuario"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ padding: '1rem', fontSize: '1rem' }}
                        autoFocus
                    />
                    <input
                        type="password"
                        className="glass-input"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '1rem', fontSize: '1rem' }}
                    />

                    {error && <p style={{ color: '#ff6b6b', fontSize: '0.9rem', margin: 0 }}>{error}</p>}

                    <button
                        type="submit"
                        className="glass-button primary"
                        style={{ padding: '1rem', fontSize: '1.1rem', marginTop: '0.5rem' }}
                    >
                        Iniciar Sesión
                    </button>
                </form>
            </div>
        </div>
    );
};

