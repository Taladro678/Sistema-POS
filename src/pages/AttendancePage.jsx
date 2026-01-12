import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useDialog } from '../context/DialogContext';
import FaceDetector from '../components/FaceDetector';
import { Clock, Camera, CheckCircle, XCircle, Calendar, Download } from 'lucide-react';
import Modal from '../components/Modal';

export const AttendancePage = () => {
    const { data, addItem } = useData();
    const { alert } = useDialog();
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [todayRecords, setTodayRecords] = useState([]);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    // Obtener registros del día actual
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const records = (data.attendance || []).filter(record => {
            const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
            return recordDate === today;
        });
        setTodayRecords(records);
    }, [data.attendance]);

    // Obtener personal activo
    const activePersonnel = (data.personnel || []).filter(p => p.status === 'Activo');

    // Manejar selección de empleado
    const handleSelectEmployee = (employee) => {
        setSelectedEmployee(employee);
        setIsCameraActive(true);
    };

    // Manejar detección de rostro
    const handleFaceDetected = (detected) => {
        setFaceDetected(detected);
    };

    // Registrar entrada
    const handleMarkEntry = async () => {
        if (!selectedEmployee || !faceDetected || isProcessing) return;

        setIsProcessing(true);

        try {
            // Capturar foto
            const photoBlob = await window.captureAttendancePhoto();

            if (!photoBlob) {
                await alert({ title: 'Error de Cámara', message: 'No se pudo capturar la foto. Intenta de nuevo.' });
                setIsProcessing(false);
                return;
            }

            // TODO: Subir foto a Google Drive
            // Por ahora, crear URL local
            const photoUrl = URL.createObjectURL(photoBlob);

            // Crear registro de asistencia
            const attendanceRecord = {
                id: window.crypto.randomUUID(),
                employeeId: selectedEmployee.id,
                employeeName: selectedEmployee.name,
                type: 'entry',
                timestamp: new Date().toISOString(),
                photoUrl: photoUrl,
                faceDetected: true,
                notes: ''
            };

            // Guardar en DataContext
            addItem('attendance', attendanceRecord);

            await alert({ title: 'Asistencia Registrada', message: `✅ Entrada registrada para ${selectedEmployee.name}` });

            // Reset
            setIsCameraActive(false);
            setSelectedEmployee(null);
            setFaceDetected(false);

        } catch (error) {
            console.error('Error al registrar entrada:', error);
            await alert({ title: 'Error', message: 'Error al registrar la entrada. Intenta de nuevo.' });
        } finally {
            setIsProcessing(false);
        }
    };

    // Registrar salida
    const handleMarkExit = async () => {
        if (!selectedEmployee || !faceDetected || isProcessing) return;

        setIsProcessing(true);

        try {
            // Capturar foto
            const photoBlob = await window.captureAttendancePhoto();

            if (!photoBlob) {
                await alert({ title: 'Error de Cámara', message: 'No se pudo capturar la foto. Intenta de nuevo.' });
                setIsProcessing(false);
                return;
            }

            // TODO: Subir foto a Google Drive
            const photoUrl = URL.createObjectURL(photoBlob);

            // Crear registro de salida
            const attendanceRecord = {
                id: window.crypto.randomUUID(),
                employeeId: selectedEmployee.id,
                employeeName: selectedEmployee.name,
                type: 'exit',
                timestamp: new Date().toISOString(),
                photoUrl: photoUrl,
                faceDetected: true,
                notes: ''
            };

            // Guardar en DataContext
            addItem('attendance', attendanceRecord);

            await alert({ title: 'Asistencia Registrada', message: `✅ Salida registrada para ${selectedEmployee.name}` });

            // Reset
            setIsCameraActive(false);
            setSelectedEmployee(null);
            setFaceDetected(false);

        } catch (error) {
            console.error('Error al registrar salida:', error);
            await alert({ title: 'Error', message: 'Error al registrar la salida. Intenta de nuevo.' });
        } finally {
            setIsProcessing(false);
        }
    };

    // Calcular horas trabajadas para un empleado hoy
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={32} color="var(--accent-blue)" />
                    Control de Asistencia
                </h1>
                <button className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Download size={20} />
                    Exportar Reporte
                </button>
            </div>

            {/* Estadística rápida */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        <Calendar size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Hoy
                    </p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{new Date().toLocaleDateString('es-ES')}</p>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Registros de Hoy</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>{todayRecords.length}</p>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Personal Activo</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{activePersonnel.length}</p>
                </div>
            </div>

            {/* Sección principal */}
            <div style={{ display: 'grid', gridTemplateColumns: isCameraActive ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
                {/* Selección de empleado */}
                {!isCameraActive && (
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h2 style={{ marginBottom: '1rem', fontSize: '1.3rem' }}>Seleccionar Empleado</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                            {activePersonnel.map(employee => (
                                <button
                                    key={employee.id}
                                    className="glass-button"
                                    onClick={() => handleSelectEmployee(employee)}
                                    style={{
                                        padding: '1rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        textAlign: 'center'
                                    }}
                                >
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        background: 'var(--accent-blue)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {employee.name.charAt(0)}
                                    </div>
                                    <span style={{ fontSize: '0.9rem' }}>{employee.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Cámara y controles */}
                {isCameraActive && (
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.3rem' }}>
                                <Camera size={24} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                {selectedEmployee?.name}
                            </h2>
                            <button
                                className="glass-button"
                                onClick={() => {
                                    setIsCameraActive(false);
                                    setSelectedEmployee(null);
                                    setFaceDetected(false);
                                }}
                                style={{ color: 'var(--accent-red)' }}
                            >
                                Cancelar
                            </button>
                        </div>

                        {/* Componente de detección facial */}
                        <FaceDetector
                            onFaceDetected={handleFaceDetected}
                            isActive={isCameraActive}
                        />

                        {/* Botones de entrada/salida */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                            <button
                                className="glass-button primary"
                                onClick={handleMarkEntry}
                                disabled={!faceDetected || isProcessing}
                                style={{
                                    padding: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    opacity: !faceDetected || isProcessing ? 0.5 : 1,
                                    cursor: !faceDetected || isProcessing ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <CheckCircle size={20} />
                                {isProcessing ? 'Procesando...' : 'Marcar Entrada'}
                            </button>
                            <button
                                className="glass-button accent"
                                onClick={handleMarkExit}
                                disabled={!faceDetected || isProcessing}
                                style={{
                                    padding: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    opacity: !faceDetected || isProcessing ? 0.5 : 1,
                                    cursor: !faceDetected || isProcessing ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <XCircle size={20} />
                                {isProcessing ? 'Procesando...' : 'Marcar Salida'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabla de registros de hoy */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.3rem' }}>Registros de Hoy</h2>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {todayRecords.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                                No hay registros todavía
                            </p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Empleado</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Tipo</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Hora</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Foto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todayRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(record => (
                                        <tr key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '0.75rem' }}>{record.employeeName}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.85rem',
                                                    background: record.type === 'entry' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                                                    color: record.type === 'entry' ? 'var(--accent-green)' : 'var(--accent-red)',
                                                    border: `1px solid ${record.type === 'entry' ? 'var(--accent-green)' : 'var(--accent-red)'}`
                                                }}>
                                                    {record.type === 'entry' ? '🟢 Entrada' : '🔴 Salida'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                                                {new Date(record.timestamp).toLocaleTimeString('es-ES')}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <button
                                                    className="glass-button"
                                                    onClick={() => {
                                                        setSelectedPhoto(record.photoUrl);
                                                        setShowPhotoModal(true);
                                                    }}
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                >
                                                    Ver
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal para ver foto */}
            <Modal isOpen={showPhotoModal} onClose={() => setShowPhotoModal(false)}>
                <h2 style={{ marginBottom: '1rem' }}>Foto de Registro</h2>
                {selectedPhoto && (
                    <img
                        src={selectedPhoto}
                        alt="Foto de asistencia"
                        style={{
                            width: '100%',
                            maxWidth: '500px',
                            borderRadius: '8px',
                            display: 'block',
                            margin: '0 auto'
                        }}
                    />
                )}
            </Modal>
        </div>
    );
};
