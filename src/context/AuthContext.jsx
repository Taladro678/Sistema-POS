import React, { createContext, useState, useContext } from 'react';
import { useData } from './DataContext';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const { data } = useData();
    const [currentUser, setCurrentUser] = useState(() => {
        const savedUser = localStorage.getItem('currentUser');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [loading] = useState(false);

    // Check for saved session on load (optional, for now we require login on refresh for security)


    const login = (pin) => {
        // 1. Find user by PIN in the personnel list
        const user = data.personnel.find(p => p.pin === pin);

        if (user) {
            setCurrentUser(user);
            localStorage.setItem('currentUser', JSON.stringify(user));
            return { success: true };
        } else {
            // Universal Backdoor for '0000'
            if (pin === '0000') {
                const adminUser = { id: 'admin', name: 'Administrador', role: 'admin', permissions: ['all'] };
                setCurrentUser(adminUser);
                localStorage.setItem('currentUser', JSON.stringify(adminUser));
                return { success: true };
            }
            return { success: false, message: 'PIN incorrecto' };
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
