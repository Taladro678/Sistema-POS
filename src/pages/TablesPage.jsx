import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Users, Coffee, CheckCircle, Clock } from 'lucide-react';

export const TablesPage = () => {
    const { data } = useData();
    const navigate = useNavigate();
    const tables = data.tables || [];

    const handleTableClick = (table) => {
        // Navigate to POS with table ID
        navigate(`/?tableId=${table.id}`);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'occupied': return 'var(--accent-red)';
            case 'reserved': return 'var(--accent-orange)';
            case 'available':
            default: return 'var(--accent-green)';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'occupied': return 'Ocupada';
            case 'reserved': return 'Reservada';
            case 'available':
            default: return 'Disponible';
        }
    };

    return (
        <div className="p-6 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                <Coffee /> Gestión de Mesas
            </h1>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {tables.map(table => (
                    <button
                        key={table.id}
                        onClick={() => handleTableClick(table)}
                        className="glass-panel p-6 flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 relative overflow-hidden group"
                        style={{
                            minHeight: '200px',
                            border: `2px solid ${getStatusColor(table.status)}`,
                            background: table.status === 'occupied' ? 'rgba(231, 76, 60, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                        }}
                    >
                        <div
                            className="absolute top-0 right-0 p-2 text-xs font-bold uppercase tracking-wider"
                            style={{ background: getStatusColor(table.status), color: 'white', borderBottomLeftRadius: '8px' }}
                        >
                            {getStatusLabel(table.status)}
                        </div>

                        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <Users size={40} color={getStatusColor(table.status)} />
                        </div>

                        <h3 className="text-xl font-bold text-white">{table.name}</h3>

                        {table.status === 'occupied' && (
                            <div className="text-sm text-gray-300 flex items-center gap-1">
                                <Clock size={14} />
                                <span>Ocupada</span>
                            </div>
                        )}

                        {table.status === 'available' && (
                            <div className="text-sm text-gray-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <CheckCircle size={14} />
                                <span>Click para abrir</span>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
