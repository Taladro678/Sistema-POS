import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { Save, Download, Upload, Trash2, Users, Lock, FileSpreadsheet, Settings } from 'lucide-react';
import { read, utils } from 'xlsx';
import { UsersPage } from './UsersPage';

export const SettingsPage = () => {
    const { settings, updateSettings } = useSettings();
    const navigate = useNavigate();
    const { exportData, importData, connectDrive, isDriveConnected, syncStatus, clearAllData, data, updateData } = useData();
    const [formData, setFormData] = useState(settings);
    const [activeTab, setActiveTab] = useState('general');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        updateSettings(formData);
        alert('Configuración guardada exitosamente.');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            {/* Tabs Navigation */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                <button
                    className={`glass-button ${activeTab === 'general' ? 'primary' : ''}`}
                    onClick={() => setActiveTab('general')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    <Settings size={20} />
                    General
                </button>
                <button
                    className={`glass-button ${activeTab === 'users' ? 'primary' : ''}`}
                    onClick={() => setActiveTab('users')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    <Users size={20} />
                    Usuarios
                </button>
            </div>

            {activeTab === 'users' ? (
                <UsersPage />
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

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Sincronización en la Nube</h3>

                                {!isDriveConnected ? (
                                    <button
                                        className="glass-button"
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'white', color: '#333' }}
                                        onClick={connectDrive}
                                    >
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" width="20" />
                                        Conectar con Google Drive
                                    </button>
                                ) : (
                                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,255,0,0.1)', border: '1px solid var(--accent-green)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" width="20" />
                                            <span style={{ fontWeight: 'bold', color: 'var(--accent-green)' }}>Conectado a Google Drive</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                            <span>Estado:</span>
                                            {syncStatus === 'idle' && <span style={{ color: 'var(--text-secondary)' }}>Sincronizado</span>}
                                            {syncStatus === 'syncing' && <span style={{ color: 'var(--accent-orange)' }}>Guardando...</span>}
                                            {syncStatus === 'success' && <span style={{ color: 'var(--accent-green)' }}>¡Guardado!</span>}
                                            {syncStatus === 'error' && <span style={{ color: 'var(--accent-red)' }}>Error al guardar</span>}
                                        </div>
                                        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                                            Tus datos se guardan automáticamente en la carpeta de tu Drive cada vez que haces cambios.
                                        </p>
                                    </div>
                                )}
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
                                            onChange={(e) => {
                                                if (e.target.files[0]) {
                                                    if (window.confirm('¿Estás seguro? Esto reemplazará TODOS los datos actuales.')) {
                                                        importData(e.target.files[0]);
                                                    }
                                                }
                                            }}
                                        />
                                    </label>

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
                                                        if (window.confirm(`Se encontraron ${newProducts.length} productos válidos.\n\nEjemplos:\n- ${newProducts[0].name} ($${newProducts[0].price})\n\n¿Desea REEMPLAZAR la lista actual con estos productos?`)) {
                                                            // REPLACE logic as requested ("borra los productos que importe")
                                                            updateData('products', newProducts);
                                                            alert(`${newProducts.length} productos importados exitosamente. La lista anterior ha sido reemplazada.`);
                                                        }
                                                    } else {
                                                        alert('No se encontraron productos válidos. Verifique que las columnas A (Nombre) y P (Precio) contengan datos.');
                                                    }

                                                } catch (error) {
                                                    console.error("Error importing excel:", error);
                                                    alert('Error al procesar el archivo Excel.');
                                                }
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Lock size={20} /> Seguridad y Accesos
                            </h3>

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
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-red)' }}>Zona de Peligro</h3>
                            <button
                                className="glass-button"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}
                                onClick={() => {
                                    if (window.confirm('ADVERTENCIA: ¿Estás seguro de que quieres BORRAR TODOS LOS DATOS? Esto eliminará empleados, proveedores, inventario y ventas. Esta acción no se puede deshacer.')) {
                                        clearAllData();
                                        alert('Todos los datos han sido eliminados.');
                                    }
                                }}
                            >
                                <Trash2 size={18} />
                                Borrar Todos los Datos (Reset de Fábrica)
                            </button>
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
