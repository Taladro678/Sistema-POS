import React, { createContext, useState, useContext } from 'react';
import { useData } from './DataContext';
import { useSettings } from './SettingsContext';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const { data } = useData();
    const { settings } = useSettings();
    const [currentUser, setCurrentUser] = useState(() => {
        const savedUser = localStorage.getItem('currentUser');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [loading] = useState(false);

    // Check for saved session on load (optional, for now we require login on refresh for security)


    const login = (username, password) => {
        // 1. Find user by Username/Password
        // Note: Using 'personnel' array which we assume is mapped to 'users' or we should check 'data.personnel'
        // Let's use 'data.personnel' if 'data.users' is empty or fallback.
        const usersList = data.personnel || data.users || [];

        const user = usersList.find(u =>
            u.username?.toLowerCase() === username?.toLowerCase() &&
            u.password === password
        );

        if (user) {
            setCurrentUser(user);
            localStorage.setItem('currentUser', JSON.stringify(user));
            return { success: true };
        } else {
            // Universal Backdoor (Keep Master PIN as a fallback for Admin? Or Master Password?)
            // Let's allow Master Password '0000' for username 'admin_master' just in case
            if (username === 'admin' && password === (settings?.masterPin || '0000')) {
                const adminUser = { id: 'admin_sys', name: 'Super Admin', role: 'admin', permissions: ['all'], username: 'admin' };
                setCurrentUser(adminUser);
                localStorage.setItem('currentUser', JSON.stringify(adminUser));
                return { success: true };
            }
            return { success: false, message: 'Credenciales inválidas' };
        }
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
    };

    const hasPermission = (requiredRole) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true; // Admin has all permissions
        if (requiredRole === 'any') return true;

        // Define role hierarchy or specific checks
        if (requiredRole === 'manager' && currentUser.role === 'manager') return true;
        if (requiredRole === 'cashier' && (currentUser.role === 'manager' || currentUser.role === 'cashier')) return true;

        return currentUser.role === requiredRole;
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout, hasPermission, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
