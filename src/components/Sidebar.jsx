import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Users, Truck, Settings, ChevronLeft, ChevronRight, Tag, Coffee, Calculator, BarChart } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const Sidebar = () => {
    const { settings, toggleSidebar } = useSettings();
    const isCollapsed = settings.isSidebarCollapsed;
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false); // New state for mobile popup menu

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navItems = [
        { path: '/tables', icon: Coffee, label: 'Mesas' },
        { path: '/', icon: ShoppingCart, label: 'Ventas (POS)' },
        { path: '/cash-register', icon: Calculator, label: 'Caja' },
        { path: '/inventory', icon: Package, label: 'Inventario' },
        { path: '/products', icon: Tag, label: 'Productos' },
        { path: '/suppliers', icon: Truck, label: 'Proveedores' },
        { path: '/personnel', icon: Users, label: 'Personal' },
        { path: '/reports', icon: BarChart, label: 'Reportes' },
        { path: '/settings', icon: Settings, label: 'Configuración' },
    ];

    // Mobile Logic: Split items
    const mobileVisibleCount = 4; // Show first 4 items directly
    const mainItems = isMobile ? navItems.slice(0, mobileVisibleCount) : navItems;
    const overflowItems = isMobile ? navItems.slice(mobileVisibleCount) : [];

    // Helper to render a nav link
    const renderNavLink = (item, isOverflow = false) => (
        <NavLink
            key={item.path}
            to={item.path}
            onClick={() => isOverflow && setIsMobileMenuOpen(false)} // Close menu on click
            className={({ isActive }) => `
              glass-button
              ${isActive ? 'primary' : ''}
              ${isOverflow ? 'mobile-overflow-item' : ''}
            `}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: isCollapsed && !isMobile && !isOverflow ? '0.5rem 0' : '0.5rem 0.75rem',
                justifyContent: (isCollapsed && !isMobile && !isOverflow) ? 'center' : 'flex-start',
                width: isOverflow ? '100%' : 'auto',
                marginBottom: isOverflow ? '0.25rem' : '0'
            }}
            title={isCollapsed ? item.label : ''}
        >
            <item.icon size={20} />
            {(!isCollapsed || isMobile) && <span className="sidebar-label" style={{ fontSize: '0.85rem', display: isMobile && !isOverflow ? 'none' : 'block' }}>{item.label}</span>}
        </NavLink>
    );

    return (
        <aside
            className={`glass-panel sidebar ${isCollapsed ? 'collapsed' : ''}`}
            style={{
                width: isMobile ? '100%' : (isCollapsed ? '50px' : settings.sidebarWidth),
                padding: isCollapsed ? '0' : '1rem',
                borderRadius: 0, // Flush look
                borderLeft: 'none',
                borderTop: 'none',
                borderBottom: 'none'
            }}
        >


            {/* Toggle Button at the top - HIDDEN ON MOBILE */}
            {!isMobile && (
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
            )}

            {/* Mobile Overflow Menu (Popup) */}
            {isMobile && isMobileMenuOpen && (
                <div
                    className="glass-panel"
                    style={{
                        position: 'absolute',
                        bottom: '55px', // Above the bar
                        right: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        padding: '0.5rem',
                        zIndex: 200,
                        background: '#000', // Ensure visibility
                        border: '1px solid var(--glass-border)',
                        minWidth: '180px'
                    }}
                >
                    {overflowItems.map(item => renderNavLink(item, true))}
                </div>
            )}

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, overflowY: 'auto' }}>
                {mainItems.map(item => renderNavLink(item))}

                {/* Mobile "More" Button */}
                {isMobile && overflowItems.length > 0 && (
                    <button
                        className={`glass-button ${isMobileMenuOpen ? 'active' : ''}`}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.5rem',
                            flex: '1 0 auto'
                        }}
                    >
                        <div style={{ display: 'flex', gap: '2px', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></div>
                            <div style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></div>
                            <div style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></div>
                        </div>
                    </button>
                )}
            </nav>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Toggle Button */}


                {!isCollapsed && (
                    <div className="sidebar-user">
                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Usuario</p>
                            <p style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Pedro Silva</p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
