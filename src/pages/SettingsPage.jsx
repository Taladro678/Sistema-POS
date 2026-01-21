import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { useDialog } from '../context/DialogContext';
import { Save, Download, Upload, Trash2, Users, Lock, FileSpreadsheet, Settings, Volume2, Wifi, Globe, Info, RefreshCw, CreditCard, Plus, Palette, TrendingDown, Banknote, X } from 'lucide-react';
import { read, utils } from 'xlsx';
import { UsersPage } from './UsersPage';
import { audioService } from '../services/audioService';

import { APP_VERSION } from '../config/version';

export const SettingsPage = () => {
    const { settings, updateSettings } = useSettings();
    const {
        exportData, importData, connectDrive, isDriveConnected, syncStatus,
        clearAllData, data, updateData, isLocalServerConnected, serverInfo,
        isServerLocked, setMasterKey, rescueFromExternalBackup,
        backupToCloud, restoreFromCloud, isMonitorMode, setIsMonitorMode
    } = useData();
    const { confirm, alert } = useDialog();
    const [formData, setFormData] = useState(settings);
    const [activeTab, setActiveTab] = useState('general');
    const [audioEnabled, setAudioEnabled] = useState(audioService.isEnabled);
    const [audioVolume, setAudioVolume] = useState(audioService.volume);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        updateSettings(formData);
        await alert({ title: 'Éxito', message: 'Configuración guardada exitosamente.' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            {/* Tabs Navigation */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                <button
                    className={`glass-button ${activeTab === 'general' ? 'primary' : ''}`}
                    onClick={() => setActiveTab('general')}
                    style={{ flex: '1 1 100px', minWidth: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 0.5rem' }}
                >
                    <Settings size={20} />
                    General
                </button>
                <button
                    className={`glass-button ${activeTab === 'sync' ? 'primary' : ''}`}
                    onClick={() => setActiveTab('sync')}
                    style={{ flex: '1 1 100px', minWidth: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 0.5rem' }}
                >
                    <Wifi size={20} />
                    Sincronización
                </button>
                <button
                    className={`glass-button ${activeTab === 'users' ? 'primary' : ''}`}
                    onClick={() => setActiveTab('users')}
                    style={{ flex: '1 1 100px', minWidth: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 0.5rem' }}
                >
                    <Users size={20} />
                    Usuarios
                </button>
                <button
                    className={`glass-button ${activeTab === 'payments' ? 'primary' : ''}`}
                    onClick={() => setActiveTab('payments')}
                    style={{ flex: '1 1 100px', minWidth: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 0.5rem' }}
                >
                    <CreditCard size={20} />
                    Pagos
                </button>
            </div>

            {activeTab === 'users' ? (
                <UsersPage />
            ) : activeTab === 'sync' ? (
                <SyncSettingsSection
                    data={data}
                    isDriveConnected={isDriveConnected}
                    connectDrive={connectDrive}
                    syncStatus={syncStatus}
                    exportData={exportData}
                    importData={importData}
                    confirm={confirm}
                    alert={alert}
                    isLocalServerConnected={isLocalServerConnected}
                    serverInfo={serverInfo}
                    backupToCloud={backupToCloud}
                    restoreFromCloud={restoreFromCloud}
                    isMonitorMode={isMonitorMode}
                    setIsMonitorMode={setIsMonitorMode}
                />
            ) : activeTab === 'payments' ? (
                <PaymentSettingsSection
                    data={data}
                    updateData={updateData}
                    confirm={confirm}
                    alert={alert}
                />
            ) : (
                <>
                    <h1 style={{ fontSize: '2rem' }}>Configuración</h1>

                    <div className="glass-panel" style={{ padding: '1.5rem', width: '100%', maxWidth: '600px', alignSelf: 'center' }}>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Personalización de la Marca</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nombre de la Empresa</label>
                                <input
                                    type="text"
                                    name="appName"
                                    value={formData.appName}
                                    onChange={handleChange}
                                    className="glass-input"
                                    style={{ fontSize: '1rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Subtítulo / Eslogan</label>
                                <input
                                    type="text"
                                    name="appSubtitle"
                                    value={formData.appSubtitle}
                                    onChange={handleChange}
                                    className="glass-input"
                                    style={{ fontSize: '1rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 150px' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Color Logo 1</label>
                                    <input
                                        type="color"
                                        name="logoColor1"
                                        value={formData.logoColor1}
                                        onChange={handleChange}
                                        style={{ width: '100%', height: '40px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                    />
                                </div>
                                <div style={{ flex: '1 1 150px' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Color Logo 2</label>
                                    <input
                                        type="color"
                                        name="logoColor2"
                                        value={formData.logoColor2}
                                        onChange={handleChange}
                                        style={{ width: '100%', height: '40px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ancho del Menú Lateral</label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button
                                        className={`glass-button ${formData.sidebarWidth === '180px' ? 'primary' : ''}`}
                                        style={{ flex: '1 1 80px', fontSize: '0.9rem', padding: '0.5rem' }}
                                        onClick={() => setFormData(prev => ({ ...prev, sidebarWidth: '180px' }))}
                                    >
                                        Compacto
                                    </button>
                                    <button
                                        className={`glass-button ${formData.sidebarWidth === '200px' ? 'primary' : ''}`}
                                        style={{ flex: '1 1 80px', fontSize: '0.9rem', padding: '0.5rem' }}
                                        onClick={() => setFormData(prev => ({ ...prev, sidebarWidth: '200px' }))}
                                    >
                                        Normal
                                    </button>
                                    <button
                                        className={`glass-button ${formData.sidebarWidth === '240px' ? 'primary' : ''}`}
                                        style={{ flex: '1 1 80px', fontSize: '0.9rem', padding: '0.5rem' }}
                                        onClick={() => setFormData(prev => ({ ...prev, sidebarWidth: '240px' }))}
                                    >
                                        Ancho
                                    </button>
                                </div>
                            </div>

                            {/* Audio Settings Section */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <Volume2 size={20} color="var(--accent-blue)" />
                                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Notificaciones de Audio</h3>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Activar sonidos</label>
                                    <button
                                        className={`glass-button ${audioEnabled ? 'primary' : ''}`}
                                        onClick={() => {
                                            const newState = !audioEnabled;
                                            setAudioEnabled(newState);
                                            audioService.setEnabled(newState);
                                        }}
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                    >
                                        {audioEnabled ? '✓ Activado' : '✗ Desactivado'}
                                    </button>
                                </div>

                                {audioEnabled && (
                                    <>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                Volumen: {Math.round(audioVolume * 100)}%
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={audioVolume}
                                                onChange={(e) => {
                                                    const newVolume = parseFloat(e.target.value);
                                                    setAudioVolume(newVolume);
                                                    audioService.setVolume(newVolume);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    height: '6px',
                                                    borderRadius: '3px',
                                                    background: `linear-gradient(to right, var(--accent-blue) 0%, var(--accent-blue) ${audioVolume * 100}%, rgba(255,255,255,0.2) ${audioVolume * 100}%, rgba(255,255,255,0.2) 100%)`,
                                                    outline: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </div>

                                        <button
                                            className="glass-button accent"
                                            onClick={() => audioService.testSound()}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                        >
                                            🔊 Probar Sonido
                                        </button>

                                        <p style={{ fontSize: '0.75rem', marginTop: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                            Los sonidos te alertarán cuando lleguen nuevos pedidos a cocina y cuando estén listos para servir.
                                        </p>
                                    </>
                                )}
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Sincronización en la Nube</h3>

                                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,100,255,0.1)', border: '1px solid var(--accent-blue)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <Save size={20} style={{ color: 'var(--accent-blue)' }} />
                                        <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>Firebase Cloud Sync</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                        <span>Estado:</span>
                                        {syncStatus === 'idle' && <span style={{ color: 'var(--text-secondary)' }}>Sincronizado ✓</span>}
                                        {syncStatus === 'syncing' && <span style={{ color: 'var(--accent-orange)' }}>Guardando...</span>}
                                        {syncStatus === 'success' && <span style={{ color: 'var(--accent-green)' }}>Guardado ✓</span>}
                                        {syncStatus === 'error' && <span style={{ color: 'var(--accent-red)' }}>Error al sincronizar</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                        Backup local: INMEDIATO | Cloud: ~2s
                                    </div>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Copia de Seguridad Manual</h3>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <button
                                        className="glass-button"
                                        style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                        onClick={exportData}
                                    >
                                        <Download size={18} />
                                        Descargar Respaldo
                                    </button>
                                    <label
                                        className="glass-button accent"
                                        style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                    >
                                        <Upload size={18} />
                                        Restaurar Copia
                                        <input
                                            type="file"
                                            accept=".json"
                                            style={{ display: 'none' }}
                                            onChange={async (e) => {
                                                if (e.target.files[0]) {
                                                    const ok = await confirm({
                                                        title: 'Restaurar Copia',
                                                        message: '¿Estás seguro? Esto reemplazará TODOS los datos actuales.'
                                                    });
                                                    if (ok) {
                                                        importData(e.target.files[0]);
                                                    }
                                                }
                                            }}
                                        />
                                    </label>
                                    <button
                                        className="glass-button"
                                        style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}
                                        onClick={rescueFromExternalBackup}
                                    >
                                        <TrendingDown size={18} color="var(--accent-orange)" /> Rescate desde Documentos
                                    </button>

                                    <label
                                        className="glass-button primary"
                                        style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                    >
                                        <FileSpreadsheet size={18} />
                                        Importar Excel
                                        <input
                                            type="file"
                                            accept=".xls,.xlsx"
                                            style={{ display: 'none' }}
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;

                                                try {
                                                    const dataBuffer = await file.arrayBuffer();
                                                    const workbook = read(dataBuffer);
                                                    const sheetName = workbook.SheetNames[0];
                                                    const sheet = workbook.Sheets[sheetName];
                                                    const jsonData = utils.sheet_to_json(sheet, { header: 'A' });

                                                    const timestamp = Date.now();

                                                    // Auto-categorization Rules
                                                    const CATEGORY_RULES = [
                                                        { id: 'comida', label: 'Comida', keywords: ['hamburguesa', 'burger', 'carne', 'doble', 'triple', 'bacon', 'queso', 'bbq', 'angus', 'wagyu', 'cheeseburger', 'pizza', 'perro', 'hot dog', 'salchicha', 'pollo', 'frito', 'asado', 'parrilla', 'bistec', 'solomo', 'punta', 'costilla', 'cerdo', 'chuleta', 'pescado', 'sandwich', 'pan', 'pepito', 'enrollado', 'shawarma', 'tostada', 'arepa', 'cachapa', 'taco', 'burrito', 'quesadilla', 'nachos', 'papas', 'fritas', 'yuca', 'aros', 'cebolla', 'pure', 'arroz', 'platano', 'tostones', 'tajadas', 'ensalada', 'cesar', 'aguacate', 'aceite', 'mantequilla'] },
                                                        { id: 'bebidas', label: 'Bebidas', keywords: ['bebida', 'refresco', 'jugo', 'agua', 'energizante', 'cola', 'pepsi', 'fanta', 'sprite', 'malta', 'te', 'té', 'cafe', 'café', 'limonada', 'naranja', 'manzana', 'batido', 'smoothie', 'soda', 'coca', 'cerveza', 'licor', 'vino', 'ron', 'whisky', 'vodka'] },
                                                        { id: 'sopas', label: 'Sopas', keywords: ['sopa', 'caldo', 'consomé', 'crema', 'sancocho', 'mondongo', 'hervido', 'fosforera', 'gallina', 'res', 'costilla', 'lagarto', 'pescado', 'mariscos', 'chupe', 'ajiaco', 'potaje', 'lentejas', 'caraotas', 'granos'] },
                                                        { id: 'dulces', label: 'Dulces', keywords: ['postre', 'dulce', 'helado', 'torta', 'pastel', 'cake', 'flan', 'gelatina', 'brownie', 'pie', 'mousse', 'quesillo', 'tres leches', 'marquesa', 'tiramisu', 'galleta', 'cookie', 'chocolate', 'vainilla', 'fresa', 'arequipe', 'nutella', 'donas', 'churros'] }
                                                    ];

                                                    const detectCategory = (name) => {
                                                        const lowerName = name.toLowerCase();
                                                        for (const cat of CATEGORY_RULES) {
                                                            if (cat.keywords.some(k => {
                                                                try {
                                                                    const regex = new RegExp(`\\b${k}\\b`, 'i');
                                                                    return regex.test(lowerName);
                                                                } catch {
                                                                    return lowerName.includes(k);
                                                                }
                                                            })) {
                                                                return cat.id;
                                                            }
                                                        }
                                                        return 'General';
                                                    };

                                                    // Map to store unique products (Deduplication)
                                                    const productsMap = new Map();

                                                    jsonData.forEach((row, index) => {
                                                        // MAPPING BASED ON USER IMAGE:
                                                        // A: Name (Nombre)
                                                        // L: Cost (Costo)
                                                        // P: Price (Precio)

                                                        const nameRaw = row['A'];
                                                        const costRaw = row['L'];
                                                        const priceRaw = row['P'];

                                                        // 1. Strict Name Validation
                                                        if (typeof nameRaw !== 'string' || !nameRaw) return;
                                                        const name = nameRaw.trim();

                                                        // Filter out headers and sub-table rows
                                                        if (name === 'Nombre') return; // Header
                                                        if (name.includes('Periodo') || name.includes('Mensual')) return; // Sub-headers
                                                        if (/^\d+$/.test(name)) return; // Year/Month numbers like 202511

                                                        // 2. Price Validation
                                                        // Price must be present for a valid product row in this sheet format
                                                        if (priceRaw === undefined || priceRaw === null) return;

                                                        const numPrice = typeof priceRaw === 'number' ? priceRaw : parseFloat(String(priceRaw).replace(',', '.'));
                                                        const numCost = typeof costRaw === 'number' ? costRaw : parseFloat(String(costRaw).replace(',', '.'));

                                                        if (isNaN(numPrice)) return;

                                                        const product = {
                                                            id: `imported_${timestamp}_${index}`,
                                                            name: name,
                                                            price: numPrice,
                                                            cost: isNaN(numCost) ? 0 : numCost,
                                                            category: detectCategory(name),
                                                            image: null,
                                                            stock: 0
                                                        };

                                                        // Save to map (Overwrites previous entry, keeping latest)
                                                        productsMap.set(name, product);
                                                    });

                                                    // Convert map to array
                                                    const newProducts = Array.from(productsMap.values());

                                                    if (newProducts.length > 0) {
                                                        const ok = await confirm({
                                                            title: 'Importar Productos',
                                                            message: `Se encontraron ${newProducts.length} productos válidos.\n\nEjemplos:\n- ${newProducts[0].name} ($${newProducts[0].price})\n\n¿Desea REEMPLAZAR la lista actual con estos productos?`
                                                        });
                                                        if (ok) {
                                                            // REPLACE logic as requested ("borra los productos que importe")
                                                            updateData('products', newProducts);
                                                            await alert({ title: 'Éxito', message: `${newProducts.length} productos importados exitosamente. La lista anterior ha sido reemplazada.` });
                                                        }
                                                    } else {
                                                        await alert({ title: 'Aviso', message: 'No se encontraron productos válidos. Verifique que las columnas A (Nombre) y P (Precio) contengan datos.' });
                                                    }

                                                } catch (error) {
                                                    console.error("Error importing excel:", error);
                                                    await alert({ title: 'Error', message: 'Error al procesar el archivo Excel.' });
                                                }
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>PIN Maestro (Acceso Admin Universal)</label>
                                <input
                                    type="text"
                                    name="masterPin"
                                    value={formData.masterPin || '0000'}
                                    onChange={handleChange}
                                    className="glass-input"
                                    style={{ maxWidth: '150px', letterSpacing: '2px', textAlign: 'center', fontWeight: 'bold' }}
                                />
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    Este PIN otorga acceso total si alguien olvida su clave.
                                </p>
                            </div>

                            <button
                                className="glass-button accent"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}
                                onClick={() => setActiveTab('users')}
                            >
                                <Users size={20} />
                                Gestionar Usuarios y Permisos
                            </button>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Configuración de Ventas</h3>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    % Descuento por defecto en Divisas (Autorizado)
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="number"
                                        className="glass-input"
                                        style={{ width: '100px' }}
                                        placeholder="0"
                                        defaultValue={data.defaultForeignCurrencyDiscountPercent || 0}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            updateData('defaultForeignCurrencyDiscountPercent', isNaN(val) ? 0 : val);
                                        }}
                                    />
                                    <span style={{ alignSelf: 'center' }}>%</span>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    Este porcentaje se aplicará automáticamente al seleccionar "Promo Divisas" en el POS.
                                </p>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <RefreshCw size={20} color="var(--accent-blue)" /> Actualizaciones del Sistema
                            </h3>
                            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                    Mantén tu sistema actualizado con las últimas mejoras en seguridad, UI y funciones de cocina en tiempo real.
                                </p>
                                <button
                                    className="glass-button primary"
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}
                                    onClick={async () => {
                                        try {
                                            const btn = document.activeElement;
                                            btn.style.opacity = '0.5';
                                            btn.disabled = true;
                                            btn.innerHTML = 'Buscando actualizaciones...';

                                            // Improved Android detection
                                            const isAndroid = /Android/i.test(navigator.userAgent);
                                            const isNative = window.Capacitor?.isNative || isAndroid;

                                            // Force local server URL on Android
                                            const baseUrl = isNative ? "http://127.0.0.1:3001" : "";

                                            // Listen for progress
                                            if (window.socket) {
                                                window.socket.off("ota_progress");
                                                window.socket.on("ota_progress", (data) => {
                                                    const { percent, downloaded, total, status } = data;
                                                    btn.innerHTML = `${status === "downloading" ? "Descargando" : status}: ${percent}% (${downloaded}/${total} MB)`;
                                                    btn.style.background = `linear-gradient(90deg, #4f46e5 ${percent}%, #374151 ${percent}%)`;
                                                });

                                                window.socket.off("ota_status");
                                                window.socket.on("ota_status", (data) => {
                                                    const msgs = { checking: "Buscando...", found: "Versión encontrada", extracting: "📂 Descomprimiendo...", installing: "✨ Instalando...", error: "Error" };
                                                    if (msgs[data.status]) btn.innerHTML = msgs[data.status];
                                                });
                                            }

                                            console.log("🔍 Checking for updates at:", `${baseUrl}/api/check-update`);
                                            const response = await fetch(`${baseUrl}/api/check-update`);
                                            const result = await response.json();

                                            // Reset UI
                                            if (window.socket) {
                                                window.socket.off("ota_progress");
                                                window.socket.off("ota_status");
                                            }
                                            btn.style.background = "";

                                            if (result.updated) {
                                                await alert({
                                                    title: '¡Actualización Aplicada!',
                                                    message: `Se ha descargado e instalado la versión ${result.newVersion}.\n\nEl servidor se reiniciará automáticamente en unos segundos para aplicar los cambios.`
                                                });
                                                // After alert, just wait for server to crash and hope service restarts it
                                            } else if (result.error) {
                                                await alert({ title: 'Aviso', message: 'No se pudo conectar con el servidor de actualizaciones. Revisa tu conexión a internet.' });
                                            } else {
                                                await alert({ title: 'Sistema al día', message: 'Ya tienes la versión más reciente instalada.' });
                                            }
                                        } catch (err) {
                                            await alert({ title: 'Error', message: 'Hubo un error al buscar actualizaciones.' });
                                        } finally {
                                            window.location.reload();
                                        }
                                    }}
                                >
                                    <RefreshCw size={18} />
                                    Buscar Actualizaciones Ahora
                                </button>
                            </div>
                        </div>

                        <div style={{
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            paddingTop: '1.5rem',
                            marginTop: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            opacity: 0.8
                        }}>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Acerca de este Sistema</h3>
                            <p style={{ fontSize: '0.9rem', textAlign: 'center' }}>
                                Desarrollado con las últimas tecnologías por <br />
                                <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>Luvin Rafael Bustillos</span>
                            </p>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                                <div className="text-sm font-medium text-gray-400">Versión del Sistema {serverInfo?.version || APP_VERSION}</div>
                                <div className="text-[10px] text-gray-600 font-mono mt-1">ID de Aplicación: com.laautentica.pos</div>
                            </div>
                        </div>

                        <button
                            className="glass-button primary"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', padding: '1rem' }}
                            onClick={handleSave}
                        >
                            <Save size={20} />
                            Guardar Cambios
                        </button>
                    </div>
                </>
            )}
        </div>

    );
};

const PaymentSettingsSection = ({ data, updateData, confirm, alert }) => {
    const [newMethod, setNewMethod] = useState({ name: '', currency: 'Bs', color: '#1d6335' });
    const paymentMethods = data.paymentMethods || [];

    const handleAdd = () => {
        if (!newMethod.name) return;
        const method = {
            ...newMethod,
            id: `pm_${Date.now()}`
        };
        updateData('paymentMethods', [...paymentMethods, method]);
        setNewMethod({ name: '', currency: 'Bs', color: '#1d6335' });
    };

    const handleDelete = async (id) => {
        const ok = await confirm({
            title: 'Eliminar Método',
            message: '¿Estás seguro de que quieres eliminar este método de pago?'
        });
        if (ok) {
            updateData('paymentMethods', paymentMethods.filter(m => m.id !== id));
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h1 style={{ fontSize: '2rem' }}>Métodos de Pago</h1>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Banknote size={20} color="var(--accent-green)" /> Nomenclaturas de Billetes
                </h2>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    {/* BS Denominations */}
                    <div style={{ flex: '1 1 200px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Billetes de Bolívares (Bs)</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                            {(data.denominationsBS || [500, 200, 100, 50, 20, 10]).map(d => (
                                <div key={d} className="glass-panel px-3 py-1 text-xs flex items-center gap-2 border-white/10">
                                    {d}
                                    <button onClick={() => {
                                        const current = data.denominationsBS || [500, 200, 100, 50, 20, 10];
                                        updateData('denominationsBS', current.filter(x => x !== d));
                                    }} style={{ color: 'var(--accent-red)', border: 'none', background: 'none' }}><X size={12} /></button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" id="new_denom_bs" className="glass-input text-sm p-2 w-24" placeholder="Valor..." />
                            <button className="glass-button primary p-2" onClick={() => {
                                const val = parseFloat(document.getElementById('new_denom_bs').value);
                                if (!val) return;
                                const current = data.denominationsBS || [500, 200, 100, 50, 20, 10];
                                if (!current.includes(val)) {
                                    updateData('denominationsBS', [...current, val].sort((a, b) => b - a));
                                }
                                document.getElementById('new_denom_bs').value = '';
                            }}><Plus size={16} /></button>
                        </div>
                    </div>

                    {/* USD Denominations */}
                    <div style={{ flex: '1 1 200px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Billetes de Dólares ($)</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                            {(data.denominationsUSD || [100, 50, 20, 10, 5, 2, 1]).map(d => (
                                <div key={d} className="glass-panel px-3 py-1 text-xs flex items-center gap-2 border-white/10">
                                    {d}
                                    <button onClick={() => {
                                        const current = data.denominationsUSD || [100, 50, 20, 10, 5, 2, 1];
                                        updateData('denominationsUSD', current.filter(x => x !== d));
                                    }} style={{ color: 'var(--accent-red)', border: 'none', background: 'none' }}><X size={12} /></button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" id="new_denom_usd" className="glass-input text-sm p-2 w-24" placeholder="Valor..." />
                            <button className="glass-button primary p-2" onClick={() => {
                                const val = parseFloat(document.getElementById('new_denom_usd').value);
                                if (!val) return;
                                const current = data.denominationsUSD || [100, 50, 20, 10, 5, 2, 1];
                                if (!current.includes(val)) {
                                    updateData('denominationsUSD', [...current, val].sort((a, b) => b - a));
                                }
                                document.getElementById('new_denom_usd').value = '';
                            }}><Plus size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={20} color="var(--accent-blue)" /> Agregar Nuevo Método
                </h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '2 1 200px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nombre (ej. Punto Banesco)</label>
                        <input
                            type="text"
                            className="glass-input"
                            value={newMethod.name}
                            onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                            placeholder="Nombre del método..."
                        />
                    </div>
                    <div style={{ flex: '1 1 100px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Moneda</label>
                        <select
                            className="glass-input"
                            value={newMethod.currency}
                            onChange={(e) => setNewMethod({ ...newMethod, currency: e.target.value })}
                        >
                            <option value="Bs">Bolívares (Bs)</option>
                            <option value="USD">Dólares ($)</option>
                        </select>
                    </div>
                    <div style={{ flex: '1 1 80px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Color</label>
                        <input
                            type="color"
                            value={newMethod.color}
                            onChange={(e) => setNewMethod({ ...newMethod, color: e.target.value })}
                            style={{ width: '100%', height: '42px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        />
                    </div>
                    <button className="glass-button primary" onClick={handleAdd} style={{ height: '42px', padding: '0 1.5rem' }}>
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Métodos Registrados</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {paymentMethods.map((m) => (
                        <div key={m.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: m.color, boxShadow: `0 0 10px ${m.color}66` }}></div>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{m.name}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Moneda:</span>
                                        <select
                                            className="bg-transparent text-[10px] font-black text-blue-400 border-none p-0 cursor-pointer focus:ring-0"
                                            value={m.currency}
                                            onChange={(e) => {
                                                const updated = paymentMethods.map(pm => pm.id === m.id ? { ...pm, currency: e.target.value } : pm);
                                                updateData('paymentMethods', updated);
                                            }}
                                        >
                                            <option value="Bs" className="bg-[#1a1a1a]">Bolívares (Bs)</option>
                                            <option value="USD" className="bg-[#1a1a1a]">Dólares ($)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button
                                className="glass-button"
                                style={{ padding: '0.5rem', border: 'none', color: 'var(--accent-red)' }}
                                onClick={() => handleDelete(m.id)}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {paymentMethods.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                            No hay métodos de pago configurados.
                        </div>
                    )}
                </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0 1rem' }}>
                <Info size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Estos métodos aparecerán como opciones disponibles en la pantalla de cobro del POS.
            </p>
        </div>
    );
};

const SyncSettingsSection = ({
    data, isDriveConnected, connectDrive, syncStatus,
    exportData, importData, confirm, alert, isLocalServerConnected, serverInfo,
    backupToCloud, restoreFromCloud, isMonitorMode, setIsMonitorMode
}) => {
    const [manualUrl, setManualUrl] = useState(localStorage.getItem('pos_server_url') || '');

    const handleSaveUrl = () => {
        if (manualUrl) {
            localStorage.setItem('pos_server_url', manualUrl);
        } else {
            localStorage.removeItem('pos_server_url');
        }
        window.location.reload(); // Reload to apply new server connection
    };

    const suggestedIP = serverInfo?.ip || window.location.hostname;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h1 style={{ fontSize: '2rem' }}>Sincronización</h1>

            {/* Local Sync Section */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Wifi size={24} color="var(--accent-blue)" />
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Sincronización Local (WiFi)</h2>
                </div>

                <div style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: isLocalServerConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${isLocalServerConnected ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: isLocalServerConnected ? 'var(--accent-green)' : 'var(--accent-red)',
                        boxShadow: `0 0 10px ${isLocalServerConnected ? 'var(--accent-green)' : 'var(--accent-red)'}`
                    }}></div>
                    <div>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>
                            Estado: {isLocalServerConnected ? 'CONECTADO AL SERVIDOR' : 'SERVIDOR DESCONECTADO'}
                        </p>
                        <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0', opacity: 0.8 }}>
                            {isLocalServerConnected
                                ? `Conectado a ${serverInfo?.ip}:${serverInfo?.port}`
                                : 'El servidor principal debe estar encendido para sincronizar otros dispositivos.'
                            }
                        </p>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Globe size={18} /> Dirección de Red
                    </h3>
                    <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        Para que otros dispositivos (celulares, tablets) se conecten, diles que entren a esta dirección en su navegador:
                    </p>
                    <div style={{
                        background: '#000',
                        padding: '1rem',
                        borderRadius: '8px',
                        fontSize: '1rem', // Reduced from 1.2rem
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: 'var(--accent-blue)',
                        fontFamily: 'monospace',
                        border: '1px solid rgba(0, 242, 255, 0.3)',
                        wordBreak: 'break-all', // Fix overflow
                        overflowWrap: 'anywhere' // Support all browsers
                    }}>
                        http://{suggestedIP}:3000
                    </div>
                </div>

                {/* --- AUTO-DISCOVERY UI --- */}
                <AutoDiscoveryUI confirm={confirm} alert={alert} />


                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Configuración Avanzada</h3>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        URL Manual del Servidor (Opcional)
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder={`http://${suggestedIP}:3001`}
                            value={manualUrl}
                            onChange={(e) => setManualUrl(e.target.value)}
                        />
                        <button className="glass-button primary" onClick={handleSaveUrl}>
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Firebase Cloud Sync Section */}
            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(255,165,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Globe size={24} color="#ff9d00" />
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Sincronización Cloud (Firebase)</h2>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,165,0,0.05)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>Autoguardado en Tiempo Real</p>
                            <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: '0.25rem 0 0' }}>Sincroniza tus datos automáticamente con la nube.</p>
                        </div>
                        <button
                            className={`glass-button ${localStorage.getItem('cloud_sync_enabled') === 'true' ? 'primary' : ''}`}
                            onClick={() => {
                                const isEnabled = localStorage.getItem('cloud_sync_enabled') === 'true';
                                localStorage.setItem('cloud_sync_enabled', (!isEnabled).toString());
                                window.location.reload(); // Refresh to start/stop effect
                            }}
                            style={{ padding: '0.5rem 1rem' }}
                        >
                            {localStorage.getItem('cloud_sync_enabled') === 'true' ? '✓ Activado' : '✗ Desactivado'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                        <span>Estado de Nube:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {syncStatus === 'syncing' && <span style={{ color: 'var(--accent-orange)' }}><RefreshCw size={14} className="animate-spin" /> Sincronizando...</span>}
                            {syncStatus === 'success' && <span style={{ color: 'var(--accent-green)' }}>✓ Datos Seguros</span>}
                            {syncStatus === 'error' && <span style={{ color: 'var(--accent-red)' }}>⚠ Error de Conexión</span>}
                            {syncStatus === 'idle' && <span style={{ color: 'var(--text-secondary)' }}>En espera</span>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                        <div>
                            <p style={{ fontWeight: 'bold', margin: 0, color: isMonitorMode ? 'var(--accent-blue)' : 'inherit' }}>
                                📺 Modo Monitor (Remoto)
                            </p>
                            <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: '0.25rem 0 0' }}>
                                {isMonitorMode ? 'Recibiendo datos en tiempo real de la nube.' : 'Usa este modo en dispositivos fuera del negocio.'}
                            </p>
                        </div>
                        <button
                            className={`glass-button ${isMonitorMode ? 'primary' : ''}`}
                            onClick={async () => {
                                const ok = await confirm({
                                    title: isMonitorMode ? 'Desactivar Modo Monitor' : 'Activar Modo Monitor',
                                    message: isMonitorMode
                                        ? '¿Volver al modo de servidor local?'
                                        : 'El Modo Monitor permite ver ventas y carritos en vivo desde cualquier lugar. ¿Activar ahora? (Se reiniciará la app)'
                                });
                                if (ok) {
                                    setIsMonitorMode(!isMonitorMode);
                                }
                            }}
                            style={{ padding: '0.5rem 1rem' }}
                        >
                            {isMonitorMode ? '✓ Activo' : 'Activar'}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        className="glass-button accent"
                        style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        onClick={() => backupToCloud()}
                    >
                        <Save size={18} />
                        RESPALDO NUBE
                    </button>
                    <button
                        className="glass-button"
                        style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}
                        onClick={() => restoreFromCloud()}
                    >
                        <TrendingDown size={18} />
                        RESTAURAR NUBE
                    </button>
                </div>
            </div>
        </div >
    );
};

// --- SUB-COMPONENTS ---

const AutoDiscoveryUI = ({ confirm, alert }) => {
    const [foundServers, setFoundServers] = useState([]);
    const [isScanning, setIsScanning] = useState(false);

    const handleScan = async () => {
        setIsScanning(true);
        setFoundServers([]);
        try {
            // Try localhost:3000 (standard Node port of THIS device's backend)
            // Even in Client Mode, the device runs its own local backend which handles UDP scanning
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const res = await fetch('http://localhost:3000/api/scan-servers', { signal: controller.signal });
            clearTimeout(timeoutId);

            const json = await res.json();
            setFoundServers(json.servers || []);
        } catch (e) {
            console.error("Scan error:", e);
            await alert({
                title: 'Error de Escaneo',
                message: 'No se pudo escanear la red. Asegúrate de que este dispositivo tenga el servicio Node.js corriendo.'
            });
        } finally {
            setIsScanning(false);
        }
    };

    const handleConnect = async (ip) => {
        const ok = await confirm({
            title: 'Conectar a Servidor',
            message: `¿Deseas conectar este dispositivo al servidor en ${ip}?\n\nLa aplicación se recargará y sincronizará datos con el servidor principal.`
        });
        if (ok) {
            localStorage.setItem('remote_server_ip', ip);
            localStorage.setItem('pos_server_url', `http://${ip}:3000`);
            window.location.reload();
        }
    };

    const handleDisconnect = () => {
        localStorage.removeItem('remote_server_ip');
        localStorage.removeItem('pos_server_url');
        window.location.reload();
    };

    const currentRemote = localStorage.getItem('remote_server_ip');

    return (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wifi size={18} /> Escáner de Dispositivos (Auto-Discover)
            </h3>

            {currentRemote ? (
                <div style={{
                    padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)',
                    borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <strong style={{ color: 'var(--accent-green)' }}>Conectado Remotamente</strong>
                        <div style={{ fontSize: '0.9rem' }}>IP Servidor: {currentRemote}</div>
                    </div>
                    <button className="glass-button" onClick={handleDisconnect} style={{ color: 'var(--accent-red)' }}>
                        Desconectar
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button
                        className={`glass-button ${isScanning ? '' : 'primary'}`}
                        onClick={handleScan}
                        disabled={isScanning}
                        style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <RefreshCw size={18} className={isScanning ? 'animate-spin' : ''} />
                        {isScanning ? 'Escaneando Red Local...' : 'Buscar Servidores en WiFi'}
                    </button>

                    {foundServers.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Servidores encontrados:</p>
                            {foundServers.map((srv, idx) => (
                                <div key={idx} className="glass-panel" style={{
                                    padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }}></div>
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{srv.name || 'Servidor POS'}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{srv.ip}:{srv.port} (v{srv.version})</div>
                                        </div>
                                    </div>
                                    {srv.isSelf ? (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(Este dispositivo)</span>
                                    ) : (
                                        <button className="glass-button primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => handleConnect(srv.ip)}>
                                            Conectar
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {foundServers.length === 0 && !isScanning && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic' }}>
                            Presiona buscar para encontrar servidores activos en tu red WiFi.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
