import React, { createContext, useState, useContext, useEffect } from 'react';
import { useData } from './DataContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const { data } = useData();
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for saved session on load (optional, for now we require login on refresh for security)
    useEffect(() => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

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
