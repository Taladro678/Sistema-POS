import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Users, Truck, Settings, ChevronLeft, ChevronRight, Tag, Coffee, Calculator, BarChart } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const Sidebar = () => {
    const { settings, toggleSidebar } = useSettings();
    const isCollapsed = settings.isSidebarCollapsed;

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

    return (
        <aside
            className={`glass-panel sidebar ${isCollapsed ? 'collapsed' : ''}`}
            style={{
                width: isCollapsed ? '50px' : settings.sidebarWidth,
                padding: isCollapsed ? '0' : '1rem',
                borderRadius: 0, // Flush look
                borderLeft: 'none',
                borderTop: 'none',
                borderBottom: 'none'
            }}
        >


            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
              glass-button
              ${isActive ? 'primary' : ''}
            `}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: isCollapsed ? '0.5rem 0' : '0.5rem 0.75rem',
                            justifyContent: isCollapsed ? 'center' : 'flex-start',
                        }}
                        title={isCollapsed ? item.label : ''}
                    >
                        <item.icon size={20} />
                        {!isCollapsed && <span className="sidebar-label" style={{ fontSize: '0.85rem' }}>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Toggle Button */}
                <button
                    className="glass-button"
                    onClick={toggleSidebar}
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '0.5rem',
                        alignSelf: isCollapsed ? 'center' : 'flex-end'
                    }}
                    title={isCollapsed ? "Expandir" : "Contraer"}
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>

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
