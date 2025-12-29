import React from 'react';
import { useData } from '../context/DataContext';

/**
 * Componente de utilidad para restaurar categorías por defecto
 * Útil cuando se agregan nuevas categorías al sistema
 */
const RestoreDefaultCategories = ({ compact = false }) => {
    const { data, updateData } = useData();

    // ... (same categories array) ...
    const defaultCategories = [
        {
            id: 'burgers',
            label: 'Hamburguesas',
            keywords: ['hamburguesa', 'burger', 'carne', 'doble', 'triple', 'bacon', 'queso', 'bbq', 'angus', 'wagyu', 'cheeseburger']
        },
        {
            id: 'cheeses',
            label: 'Quesos',
            keywords: ['queso', 'cheese', 'cheddar', 'mozzarella', 'parmesano', 'gouda', 'mano', 'telita', 'guayanes', 'fundido', 'gratinado']
        },
        {
            id: 'drinks',
            label: 'Bebidas',
            keywords: ['bebida', 'refresco', 'jugo', 'agua', 'energizante', 'cola', 'pepsi', 'fanta', 'sprite', 'malta', 'te', 'cafe', 'limonada', 'naranja', 'manzana', 'batido', 'smoothie', 'soda']
        },
        {
            id: 'sides',
            label: 'Contornos',
            keywords: ['contorno', 'papas', 'fritas', 'yuca', 'aros', 'cebolla', 'pure', 'arroz', 'platano', 'tostones', 'tajadas', 'arepas']
        },
        {
            id: 'soups',
            label: 'Sopas',
            keywords: ['sopa', 'caldo', 'consomé', 'crema', 'sancocho', 'mondongo', 'hervido', 'fosforera', 'pollo', 'res', 'gallina', 'pescado', 'mariscos']
        },
        {
            id: 'pasta',
            label: 'Pasta',
            keywords: ['pasta', 'espagueti', 'spaghetti', 'fettuccine', 'lasagna', 'ravioli', 'macarrones', 'penne', 'tallarines', 'carbonara', 'bolognesa', 'alfredo']
        },
        {
            id: 'meals',
            label: 'Platos Principales',
            keywords: ['pollo', 'carne', 'pescado', 'cerdo', 'cochino', 'chuleta', 'asado', 'guisado', 'frito', 'parrilla', 'plancha', 'brasa', 'filete', 'lomo', 'costilla', 'pechuga']
        },
        {
            id: 'desserts',
            label: 'Postres',
            keywords: ['postre', 'dulce', 'helado', 'torta', 'pastel', 'cake', 'flan', 'gelatina', 'brownie', 'pie', 'mousse', 'quesillo', 'tres leches', 'marquesa', 'tiramisu']
        },
        {
            id: 'salads',
            label: 'Ensaladas',
            keywords: ['ensalada', 'verde', 'cesar', 'mixta', 'lechuga', 'tomate', 'vegetales', 'verduras', 'fresca']
        },
        {
            id: 'snacks',
            label: 'Snacks',
            keywords: ['snack', 'aperitivo', 'tequeño', 'empanada', 'pastelito', 'cachapa', 'arepa', 'deditos', 'nuggets', 'alitas', 'wings', 'nachos']
        }
    ];

    const handleRestore = () => {
        if (!window.confirm(
            '¿Restaurar categorías por defecto?\n\n' +
            'Esto agregará las categorías que faltan sin eliminar las existentes.\n' +
            'Si ya tienes una categoría con el mismo ID, se mantendrá tu versión.'
        )) {
            return;
        }

        const currentCategories = data.categories || [];
        const currentIds = new Set(currentCategories.map(c => c.id));

        // Agregar solo las categorías que no existen
        const newCategories = defaultCategories.filter(cat => !currentIds.has(cat.id));

        if (newCategories.length === 0) {
            alert('✅ Ya tienes todas las categorías por defecto');
            return;
        }

        const mergedCategories = [...currentCategories, ...newCategories];
        updateData('categories', mergedCategories);

        alert(
            `✅ Restauración completada\n\n` +
            `Categorías agregadas: ${newCategories.length}\n` +
            `Total de categorías: ${mergedCategories.length}\n\n` +
            `Categorías nuevas:\n${newCategories.map(c => '• ' + c.label).join('\n')}`
        );
    };

    const currentCount = data.categories?.length || 0;
    const missingCount = defaultCategories.filter(
        cat => !(data.categories || []).find(c => c.id === cat.id)
    ).length;

    // Renderizado Compacto
    if (compact) {
        if (missingCount === 0) return null; // No mostrar nada si todo está bien en modo compacto

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem',
                background: 'rgba(255, 165, 0, 0.1)',
                border: '1px dashed rgba(255, 165, 0, 0.3)',
                borderRadius: '8px',
                marginBottom: '1rem'
            }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-orange)' }}>
                    Faltan <strong>{missingCount}</strong> categorías sugeridas
                </span>
                <button
                    className="glass-button"
                    onClick={handleRestore}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', height: 'auto' }}
                >
                    Restaurar
                </button>
            </div>
        );
    }

    // Renderizado Normal (Panel Completo - Legacy support if needed somewhere else)
    return (
        <div className="glass-panel" style={{
            padding: '1rem',
            background: 'rgba(255, 165, 0, 0.05)',
            border: '1px solid rgba(255, 165, 0, 0.2)',
            marginBottom: '1rem'
        }}>
            <h3 style={{ color: 'var(--accent-orange)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                🔧 Utilidad de Categorías
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <p style={{ margin: '0 0 0.5rem 0' }}>
                        Categorías actuales: <strong>{currentCount}</strong>
                    </p>
                    {missingCount > 0 && (
                        <p style={{ margin: 0, color: 'var(--accent-orange)' }}>
                            Categorías por defecto faltantes: <strong>{missingCount}</strong>
                        </p>
                    )}
                    {missingCount === 0 && (
                        <p style={{ margin: 0, color: 'var(--accent-green)' }}>
                            ✅ Todas las categorías por defecto están presentes
                        </p>
                    )}
                </div>
                {missingCount > 0 && (
                    <button
                        className="glass-button primary"
                        onClick={handleRestore}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        Restaurar Categorías Por Defecto
                    </button>
                )}
            </div>
        </div>
    );
};

export default RestoreDefaultCategories;
