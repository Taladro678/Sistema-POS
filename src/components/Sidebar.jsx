/**
 * COMPONENTE: Sidebar - Barra de navegación lateral/inferior responsive
 * 
 * FUNCIONALIDAD:
 * - En DESKTOP: Barra lateral que se puede expandir/contraer
 * - En MOBILE: Barra inferior fija con overflow menu (botón de 3 puntos)
 * 
 * CARACTERÍSTICAS:
 * - Responsive: Cambia automáticamente entre desktop y mobile según el ancho de pantalla
 * - Overflow Menu Mobile: Los elementos que no caben se muestran en un menú popup
 * - Persistencia: El estado expandido/contraído se guarda en SettingsContext
 * - Iconos: Usa lucide-react para todos los iconos
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Users, Truck, Settings, ChevronLeft, ChevronRight, Tag, Coffee, Calculator, BarChart, MoreVertical, ChefHat, UserCircle, Shield, Layers } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const Sidebar = () => {
    // Obtener configuración global del sidebar (ancho, estado colapsado, etc.)
    const { settings, toggleSidebar } = useSettings();
    const isCollapsed = settings.isSidebarCollapsed;

    // Estado para detectar si estamos en móvil (<=768px) - Tablets usan Sidebar
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

    // Estado para controlar el menú popup de overflow en móvil
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    // Listener para detectar cambios de tamaño de pantalla y actualizar isMobile
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-colapsar cuando se cambia a modo móvil
    React.useEffect(() => {
        if (isMobile && !isCollapsed) {
            toggleSidebar(); // Forzar colapso en móvil
        }
    }, [isMobile, isCollapsed, toggleSidebar]);

    /**
     * CONFIGURACIÓN DE NAVEGACIÓN
     * Lista de todas las rutas disponibles en el sistema
     * Cada item tiene: path (ruta), icon (componente de lucide-react), label (texto)
     */
    const { currentUser, logout } = useAuth();

    /**
     * CONFIGURACIÓN DE NAVEGACIÓN
     */
    const allNavItems = [
        { path: '/tables', icon: Coffee, label: 'Pedidos/Mesas', roles: ['admin', 'manager', 'waiter', 'cashier'] },
        { path: '/kitchen', icon: ChefHat, label: 'Cocina', roles: ['admin', 'manager', 'kitchen'] },
        { path: '/', icon: ShoppingCart, label: 'Ventas (POS)', roles: ['admin', 'manager', 'waiter', 'cashier'] },
        { path: '/cash-register', icon: Calculator, label: 'Caja', roles: ['admin', 'manager', 'cashier'] },
        { path: '/customers', icon: UserCircle, label: 'Clientes', roles: ['admin', 'manager', 'waiter', 'cashier'] },
        { path: '/inventory', icon: Package, label: 'Inventario', roles: ['admin', 'manager'] },
        { path: '/products', icon: Tag, label: 'Productos', roles: ['admin', 'manager'] },
        { path: '/suppliers', icon: Truck, label: 'Proveedores', roles: ['admin', 'manager'] },
        { path: '/personnel', icon: Users, label: 'Personal', roles: ['admin'] },
        { path: '/reports', icon: BarChart, label: 'Reportes', roles: ['admin', 'manager'] },
        { path: '/settings', icon: Settings, label: 'Configuración', roles: ['admin'] },
    ];

    const navItems = allNavItems.filter(item => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        return item.roles.includes(currentUser.role);
    });

    /**
     * LÓGICA DE OVERFLOW EN MOBILE
     * En móvil, solo mostramos los primeros 5 items directamente
     * El resto se agrupa en un menú popup que se abre con el botón de 3 puntos (MoreVertical)
     */
    const mobileVisibleCount = 5; // Número de items visibles en la barra inferior
    const mainItems = isMobile ? navItems.slice(0, mobileVisibleCount) : navItems;
    const overflowItems = isMobile ? navItems.slice(mobileVisibleCount) : [];

    /**
     * FUNCIÓN: renderNavLink
     * Renderiza un botón de navegación con estilos responsive
     * 
     * @param {Object} item - Item de navegación {path, icon, label}
     * @param {Boolean} isOverflow - Si es true, el item está en el menú overflow (popup)
     * 
     * ESTILOS MOBILE:
     * - flex: 1 → Distribuye el espacio equitativamente entre todos los botones
     * - flex: 0.5 → Para el botón de overflow (3 puntos), es la mitad de ancho
     * - justifyContent: center → Centra el icono
     * - padding: 0.75rem → Padding uniforme
     * 
     * ESTILOS DESKTOP:
     * - Cuando collapsed: Solo muestra icono centrado
     * - Cuando expanded: Muestra icono + label con gap
     */
    const renderNavLink = (item, isOverflow = false) => (
        <NavLink
            key={item.path}
            to={item.path}
            onClick={() => isOverflow && setIsMobileMenuOpen(false)} // Cierra el menú popup al hacer click
            className={({ isActive }) => `
              glass-button
              ${isActive ? 'primary' : ''}
              ${isOverflow ? 'mobile-overflow-item' : ''}
            `}
            style={isMobile ? {
                // ESTILOS MOBILE
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: isOverflow ? '0 0 auto' : '1', // Overflow items no se expanden, items normales sí
                padding: '0.75rem',
                minWidth: isOverflow ? '100%' : '0',
                width: isOverflow ? '100%' : 'auto',
                marginBottom: isOverflow ? '0.25rem' : '0'
            } : {
                // ESTILOS DESKTOP
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: isCollapsed && !isOverflow ? '0.5rem 0' : '0.5rem 0.75rem',
                justifyContent: (isCollapsed && !isOverflow) ? 'center' : 'flex-start',
                width: isOverflow ? '100%' : 'auto',
                marginBottom: isOverflow ? '0.25rem' : '0'
            }}
            title={isCollapsed ? item.label : ''} // Tooltip cuando está colapsado
        >
            <item.icon size={20} />
            {/* Muestra el label solo cuando NO está colapsado, o cuando está en móvil en el overflow menu */}
            {(!isCollapsed || isMobile) && <span className="sidebar-label" style={{ fontSize: '0.85rem', display: isMobile && !isOverflow ? 'none' : 'block' }}>{item.label}</span>}
        </NavLink>
    );

    return (
        <aside
            className={`glass-panel sidebar ${isCollapsed ? 'collapsed' : ''}`}
            style={{
                width: isMobile ? '100%' : (isCollapsed ? '50px' : settings.sidebarWidth),
                padding: 0, // Removed padding as requested
                borderRadius: 0, // Flush look
                borderLeft: 'none',
                borderTop: 'none',
                borderBottom: 'none',
                display: 'flex',
                flexDirection: 'column',
                background: isMobile ? '#0f0f0f' : undefined, // Solid background for mobile bottom bar
                zIndex: 100 // Ensure it's on top
            }}
        >


            {/* Toggle Button at the top - REMOVED and moved to bottom */}
            {/* {!isMobile && (
                <div className="sidebar-toggle-container" style={{ display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-end', marginBottom: '1rem' }}>
                    <button
                        className="glass-button"
                        onClick={toggleSidebar}
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '0.5rem',
                            color: 'var(--text-secondary)'
                        }}
                        title={isCollapsed ? "Expandir" : "Contraer"}
                    >
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>
            )} */}

            {/* Mobile Overflow Menu (Popup) */}
            {isMobile && isMobileMenuOpen && (
                <>
                    {/* Backdrop to close menu */}
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 199
                        }}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <div
                        className="glass-panel"
                        style={{
                            position: 'absolute',
                            bottom: '70px', // Above the bar with some spacing
                            right: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            padding: '1rem',
                            zIndex: 200,
                            background: '#1a1a1a', // Solid dark background
                            border: '1px solid var(--glass-border)',
                            minWidth: '200px',
                            boxShadow: '0 -5px 20px rgba(0,0,0,0.5)'
                        }}
                    >
                        {overflowItems.map(item => renderNavLink(item, true))}
                        {!isCollapsed && <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }}></div>}
                        <button
                            className="glass-button"
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                if (window.confirm('¿Cerrar sesión?')) {
                                    logout();
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                justifyContent: 'flex-start',
                                color: 'var(--accent-red)',
                                width: '100%'
                            }}
                        >
                            <LogOut size={20} />
                            <span style={{ fontSize: '0.9rem' }}>Cerrar Sesión</span>
                        </button>
                    </div>
                </>
            )}

            <nav className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 0 : '0.25rem', overflowY: 'auto', flex: 1 }}>
                {mainItems.map(item => renderNavLink(item))}

                {/* Mobile "More" Button */}
                {isMobile && overflowItems.length > 0 && (
                    <button
                        className={`glass-button ${isMobileMenuOpen ? 'active' : ''}`}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        style={isMobile ? {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: '0.5',
                            padding: '0.75rem'
                        } : {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.25rem',
                            flex: '0 0 auto',
                            minWidth: '32px'
                        }}
                    >
                        <MoreVertical size={20} />
                    </button>
                )}
            </nav>

            {/* Desktop Logout Button - Outside nav, at bottom - REMOVED AS PER USER REQUEST */}
            {/* {!isMobile && (
                <>
                    {!isCollapsed && <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }}></div>}
                    <button
                        className="glass-button"
                        onClick={() => {
                            if (window.confirm('¿Cerrar sesión?')) {
                                logout();
                            }
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: isCollapsed ? '0.5rem 0' : '0.5rem 0.75rem',
                            justifyContent: isCollapsed ? 'center' : 'flex-start',
                            color: 'var(--accent-red)',
                            marginTop: 'auto'
                        }}
                        title="Cerrar Sesión"
                    >
            {/* Desktop About Section */}
            {!isMobile && !isCollapsed && (
                <div style={{
                    padding: '0.75rem',
                    fontSize: '0.65rem',
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    borderTop: '1px solid var(--glass-border)',
                    marginTop: 'auto',
                    opacity: 0.7
                }}>
                    <p style={{ margin: 0 }}>Construido usando las últimas tecnologías</p>
                    <p style={{ fontWeight: '600', color: 'var(--accent-blue)', marginTop: '0.2rem' }}>Por Luvin Rafael Bustillos Diaz</p>
                </div>
            )}

            {/* Desktop Toggle Button - Moved to bottom */}
            {!isMobile && (
                <>
                    {isCollapsed && <div style={{ marginTop: 'auto' }}></div>}
                    {!isCollapsed && isCollapsed === undefined && <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }}></div>}
                    <button
                        className="glass-button"
                        onClick={toggleSidebar}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.5rem',
                            width: '100%',
                            color: 'var(--text-secondary)',
                            marginTop: isCollapsed ? 'auto' : '0'
                        }}
                        title={isCollapsed ? "Expandir" : "Contraer"}
                    >
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </>
            )}
        </aside>
    );
};

export default Sidebar;
