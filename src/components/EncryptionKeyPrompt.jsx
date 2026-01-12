import React, { useState, useEffect } from 'react';
import { setEncryptionKey } from '../services/firebase';

const EncryptionKeyPrompt = ({ onUnlock }) => {
    const [key, setKey] = useState('');
    const [remember, setRemember] = useState(true);

    useEffect(() => {
        // Try to load from localStorage to auto-login if previously saved
        const savedKey = localStorage.getItem('pos_encryption_key');
        const isLocalMode = localStorage.getItem('pos_local_mode') === 'true';

        if (savedKey || isLocalMode) {
            if (savedKey) setEncryptionKey(savedKey);
            onUnlock();
        }
    }, [onUnlock]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (key.trim().length > 0) {
            localStorage.removeItem('pos_local_mode');
            if (remember) {
                localStorage.setItem('pos_encryption_key', key);
            } else {
                sessionStorage.setItem('pos_encryption_key', key); // Just for this session
            }
            setEncryptionKey(key);
            onUnlock();
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
                <div className="mb-6">
                    <span className="text-6xl">🔐</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Seguridad del Sistema</h2>
                <p className="text-gray-600 mb-6">
                    Ingresa tu Clave Maestra para desencriptar los datos.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="text-left">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Clave de Encriptación</label>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Tu clave secreta..."
                            autoComplete="current-password"
                            name="encryption_key"
                            id="encryption_key"
                        />
                    </div>

                    <div className="flex items-center justify-start">
                        <input
                            id="remember-me"
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                            Recordar en este dispositivo
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg mb-4"
                    >
                        Desbloquear Sistema
                    </button>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">O</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (remember) {
                                localStorage.setItem('pos_local_mode', 'true');
                            }
                            onUnlock();
                        }}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-colors border border-gray-300"
                    >
                        Ingresar en Modo Local
                        <span className="block text-xs font-normal text-gray-500 mt-1">
                            (Sin Nube - Solo WiFi)
                        </span>
                    </button>

                    <p className="text-xs text-gray-400 mt-4">
                        * Si marcas "Recordar", no tendrás que ingresarla de nuevo en este dispositivo.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default EncryptionKeyPrompt;
