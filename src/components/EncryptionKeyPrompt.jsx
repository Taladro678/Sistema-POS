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
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso de Seguridad</h2>
                <p className="text-gray-600 mb-6">
                    Ingresa tu <b>Llave Maestra</b> para cifrar y proteger tus datos en este servidor.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="text-left">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Llave Maestra</label>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Tu llave secreta..."
                            autoComplete="current-password" // Crucial for Password Managers
                            name="password" // Standard name for password managers
                            id="master_key_input"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            💡 Tip: Puedes guardar esta llave en tu Gestor de Contraseñas de Google.
                        </p>
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
                            Recordar permanentemente en este móvil
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg mb-4"
                    >
                        Desbloquear y Entrar
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
                        className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold py-3 rounded-lg transition-colors border border-gray-200"
                    >
                        Continuar en Modo Local
                        <span className="block text-[10px] font-normal text-gray-400 mt-1">
                            (Solo para ver datos básicos sin cifrado en la nube)
                        </span>
                    </button>

                    <p className="text-[10px] text-gray-400 mt-4 leading-tight">
                        * Tu llave es privada. Si la pierdes, no podremos recuperar tus ventas cifradas. Guárdala bien.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default EncryptionKeyPrompt;
