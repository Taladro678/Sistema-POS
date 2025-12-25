import React, { createContext, useState, useContext } from 'react';

const SettingsContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(() => {
        try {
            const savedSettings = localStorage.getItem('appSettings');
            return savedSettings ? JSON.parse(savedSettings) : {
                appName: 'Luna & Curd',
                appSubtitle: 'ERP System',
                logoColor1: '#00f2ff',
                logoColor2: '#ff9d00',
                sidebarWidth: '200px',
                isSidebarCollapsed: false, // Default state
            };
        } catch (e) {
            console.error('Error loading settings:', e);
            return {
                appName: 'Luna & Curd',
                appSubtitle: 'ERP System',
                logoColor1: '#00f2ff',
                logoColor2: '#ff9d00',
                sidebarWidth: '200px',
                isSidebarCollapsed: false
            };
        }
    });

    const updateSettings = (newSettings) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            try {
                localStorage.setItem('appSettings', JSON.stringify(updated));
            } catch (e) {
                console.error('Error saving settings:', e);
            }
            return updated;
        });
    };

    const toggleSidebar = () => {
        setSettings(prev => {
            const updated = { ...prev, isSidebarCollapsed: !prev.isSidebarCollapsed };
            try {
                localStorage.setItem('appSettings', JSON.stringify(updated));
            } catch (e) {
                console.error('Error saving settings:', e);
            }
            return updated;
        });
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, toggleSidebar }}>
            {children}
        </SettingsContext.Provider>
    );
};
