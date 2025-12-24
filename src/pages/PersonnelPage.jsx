import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { UserPlus, FileText, DollarSign, Trash2, Gift } from 'lucide-react';

export const PersonnelPage = () => {
    const { data, addItem, deleteItem, distributeTips } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);
    const [paymentFrequency, setPaymentFrequency] = useState('Quincenal');
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        status: 'Activo',
        lastPayment: 'N/A',
        salary: 0,
        pin: '',
        permissions: []
    });

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar a este empleado? Esta acción no se puede deshacer.')) {
            deleteItem('personnel', id);
        }
    };

    const handleSave = () => {
        if (!formData.name) return alert('El nombre es obligatorio');
        addItem('personnel', { ...formData, salary: parseFloat(formData.salary) || 0 });
        setIsModalOpen(false);
        setFormData({
            name: '',
            role: '',
            status: 'Activo',
            lastPayment: 'N/A',
            salary: 0,
            pin: '',
            permissions: []
        });
    };

    const columns = [
        { header: 'Nombre', accessor: 'name' },
        { header: 'Cargo', accessor: 'role' },
        {
            header: 'Estado',
            accessor: 'status',
            render: (row) => (
                <span style={{
                    color: row.status === 'Activo' ? 'var(--accent-green)' : 'var(--accent-orange)',
                    fontWeight: 'bold'
                }}>
                    {row.status}
                </span>
            )
        },
        { header: 'Último Pago', accessor: 'lastPayment' },
        {
            header: 'Salario ($)',
            accessor: 'salary',
            render: (row) => `$${row.salary.toFixed(2)}`
        }
    ];

    const actions = (row) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="glass-button" style={{ padding: '0.5rem' }} title="Ver Expediente">
                <FileText size={16} />
            </button>
            <button
                className="glass-button accent"
                style={{ padding: '0.5rem' }}
                title="Pagar Nómina"
                onClick={() => handleOpenPayment(row)}
            >
                <DollarSign size={16} />
            </button>
            <button
                className="glass-button"
                style={{ padding: '0.5rem', color: 'var(--accent-red)' }}
                title="Eliminar / Despido"
                onClick={() => handleDelete(row.id)}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    // Payment Logic
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [paymentFile, setPaymentFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleOpenPayment = (employee) => {
        setSelectedEmployee(employee);
        setPaymentFile(null);
        setIsPaymentModalOpen(true);
    };

    const handleProcessPayment = async () => {
        if (!selectedEmployee) return;

        let receiptLink = 'N/A';

        if (paymentFile) {
            setIsUploading(true);
            const result = await data.uploadToDrive(paymentFile, 'Comprobantes Nómina'); // Assuming uploadToDrive is available in data or context
            setIsUploading(false);

            if (result && result.webViewLink) {
                receiptLink = result.webViewLink;
            } else {
                // If upload failed but we proceed, or if we want to block. 
                // For now let's alert and return if upload was expected but failed.
                if (!window.confirm('No se pudo subir el comprobante. ¿Deseas registrar el pago sin comprobante?')) {
                    return;
                }
            }
        }

        // Update employee last payment date
        const today = new Date().toLocaleDateString();
        // Here we would ideally record a transaction in a 'expenses' or 'payments' collection
        // For now, we update the employee record
        updateItem('personnel', selectedEmployee.id, { lastPayment: today });

        alert(`Pago registrado para ${selectedEmployee.name}. Comprobante: ${receiptLink !== 'N/A' ? 'Subido a Drive' : 'No adjuntado'}`);
        setIsPaymentModalOpen(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '2rem' }}>Personal</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="glass-button accent"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => setIsTipsModalOpen(true)}
                    >
                        <Gift size={20} />
                        Gestión de Propinas
                    </button>
                    <button
                        className="glass-button primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => setIsModalOpen(true)}
                    >
                        <UserPlus size={20} />
                        Nuevo Empleado
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <div className="glass-panel" style={{ padding: '0.75rem' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Total Empleados</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{data.personnel.length}</p>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Nómina Estimada</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        ${data.personnel.reduce((acc, curr) => acc + curr.salary, 0).toFixed(2)}
                    </p>
                </div>
            </div>

            <DataTable columns={columns} data={data.personnel} actions={actions} />

            {/* Employee Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Registrar Nuevo Empleado"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nombre Completo</label>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Nombre y Apellido"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    {/* Flexible Role Input */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Cargo</label>
                        <input
                            type="text"
                            list="roles-list"
                            className="glass-input"
                            placeholder="Escribe o selecciona un cargo..."
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        />
                        <datalist id="roles-list">
                            <option value="admin">Administrador (Acceso Total)</option>
                            <option value="manager">Gerente (Inventario/Proveedores)</option>
                            <option value="cashier">Cajero (Solo Ventas)</option>
                            <option value="waiter">Mesero (Solo Pedidos)</option>
                            <option value="kitchen">Cocina (Solo Comandas)</option>
                        </datalist>
                    </div>

                    {/* PIN Input */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>PIN de Acceso (4-6 dígitos)</label>
                        <input
                            type="password"
                            maxLength="6"
                            className="glass-input"
                            placeholder="****"
                            value={formData.pin || ''}
                            onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                        />
                    </div>

                    {/* Granular Permissions */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Permisos Adicionales</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
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

                    {/* Frequency Selector */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Frecuencia de Pago</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                className={`glass-button ${paymentFrequency === 'Semanal' ? 'primary' : ''}`}
                                style={{ flex: 1 }}
                                onClick={() => setPaymentFrequency('Semanal')}
                            >
                                Semanal
                            </button>
                            <button
                                className={`glass-button ${paymentFrequency === 'Quincenal' ? 'primary' : ''}`}
                                style={{ flex: 1 }}
                                onClick={() => setPaymentFrequency('Quincenal')}
                            >
                                Quincenal
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            Salario {paymentFrequency} ($)
                        </label>
                        <input
                            type="number"
                            className="glass-input"
                            placeholder="0.00"
                            value={formData.salary}
                            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Fecha de Ingreso</label>
                        <input type="date" className="glass-input" />
                    </div>
                    <button
                        className="glass-button primary"
                        style={{ marginTop: '1rem', width: '100%' }}
                        onClick={handleSave}
                    >
                        Guardar Empleado
                    </button>
                </div>
            </Modal>

            {/* Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title={`Pagar Nómina: ${selectedEmployee?.name}`}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Monto a Pagar</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${selectedEmployee?.salary.toFixed(2)}</p>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Comprobante de Pago (Opcional)</label>
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="glass-input"
                            onChange={(e) => setPaymentFile(e.target.files[0])}
                        />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Se subirá automáticamente a la carpeta "Comprobantes Nómina" en Drive.
                        </p>
                    </div>

                    <button
                        className="glass-button accent"
                        style={{ marginTop: '1rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                        onClick={handleProcessPayment}
                        disabled={isUploading}
                    >
                        {isUploading ? 'Subiendo...' : 'Registrar Pago'}
                        {!isUploading && <DollarSign size={18} />}
                    </button>
                </div>
            </Modal>
            {/* Tip Distribution Modal */}
            <Modal
                isOpen={isTipsModalOpen}
                onClose={() => setIsTipsModalOpen(false)}
                title="Gestión y Reparto de Propinas"
            >
                <TipManagementModalContent data={data} distributeTips={distributeTips} onClose={() => setIsTipsModalOpen(false)} />
            </Modal>
        </div>
    );
};

// Extracted Component for Tip Management to handle internal tab state
const TipManagementModalContent = ({ data, distributeTips, onClose }) => {
    const [activeTab, setActiveTab] = useState('current'); // 'current' or 'history'
    const [expandedHistoryId, setExpandedHistoryId] = useState(null);

    // Calculate Daily Breakdown for Current Pool
    const currentDailyBreakdown = (data.tipHistory || []).reduce((acc, tip) => {
        const date = new Date(tip.timestamp).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' });
        acc[date] = (acc[date] || 0) + tip.amount;
        return acc;
    }, {});

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                <button
                    className={`glass-button ${activeTab === 'current' ? 'primary' : ''}`}
                    onClick={() => setActiveTab('current')}
                    style={{ flex: 1 }}
                >
                    Pozo Actual
                </button>
                <button
                    className={`glass-button ${activeTab === 'history' ? 'primary' : ''}`}
                    onClick={() => setActiveTab('history')}
                    style={{ flex: 1 }}
                >
                    Historial
                </button>
            </div>

            {activeTab === 'current' ? (
                <>
                    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)' }}>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Pozo Acumulado</p>
                        <h2 style={{ fontSize: '3rem', color: 'var(--accent-green)', margin: 0 }}>
                            ${(data.tips || 0).toFixed(2)}
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            {data.tipHistory?.length || 0} transacciones registradas
                        </p>
                    </div>

                    {/* Daily Breakdown Table */}
                    {Object.keys(currentDailyBreakdown).length > 0 && (
                        <div className="glass-panel" style={{ padding: '1rem' }}>
                            <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Desglose por Día</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {Object.entries(currentDailyBreakdown).map(([day, amount]) => (
                                    <div key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem' }}>
                                        <span style={{ textTransform: 'capitalize' }}>{day}</span>
                                        <span style={{ fontWeight: 'bold' }}>${amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Proyección de Reparto (Según Sueldo)</h3>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(() => {
                                const totalSalary = data.personnel.reduce((acc, curr) => acc + (curr.status === 'Activo' ? curr.salary : 0), 0);
                                const totalTips = data.tips || 0;

                                if (totalSalary === 0) return <p>No hay empleados activos con sueldo.</p>;

                                return data.personnel
                                    .filter(emp => emp.status === 'Activo')
                                    .map(emp => {
                                        const sharePercentage = emp.salary / totalSalary;
                                        const shareAmount = totalTips * sharePercentage;
                                        return (
                                            <div key={emp.id} className="glass-panel" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <p style={{ fontWeight: 'bold' }}>{emp.name}</p>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        Sueldo: ${emp.salary} ({(sharePercentage * 100).toFixed(1)}%)
                                                    </p>
                                                </div>
                                                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                                                    ${shareAmount.toFixed(2)}
                                                </p>
                                            </div>
                                        );
                                    });
                            })()}
                        </div>
                    </div>

                    <button
                        className="glass-button accent"
                        style={{ padding: '1rem', marginTop: '1rem' }}
                        onClick={() => {
                            if (window.confirm('¿Estás seguro de distribuir las propinas? Se guardará una copia en el Historial.')) {
                                distributeTips();
                                onClose();
                                alert('Propinas distribuidas y archivadas en el Historial.');
                            }
                        }}
                        disabled={(data.tips || 0) === 0}
                    >
                        Distribuir y Archivar
                    </button>
                </>
            ) : (
                /* History Tab */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
                    {(data.tipDistributions || []).length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No hay distribuciones pasadas.</p>
                    ) : (
                        (data.tipDistributions || []).map(dist => (
                            <div key={dist.id} className="glass-panel" style={{ padding: '1rem' }}>
                                <div
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                    onClick={() => setExpandedHistoryId(expandedHistoryId === dist.id ? null : dist.id)}
                                >
                                    <div>
                                        <h4 style={{ margin: 0 }}>{new Date(dist.date).toLocaleDateString()} - {new Date(dist.date).toLocaleTimeString()}</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {dist.transactionCount} transacciones
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                                            ${dist.total.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {expandedHistoryId === dist.id && (
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                        {/* Daily Breakdown for History Item */}
                                        {dist.dailyBreakdown && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <h5 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ingresos por Día</h5>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    {Object.entries(dist.dailyBreakdown).map(([day, amount]) => (
                                                        <div key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                            <span style={{ textTransform: 'capitalize' }}>{day}</span>
                                                            <span>${amount.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <h5 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Reparto</h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {dist.distribution.map(emp => (
                                                <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                    <span>{emp.name}</span>
                                                    <span style={{ fontWeight: 'bold', color: 'var(--accent-green)' }}>${emp.amount.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
