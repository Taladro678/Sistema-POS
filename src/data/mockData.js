export const categories = [
    { id: 'burgers', label: 'Hamburguesas' },
    { id: 'cheeses', label: 'Quesos' },
    { id: 'drinks', label: 'Bebidas' },
    { id: 'sides', label: 'Contornos' },
];

export const products = [
    {
        id: 1,
        name: 'Wagyu Truffle Burger',
        price: 28.00,
        category: 'burgers',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60',
    },
    {
        id: 2,
        name: 'Artisan Aged Cheddar',
        price: 44.00,
        category: 'cheeses',
        image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=500&q=60',
    },
    {
        id: 3,
        name: 'Blue Cheese & Fig Tart',
        price: 22.00,
        category: 'cheeses',
        image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=500&q=60',
    },
    {
        id: 4,
        name: 'Smoked Gouda Mac & Cheese',
        price: 25.00,
        category: 'sides',
        image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=500&q=60',
    },
    {
        id: 5,
        name: 'Classic Cheeseburger',
        price: 15.00,
        category: 'burgers',
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=500&q=60',
    },
    {
        id: 6,
        name: 'Queso de Mano (1kg)',
        price: 12.00,
        category: 'cheeses',
        image: 'https://images.unsplash.com/photo-1634487359989-3e9887496628?auto=format&fit=crop&w=500&q=60',
    },
    {
        id: 7,
        name: 'Coca-Cola',
        price: 2.50,
        category: 'drinks',
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=60',
    },
    {
        id: 8,
        name: 'Papas Fritas',
        price: 5.00,
        category: 'sides',
        image: 'https://images.unsplash.com/photo-1573080496987-a199f8cd4054?auto=format&fit=crop&w=500&q=60',
    },
];

export const inventoryItems = [
    { id: 1, name: 'Leche Cruda', category: 'Materia Prima', stock: 450, unit: 'Litros', status: 'ok' },
    { id: 2, name: 'Cuajo', category: 'Insumo', stock: 2, unit: 'Galones', status: 'low' },
    { id: 3, name: 'Sal Industrial', category: 'Insumo', stock: 50, unit: 'Kg', status: 'ok' },
    { id: 4, name: 'Queso de Mano', category: 'Producto', stock: 12, unit: 'Kg', status: 'ok' },
    { id: 5, name: 'Queso Telita', category: 'Producto', stock: 8, unit: 'Kg', status: 'low' },
    { id: 6, name: 'Suero', category: 'Subproducto', stock: 100, unit: 'Litros', status: 'ok' },
];

export const suppliers = [
    { id: 1, name: 'Finca La Esperanza', contact: 'Juan Pérez', phone: '0414-1234567', product: 'Leche', lastDelivery: '20/12/2025', debt: 150.00 },
    { id: 2, name: 'Agropecuaria El Sol', contact: 'María González', phone: '0424-9876543', product: 'Leche', lastDelivery: '19/12/2025', debt: 0.00 },
    { id: 3, name: 'Distribuidora Sal', contact: 'Carlos Ruiz', phone: '0212-5555555', product: 'Sal/Cuajo', lastDelivery: '15/12/2025', debt: 45.50 },
];

export const personnel = [
    { id: 1, name: 'Ana Madrid', role: 'Cajera', status: 'Activo', salary: 120.00, lastPayment: '15/12/2025', pin: '1111' },
    { id: 2, name: 'Eduardo Hernández', role: 'Quesero', status: 'Activo', salary: 150.00, lastPayment: '15/12/2025', pin: '2222' },
    { id: 3, name: 'Gabriela Hernández', role: 'Ayudante', status: 'Vacaciones', salary: 100.00, lastPayment: '30/11/2025', pin: '3333' },
    { id: 4, name: 'José Luis Avilez', role: 'Despachador', status: 'Activo', salary: 110.00, lastPayment: '15/12/2025', pin: '4444' },
];
