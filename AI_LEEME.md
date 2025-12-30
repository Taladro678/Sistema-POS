# 🤖 GUÍA PARA IA - Sistema POS "La Auténtica"

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Componentes Principales](#componentes-principales)
5. [Contextos y Estado Global](#contextos-y-estado-global)
6. [Sistema de Sincronización](#sistema-de-sincronización)
7. [Flujos de Trabajo](#flujos-de-trabajo)
8. [Estilos y Diseño](#estilos-y-diseño)
9. [Consideraciones Importantes](#consideraciones-importantes)

---

## 📖 Descripción General

Sistema POS (Point of Sale) completo para restaurantes desarrollado en React + Vite.

**Características principales:**

- ✅ Sistema de ventas con carrito
- ✅ Gestión de mesas y órdenes
- ✅ Control de inventario y productos
- ✅ Gestión de personal y proveedores
- ✅ Sistema de propinas distribuibles
- ✅ Multi-moneda (Bs/USD)
- ✅ Caja registradora con retiros
- ✅ Sincronización multi-capa (localStorage, WebSocket, Google Drive, Firebase)
- ✅ Diseño responsive (Desktop + Mobile)
- ✅ Interfaz en español
- ✅ Tema oscuro con glassmorphism

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

```
Frontend: React 18 + Vite
Routing: React Router v6
Icons: Lucide React
Estilos: CSS puro (glassmorphism theme)
Estado Global: React Context API
Persistencia: localStorage
Sync Local: WebSocket (Node.js server)
Cloud Sync: Google Drive API + Firebase Firestore
```

### Patrón de Arquitectura

```
App.jsx (Router principal)
├── MainLayout.jsx (Layout con Sidebar)
│   ├── Sidebar.jsx (Navegación responsive)
│   └── [Páginas]
│       ├── POSPage.jsx (Ventas)
│       ├── TablesPage.jsx (Mesas)
│       ├── InventoryPage.jsx
│       ├── ProductsPage.jsx
│       ├── SuppliersPage.jsx
│       ├── PersonnelPage.jsx
│       ├── CashRegisterPage.jsx
│       ├── ReportsPage.jsx
│       └── SettingsPage.jsx
├── LoginPage.jsx (Autenticación por PIN)
└── Contextos
    ├── DataContext (Datos del negocio)
    ├── AuthContext (Autenticación)
    └── SettingsContext (Configuración UI)
```

---

## 📂 Estructura de Carpetas

```
src/
├── components/          # Componentes reutilizables
│   ├── Sidebar.jsx      # Navegación lateral/inferior
│   ├── CartSidebar.jsx  # Panel del carrito
│   ├── ProductCard.jsx  # Card de producto
│   ├── DataTable.jsx    # Tabla responsive
│   ├── Modal.jsx        # Modal genérico
│   ├── LoadingSpinner.jsx
│   └── ErrorBoundary.jsx
├── pages/               # Páginas principales
│   ├── POSPage.jsx      # Punto de venta
│   ├── TablesPage.jsx   # Gestión de mesas
│   ├── ProductsPage.jsx # CRUD productos
│   ├── InventoryPage.jsx # Gestión inventario
│   ├── etc...
├── context/             # Contextos de React
│   ├── DataContext.jsx  # ⭐ MÁS IMPORTANTE - Gestión de datos
│   ├── AuthContext.jsx  # Autenticación
│   └── SettingsContext.jsx # Config UI
├── services/            # Servicios externos
│   ├── firebase.js      # Firebase Sync
│   ├── googleDrive.js   # Google Drive API
│   └── localSync.js     # WebSocket local
├── data/
│   └── mockData.js      # Datos iniciales
├── styles/              # Estilos globales
│   ├── index.css        # Variables CSS
│   ├── glassmorphism.css # Tema glass
│   └── responsive.css   # Media queries
├── layouts/
│   └── MainLayout.jsx   # Layout principal
├── App.jsx              # Componente raíz
└── main.jsx             # Entry point
```

---

## 🧩 Componentes Principales

### 1. Sidebar.jsx

**Propósito:** Navegación principal responsive

**Comportamiento:**

- **Desktop:** Barra lateral expandible/colapsable
- **Mobile:** Barra inferior fija con overflow menu
- **Overflow:** Botón de 3 puntos (MoreVertical) para items adicionales

**Estados:**

- `isMobile`: Detecta si es móvil (≤768px)
- `isMobileMenuOpen`: Controla popup de overflow
- `isCollapsed`: Estado de sidebar (expandido/colapsado)

**Configuración:**

```javascript
const navItems = [ /* Rutas de navegación */ ];
const mobileVisibleCount = 5; // Primeros 5 visibles en móvil
```

---

### 2. CartSidebar.jsx

**Propósito:** Panel del carrito de compras

**Props:**

- `cart`: Array de productos
- `onAdd/onRemove`: Modificar cantidades
- `onClear`: Vaciar carrito
- `onPay`: Procesar pago
- `onHold`: Poner en espera
- `isExpanded`: Modo pantalla completa

**Funcionalidades:**

- Lista de productos con cantidad
- Cálculo de subtotal, impuestos, total
- Botones: Vaciar, Espera, Expandir, Pagar

---

### 3. POSPage.jsx

**Propósito:** Página principal de ventas

**Secciones:**

1. **Header:** Búsqueda + Categorías + Acciones
2. **Grid de Productos:** Cards clicables
3. **CartSidebar:** Carrito lateral/flotante
4. **Modal de Pago:** Procesar pagos (split, multi-moneda)
5. **Modal Órdenes en Espera**

**Flujo de venta:**

1. Seleccionar productos → Agregar al carrito
2. Click "PAGAR AHORA" → Modal de pago
3. Seleccionar método(s) de pago
4. Aplicar descuentos/propinas (opcional)
5. Confirmar → Registra venta en `data.sales`

**Características especiales:**

- Split payments (múltiples métodos en una venta)
- Soporte multi-moneda (USD, Bs)
- Descuentos por % o monto fijo
- Órdenes asociadas a mesas
- Crédito (fiado) con cliente

---

---

### 4. Gestión de Pedidos y Enrutamiento

#### Lógica de "En Espera" (Wait List)

- **Estricta Separación**: La lista "En Espera" en el POS (ícono de reloj) muestra **EXCLUSIVAMENTE** órdenes que fueron creadas usando el botón "Poner en Espera" (flag `isWaitList: true`).
- **Enrutamiento**: Las órdenes enviadas a producción NO aparecen en la lista de espera del POS.

#### Enrutamiento de Barra y Cocina

- **Barra**: Categorías "Bebidas", "Jugo", "Cafe", etc., van a `BarPage`.
- **Cocina**: Todo lo demás va a `KitchenPage`.
- **Info**: Incluye `customerName` y `createdBy`.

#### Gestión de Pedidos (OrdersPage)

- **Visibilidad Total**: Muestra TODAS las órdenes del sistema.
- **Interacción**: Clic para cargar en POS.

---

## 🌐 Contextos y Estado Global

### DataContext.jsx ⭐

**EL MÁS IMPORTANTE** - Gestiona TODOS los datos del sistema

**Datos manejados:**

```javascript
{
  products: [],        // Productos del menú
  inventory: [],       // Inventario
  sales: [],           // Historial ventas
  heldOrders: [],      // Órdenes en espera
  tables: [],          // Mesas
  suppliers: [],       // Proveedores
  personnel: [],       // Personal
  customers: [],       // Clientes
  kitchenOrders: [],   // Órdenes cocina
  tips: 0,             // Propinas acumuladas
  exchangeRate: 60,    // Tasa Bs/USD
  cashRegister: {},    // Estado caja
  // ... más
}
```

**Funciones principales:**

- `addItem(section, item)` - Agregar
- `updateItem(section, id, data)` - Actualizar
- `deleteItem(section, id)` - Eliminar
- `holdOrder(cart, note)` - Guardar orden
- `addTip(amount)` - Registrar propina
- `updateExchangeRate(rate)` - Actualizar tasa

**Ver archivo completo para documentación detallada de sincronización**

---

### AuthContext.jsx

**Propósito:** Autenticación con PIN

**Funciones:**

- `login(pin)` - Valida PIN (mock: 123456)
- `logout()` - Cierra sesión
- `currentUser` - Usuario actual

---

### SettingsContext.jsx

**Propósito:** Configuración de UI

**Settings:**

- `appName` - Nombre del negocio
- `currency` - Moneda
- `isSidebarCollapsed` - Estado sidebar
- `sidebarWidth` - Ancho sidebar desktop
- `logoColor1/2` - Colores del logo

---

## 🔄 Sistema de Sincronización

### 4 Capas de Persistencia

#### 1. localStorage (Inmediato)

- Guarda automáticamente cada cambio
- useEffect en DataContext
- Previene pérdida de datos

#### 2. Local Sync (WebSocket)

- Servidor Node.js en puerto 3001
- Sincroniza múltiples POS en red local
- Eventos en tiempo real
- Ideal para restaurantes con varios dispositivos

#### 3. Google Drive (Cloud)

- Auto-upload cada 3 segundos (debounced)
- Auto-download cada 15 segundos (polling)
- Archivo: `erp_la_autentica_backup_auto.json`
- Compara timestamps para evitar conflictos

#### 4. Firebase Firestore (Cloud)

- Sincroniza ventas
- Debounce 5 segundos
- Backup adicional

### Prevención de Conflictos

```javascript
// Compara timestamps antes de sobrescribir
if (remoteTime > localTime + 1000) {
  // Remote es más nuevo, sincronizar
  setData(remoteData);
}
```

---

## 🔄 Ciclo de Vida de Órdenes y Cancelaciones (IMPORTANTE)

**Reglas Estrictas de Cancelación:**

1. **Separación de Papeleras:**
    - 🗑️ **Papelera de Mesas (`TablesPage`):** EXCLUSIVA para órdenes de mesas canceladas. Se accede desde la gestión de mesas.
    - 🗑️ **Papelera de Espera (`POSPage`):** EXCLUSIVA para órdenes "En Espera" (Retail/Barra) que NO tienen mesa asignada.

2. **Lógica:**
    - Si cancelas una mesa (`tableId` existe) -> Va a `History/Mesas`.
    - Si cancelas una orden en espera personalizada (`!tableId`) -> Va a `History/Espera`.
    - **NO MEZCLAR VISUALMENTE.** El usuario odia ver órdenes de mesas mezcladas con órdenes de retail en la misma lista.

---

## 🔄 Flujos de Trabajo

### Flujo de Venta Normal

```
1. Usuario abre POSPage
2. Selecciona productos → onAdd() → cart
3. Click "PAGAR AHORA" → Modal de pago
4. Selecciona método(s) de pago
5. [Opcional] Aplica descuento/propina
6. Click "Confirmar"
7. handleFinalizePayment():
   - Crea objeto sale
   - addItem('sales', sale)
   - Vacía carrito
   - Cierra modal
8. DataContext guarda en localStorage
9. Sincroniza con Drive/Firebase
```

### Flujo de Mesa

```
1. Usuario en TablesPage
2. Click en mesa → Navega a POSPage?tableId=X
3. POSPage carga orden existente de esa mesa (si hay)
4. Agrega productos
5. Click "Poner en Espera"
6. holdOrder(cart, note, {tableId: X})
   - Crea heldOrder
   - Actualiza mesa status="occupied"
7. Orden queda guardada
8. Cuando cliente paga:
   - Recuperar orden
   - Procesar pago normal
   - deleteHeldOrder() → libera mesa
```

### Flujo de Propinas

```
1. Venta con propina → addTip(amount)
2. Se acumula en data.tips
3. Periódicamente: distributeTips()
   - Calcula % por salario de personal activo
   - Crea distribution snapshot
   - Resetea tips a 0
   - Guarda en tipDistributions[]
```

---

## 🎨 Estilos y Diseño

### Sistema de Diseño

**Tema:** Glassmorphism oscuro

**Variables CSS (index.css):**

```css
--bg-dark: #0a0e27
--bg-panel: rgba(255,255,255,0.05)
--accent-blue: #00f2ff
--accent-orange: #ff9d00
--accent-green: #00ff00
--glass-border: 1px solid rgba(255,255,255,0.1)
```

### Clases Reutilizables

- `.glass-panel` - Panel con efecto glass
- `.glass-button` - Botón glass
  - `.glass-button.primary` - Botón azul
  - `.glass-button.accent` - Botón naranja
- `.glass-input` - Input glass

### Responsive Design

**Breakpoints:**

- Desktop: >768px
- Mobile: ≤768px

**Mobile-first:**

- Sidebar → Barra inferior
- Cart → Drawer flotante
- Tables → Grid responsive

---

## ⚠️ Consideraciones Importantes

### 1. Gestión de IDs

```javascript
// Siempre usar timestamps para IDs únicos
const newItem = {
  id: Date.now(), // o window.crypto.randomUUID()
  ...
};
```

### 2. Prevención de Duplicados en Mock Data

```javascript
// DataContext usa isInitialized flag
// Si ya inicializado, NO cargar mockData
if (isInit && key !== 'isInitialized') {
  return []; // No usar fallback
}
```

### 3. Sincronización

```javascript
// Flag para evitar loops infinitos
const isRemoteUpdate = React.useRef(false);

// Al importar datos remotos:
isRemoteUpdate.current = true;
setData(remoteData);
// useEffect detecta flag y NO re-sube a Drive
```

### 4. Multi-Moneda

```javascript
// Siempre calcular en USD base
const amountUSD = currency === 'Bs' 
  ? amount / exchangeRate 
  : amount;
```

### 5. Accesibilidad Mobile

```javascript
// Usar touch-action para mejor UX
style={{ touchAction: 'manipulation' }}
```

---

## 🛠️ Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build producción
npm run build

# Preview build
npm run preview
```

---

## 📝 Notas para Futuras Sesiones

### Al Continuar el Proyecto

1. **Revisar DataContext.jsx** - Entender flujo de datos
2. **Verificar sincronización** - localStorage + Drive + Firebase
3. **Probar responsive** - Especialmente mobile
4. **Revisar comentarios** - Todo está documentado
5. **Mantener español** - Toda la UI está en español

### Archivos Críticos a Revisar

1. `src/context/DataContext.jsx` ⭐⭐⭐
2. `src/pages/POSPage.jsx` ⭐⭐
3. `src/components/Sidebar.jsx` ⭐
4. `src/components/CartSidebar.jsx` ⭐

---

## 📞 Contacto y Soporte

Este proyecto fue desarrollado para "La Auténtica" con soporte de IA.

**Última actualización:** 2025-12-26

---

**¡Buena suerte con el desarrollo! 🚀**
