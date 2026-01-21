import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useDialog } from '../context/DialogContext';
import { UserCircle, Plus, Edit, Trash2, Phone, Mail, MapPin, CreditCard, BarChart2, Search, Loader2 } from 'lucide-react';
import Modal from '../components/Modal';
import ExcelImporter from '../components/ExcelImporter';

export const CustomersPage = () => {
    const { data, addItem, updateItem, deleteItem } = useData();
    const customers = data.customers || [];
    const { confirm, alert } = useDialog();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formData, setFormData] = useState({
        idNumber: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        creditLimit: 0
    });
    const [isSearching, setIsSearching] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingCustomer) {
            updateItem('customers', editingCustomer.id, formData);
        } else {
            addItem('customers', formData);
        }

        setIsModalOpen(false);
        setEditingCustomer(null);
        setFormData({ idNumber: '', name: '', phone: '', email: '', address: '', creditLimit: 0 });
    };

    const handleLookup = async () => {
        if (!formData.idNumber) return;

        setIsSearching(true);
        try {
            // Check if already in local state first to save time/API
            const localMatch = customers.find(c => c.idNumber === formData.idNumber);
            if (localMatch) {
                setFormData({
                    ...formData,
                    name: localMatch.name,
                    phone: localMatch.phone || formData.phone,
                    address: localMatch.address || formData.address,
                    email: localMatch.email || formData.email
                });
                setIsSearching(false);
                return;
            }

            // Consult server proxy
            const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3001/api/lookup/cedula/${formData.idNumber}`);
            const result = await response.json();

            if (result.success) {
                setFormData({
                    ...formData,
                    name: result.name
                });
            } else {
                await alert({
                    title: 'No Encontrado',
                    message: result.error || 'No se pudo obtener información para este ID.'
                });
            }
        } catch (e) {
            console.error('Error lookup:', e);
            await alert({
                title: 'Error de Consulta',
                message: 'No hay conexión con el servicio de búsqueda.'
            });
        } finally {
            setIsSearching(false);
        }
    };

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            idNumber: customer.idNumber || '',
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            creditLimit: customer.creditLimit || 0
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const ok = await confirm({
            title: 'Eliminar Cliente',
            message: '¿Estás seguro de eliminar este cliente?'
        });
        if (ok) {
            deleteItem('customers', id);
        }
    };

    const handleNew = () => {
        setEditingCustomer(null);
        setFormData({ idNumber: '', name: '', phone: '', email: '', address: '', creditLimit: 0 });
        setIsModalOpen(true);
    };

    const handleImport = async (data) => {
        if (!data || data.length === 0) {
            await alert({ title: 'Importación', message: "El archivo no contiene datos." });
            return;
        }

        let importedCount = 0;
        let errorCount = 0;

        // Mapeo flexible de columnas (ignora mayúsculas/minúsculas)
        const normalize = (str) => str ? str.toString().toLowerCase().trim() : '';

        for (const row of data) {
            // Buscamos las columnas independientemente del case
            const keys = Object.keys(row);
            const getKey = (target) => keys.find(k => normalize(k) === normalize(target));

            const name = row[getKey('nombre')] || row[getKey('name')] || row[getKey('cliente')];

            if (!name) {
                console.warn("Fila ignorada por falta de nombre:", row);
                errorCount++;
                continue;
            }

            const newCustomer = {
                idNumber: (row[getKey('cedula')] || row[getKey('rif')] || row[getKey('id')])?.toString() || '',
                name: name,
                phone: (row[getKey('telefono')] || row[getKey('phone')] || row[getKey('celular')])?.toString() || '',
                email: (row[getKey('email')] || row[getKey('correo')])?.toString() || '',
                address: (row[getKey('direccion')] || row[getKey('address')])?.toString() || '',
                creditLimit: parseFloat(row[getKey('credito')] || row[getKey('credit')] || row[getKey('limite')]) || 0
            };

            await addItem('customers', newCustomer);
            importedCount++;
        }

        await alert({
            title: 'Importación Completada',
            message: `✅ Importados: ${importedCount}\n⚠️ Omitidos (sin nombre): ${errorCount}`
        });
    };

    return (
        <div className="p-4 md:p-6 h-full overflow-y-auto">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                    <UserCircle size={isMobile ? 24 : 32} />
                    Clientes
                </h1>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={handleNew} className="glass-button primary flex items-center gap-2 text-xs md:text-sm">
                        <Plus size={16} />
                        Nuevo
                    </button>
                    <ExcelImporter onDataLoaded={handleImport} buttonText="Importar Excel" />
                </div>
            </div>

            {customers.length === 0 ? (
                <div className="glass-panel p-12 text-center">
                    <UserCircle size={64} color="var(--text-secondary)" className="mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No hay clientes registrados</h3>
                    <p className="text-gray-400 mb-4">Crea tu primer cliente para empezar</p>
                    <button onClick={handleNew} className="glass-button primary">
                        Crear Cliente
                    </button>
                </div>
            ) : (
                <div className="glass-panel overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="text-left p-4 text-gray-300 font-semibold">Cédula/RIF</th>
                                <th className="text-left p-4 text-gray-300 font-semibold">Cliente</th>
                                <th className="text-left p-4 text-gray-300 font-semibold">Teléfono</th>
                                <th className="text-left p-4 text-gray-300 font-semibold">Correo Electrónico</th>
                                <th className="text-left p-4 text-gray-300 font-semibold">Dirección</th>
                                <th className="text-right p-4 text-gray-300 font-semibold">Crédito</th>
                                <th className="text-center p-4 text-gray-300 font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(customer => (
                                <tr key={customer.id} className="border-b border-gray-800 hover:bg-white/5">
                                    <td className="p-4">
                                        <span className="text-gray-400 font-mono text-sm">{customer.idNumber || '---'}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <UserCircle size={20} color="var(--accent-blue)" />
                                            <span className="font-semibold">{customer.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {customer.phone && (
                                            <div className="flex items-center gap-2 text-gray-300">
                                                <Phone size={14} />
                                                {customer.phone}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {customer.email && (
                                            <div className="flex items-center gap-2 text-gray-300">
                                                <Mail size={14} />
                                                {customer.email}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {customer.address && (
                                            <div className="flex items-center gap-2 text-gray-300">
                                                <MapPin size={14} />
                                                {customer.address}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {customer.creditLimit > 0 && (
                                            <div className="flex items-center justify-end gap-2 text-green-400">
                                                <CreditCard size={14} />
                                                ${customer.creditLimit.toFixed(2)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => navigate(`/reports?customerId=${customer.id}`)}
                                                className="glass-button p-2"
                                                title="Ver Historial"
                                                style={{ color: 'var(--accent-green)' }}
                                            >
                                                <BarChart2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(customer)}
                                                className="glass-button p-2"
                                                title="Editar"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(customer.id)}
                                                className="glass-button p-2"
                                                style={{ color: 'var(--accent-red)' }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h2 className="text-2xl font-bold mb-6">
                    {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Cédula / RIF</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="glass-input flex-1"
                                    value={formData.idNumber}
                                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                                    placeholder="V-12345678"
                                />
                                <button
                                    type="button"
                                    onClick={handleLookup}
                                    disabled={!formData.idNumber || isSearching}
                                    className="glass-button primary p-2"
                                    title="Buscar datos"
                                >
                                    {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Nombre *</label>
                            <input
                                type="text"
                                required
                                className="glass-input w-full"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Juan Pérez"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Teléfono</label>
                            <input
                                type="tel"
                                className="glass-input w-full"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+58 412-1234567"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Correo Electrónico</label>
                            <input
                                type="email"
                                className="glass-input w-full"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="cliente@ejemplo.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Dirección</label>
                            <textarea
                                className="glass-input w-full"
                                rows={2}
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Calle Principal..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Límite de Crédito ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="glass-input w-full"
                                value={formData.creditLimit}
                                onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="glass-button flex-1"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="glass-button primary flex-1"
                        >
                            {editingCustomer ? 'Guardar Cambios' : 'Crear Cliente'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
