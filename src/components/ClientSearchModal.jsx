import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { Search, UserPlus, User, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';

const ClientSearchModal = ({ isOpen, onClose, onSelectClient }) => {
    const { data, addItem } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [view, setView] = useState('search'); // 'search' or 'create'

    // Create Form State
    const [newClient, setNewClient] = useState({
        name: '',
        identificacion: '', // Cedula or RIF
        phone: '',
        address: ''
    });

    // Create Form State


    const filteredClients = useMemo(() => {
        if (!searchQuery) return data.customers || [];
        const lowerQuery = searchQuery.toLowerCase();
        return (data.customers || []).filter(c =>
            c.name.toLowerCase().includes(lowerQuery) ||
            (c.identificacion && c.identificacion.toLowerCase().includes(lowerQuery)) ||
            (c.phone && c.phone.includes(lowerQuery))
        );
    }, [data.customers, searchQuery]);

    const handleCreateClient = (e) => {
        e.preventDefault();
        if (!newClient.name.trim()) return;

        const newId = Date.now();
        const clientData = {
            id: newId,
            ...newClient,
            balance: 0,
            createdAt: new Date().toISOString()
        };

        addItem('customers', clientData);
        onSelectClient(clientData);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={view === 'create' ? "Nuevo Cliente" : "Buscar Cliente"}
        >
            {view === 'search' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', minHeight: '400px' }}>
                    {/* Search Input Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className="glass-panel" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <input
                                type="text"
                                autoFocus
                                placeholder="Buscar por Nombre, Cédula o RIF..."
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    flex: 1,
                                    fontSize: '1.1rem',
                                    color: 'white',
                                    outline: 'none',
                                    width: '100%'
                                }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search size={22} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '0.5rem' }}>
                            Presiona Enter para seleccionar si hay un solo resultado
                        </span>
                    </div>

                    {/* Results List */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        minHeight: '200px', // Ensure space for empty state
                        paddingRight: '0.5rem' // Space for scrollbar
                    }}>
                        {filteredClients.length > 0 ? (
                            filteredClients.map(client => (
                                <button
                                    key={client.id}
                                    className="glass-button"
                                    onClick={() => { onSelectClient(client); onClose(); }}
                                    style={{
                                        justifyContent: 'space-between',
                                        padding: '1rem',
                                        textAlign: 'left',
                                        width: '100%',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        background: 'rgba(255,255,255,0.02)'
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{client.name}</span>
                                        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                                {client.identificacion || 'Sin ID'}
                                            </span>
                                            <span>{client.phone || ''}</span>
                                        </div>
                                    </div>
                                    {client.balance !== 0 && (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-end',
                                            justifyContent: 'center'
                                        }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Saldo</span>
                                            <span style={{
                                                color: client.balance > 0 ? 'var(--accent-red)' : 'var(--accent-green)',
                                                fontWeight: 'bold',
                                                fontSize: '1rem'
                                            }}>
                                                {client.balance > 0 ? `-$${client.balance.toFixed(2)}` : `+$${Math.abs(client.balance).toFixed(2)}`}
                                            </span>
                                        </div>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)',
                                gap: '1rem',
                                opacity: 0.6
                            }}>

                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                                        {searchQuery ? 'No se encontraron clientes' : 'Empieza a escribir para buscar'}
                                    </p>
                                    <p style={{ fontSize: '0.9rem' }}>Busca por nombre, cédula o teléfono</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Create Button */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                        <button
                            className="glass-button primary"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                padding: '1rem',
                                fontSize: '1rem',
                                fontWeight: 'bold'
                            }}
                            onClick={() => setView('create')}
                        >
                            <UserPlus size={20} />
                            Crear Nuevo Cliente
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div className="form-group">
                        <label>Nombre Completo *</label>
                        <input
                            type="text"
                            className="glass-input"
                            required
                            autoFocus
                            value={newClient.name}
                            onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Cédula / RIF</label>
                        <input
                            type="text"
                            className="glass-input"
                            value={newClient.identificacion}
                            onChange={e => setNewClient({ ...newClient, identificacion: e.target.value })}
                            placeholder="V-12345678 / J-12345678-0"
                        />
                    </div>

                    <div className="form-group">
                        <label>Teléfono</label>
                        <input
                            type="tel"
                            className="glass-input"
                            value={newClient.phone}
                            onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                            placeholder="0414-1234567"
                        />
                    </div>

                    <div className="form-group">
                        <label>Dirección</label>
                        <textarea
                            className="glass-input"
                            value={newClient.address}
                            onChange={e => setNewClient({ ...newClient, address: e.target.value })}
                            style={{ minHeight: '80px', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            className="glass-button"
                            style={{ flex: 1, justifyContent: 'center' }}
                            onClick={() => setView('search')}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="glass-button primary"
                            style={{ flex: 1, justifyContent: 'center' }}
                        >
                            Guardar Cliente
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default ClientSearchModal;
