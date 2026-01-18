import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useDialog } from '../context/DialogContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { UserPlus, Shield, Trash2, Key, Edit } from 'lucide-react';

export const UsersPage = () => {
    const { data, addItem, deleteItem, updateItem } = useData();
    const { confirm, alert } = useDialog();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [formData, setFormData] = useState({
        name: '',
        role: 'cashier',
        pin: '',
        permissions: []
    });

    const handleDelete = async (id) => {
        const ok = await confirm({
            title: 'Eliminar Usuario',
            message: '¿Estás seguro de eliminar este usuario? Perderá el acceso al sistema.'
        });
        if (ok) {
            deleteItem('users', id);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: '',
            role: 'cashier',
            pin: '',
            permissions: []
        });
    };

    const handleEdit = (user) => {
        setFormData({
            name: user.name,
            role: user.role,
            pin: user.pin,
            permissions: user.permissions || []
        });
        setEditingId(user.id);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name) return await alert({ title: 'Error', message: 'El nombre es obligatorio' });
        if (!formData.pin) return await alert({ title: 'Error', message: 'El PIN es obligatorio' });

        // Restrictions removed as requested

        if (editingId) {
            updateItem('users', editingId, formData);
        } else {
            addItem('users', formData);
        }

        setIsModalOpen(false);
        resetForm();
    };

    const columns = [
        { header: 'Usuario', accessor: 'name' },
        {
            header: 'Rol',
            accessor: 'role',
            render: (row) => (
                <span className="px-2 py-1 rounded text-xs font-bold uppercase"
                    style={{
                        color: row.role === 'admin' ? 'var(--accent-red)' :
                            row.role === 'kitchen' ? 'var(--accent-orange)' : 'var(--accent-blue)',
                        border: `1px solid ${row.role === 'admin' ? 'var(--accent-red)' :
                            row.role === 'kitchen' ? 'var(--accent-orange)' : 'var(--accent-blue)'}`,
                        background: 'transparent'
                    }}>
                    {
                        row.role === 'kitchen' ? 'Cocina' :
                            row.role === 'bar' ? 'Barra' :
                                row.role === 'waiter' ? 'Mesero' :
                                    row.role === 'admin' ? 'Admin' :
                                        row.role === 'manager' ? 'Gerente' :
                                            'Cajero'
                    }
                </span>
            )
        },
        {
            header: 'PIN',
            accessor: 'pin',
            render: () => '****' // Ocultar PIN por seguridad
        }
    ];

    const actions = (row) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
                className="glass-button"
                style={{ padding: '0.5rem' }}
                title="Editar Usuario"
                onClick={() => handleEdit(row)}
            >
                <Edit size={16} />
            </button>
            <button
                className="glass-button"
                style={{ padding: '0.5rem', color: 'var(--accent-red)' }}
                title="Eliminar Acceso"
                onClick={() => handleDelete(row.id)}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', width: '100%' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <h1 style={{ fontSize: isMobile ? '1.25rem' : '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Shield size={isMobile ? 22 : 28} />
                    {isMobile ? 'Usuarios' : 'Gestión de Usuarios'}
                </h1>
                <button
                    className="glass-button primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        whiteSpace: 'nowrap',
                        padding: isMobile ? '0.4rem 0.8rem' : '0.6rem 1.2rem',
                        fontSize: isMobile ? '0.85rem' : '1rem'
                    }}
                    onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                    }}
                >
                    <UserPlus size={isMobile ? 16 : 20} />
                    Nuevo
                </button>
            </div>

            <div className="glass-panel" style={{ padding: isMobile ? '0.6rem' : '1rem', background: 'rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} className="text-gray-300">
                    Aquí se administran los credenciales de acceso al sistema.
                </p>
            </div>

            <DataTable columns={columns} data={data.users || []} actions={actions} />

            {/* User Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                    setFormData({
                        name: '',
                        role: 'cashier',
                        pin: '',
                        permissions: []
                    });
                }}
                title={editingId ? "Editar Usuario" : "Registrar Nuevo Usuario"}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nombre de Usuario</label>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Ej: Juan Cajero"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Rol de Sistema</label>
                        <select
                            className="glass-input w-full"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="admin">Administrador (Acceso Total)</option>
                            <option value="manager">Gerente (Inventario + Ventas)</option>
                            <option value="cashier">Cajero (Ventas)</option>
                            <option value="waiter">Mesero (Tomar Pedidos)</option>
                            <option value="kitchen">Cocina (Pantalla de Cocina)</option>
                            <option value="bar">Barra (Pantalla de Barra)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>PIN de Acceso</label>
                        <div className="flex gap-2">
                            <Key size={20} className="text-gray-400" />
                            <input
                                type="password"
                                className="glass-input flex-1"
                                placeholder="****"
                                value={formData.pin}
                                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                            />
                        </div>
                    </div>

                    {/* Permissions Section */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Permisos Adicionales</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                            {['Ver Reportes', 'Modificar Inventario', 'Gestionar Personal', 'Anular Ventas', 'Configuración'].map(perm => (
                                <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions?.includes(perm) || false}
                                        onChange={(e) => {
                                            const currentPerms = formData.permissions || [];
                                            if (e.target.checked) {
                                                setFormData({ ...formData, permissions: [...currentPerms, perm] });
                                            } else {
                                                setFormData({ ...formData, permissions: currentPerms.filter(p => p !== perm) });
                                            }
                                        }}
                                        style={{ accentColor: 'var(--accent-blue)' }}
                                    />
                                    {perm}
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        className="glass-button primary"
                        style={{ marginTop: '1rem', width: '100%' }}
                        onClick={handleSave}
                    >
                        {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};
