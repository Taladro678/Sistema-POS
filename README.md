# 🍽️ Sistema POS "La Auténtica"

Sistema de Punto de Venta completo para restaurantes con gestión de cocina, barra, mesas y sincronización en tiempo real.

## 🚀 Características Principales

### 💰 Punto de Venta

- Carrito de compras intuitivo
- Soporte multi-moneda (Bs/USD)
- Sistema de descuentos y propinas
- Órdenes para llevar (takeaway)
- Gestión de clientes

### 🍳 Gestión de Cocina y Barra

- **Órdenes separadas**: Cocina y Barra reciben solo sus items
- **Estados de preparación**: Pendiente → En Preparación → Listo
- **Órdenes canceladas**: Sistema de cancelación con opción de restaurar
- **Prioridades**: Alta, Normal (con alertas visuales)
- **Notificaciones sonoras** al recibir nuevas órdenes
- **UI responsive** optimizada para tablets y móviles

### 🪑 Gestión de Mesas y Pedidos

- Vista de "Gestión de Pedidos" con todos los pedidos activos
- Tabs: **Mesas** y **Todos los Pedidos**
- Filtrado por área (Restaurante, Quesera, Patio)
- Click en pedido para editar en POS
- Tracking de quién creó/modificó cada pedido
- Estados: Disponible, Ocupada, Reservada

### 📦 Inventario y Productos

- CRUD completo de productos
- Control de stock con alertas
- Categorías personalizables
- Gestión de proveedores
- Actualización masiva de precios/stock

### 👥 Personal y Acceso

- Sistema de autenticación con usuario/contraseña
- Roles: Admin, Manager, Cajero, Cocina, Barra, Mesero
- Permisos granulares por rol
- Credenciales por defecto:
  - Admin: `admin` / `123`
  - Cajero: `cajero` / `123`
  - Cocina: `cocina` / `123`
  - Barra: `barra` / `123`

### 💵 Control de Caja

- Apertura/cierre de caja
- Registro de retiros
- Balance en Bs y USD
- Historial de transacciones
- Tipo de cambio configurable

### 📊 Reportes

- Ventas por período
- Productos más vendidos
- Análisis de propinas
- Exportación de datos

### 🔄 Sincronización

- **LocalStorage**: Persistencia local
- **WebSocket**: Sincronización en tiempo real (red local)
- **Firebase**: Respaldo en la nube (opcional)
- **Google Drive**: Backup automático (opcional)

## 🛠️ Tecnologías

- **Frontend**: React 18 + Vite
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Estilos**: CSS puro con glassmorphism
- **Estado**: React Context API
- **Backend**: Node.js + Express + Socket.io (para sync local)

## 📥 Instalación

### Requisitos

- Node.js 16+
- npm o yarn

### Pasos

1. **Clonar el repositorio**

```bash
git clone https://github.com/tu-usuario/sistemapos.git
cd sistemapos
```

1. **Instalar dependencias**

```bash
npm install
```

1. **Iniciar el servidor de sincronización (opcional)**

```bash
node server/index.js
```

1. **Iniciar la aplicación**

```bash
npm run dev
```

O usar el script automatizado:

```bash
.\iniciar_app.bat
```

La aplicación estará disponible en `http://localhost:5173`

## 📱 Uso en Dispositivos Móviles

El sistema está optimizado para tablets y móviles:

- **Navegación inferior** en móvil
- **Grid responsive** en todas las vistas
- **Tarjetas compactas** en cocina/barra
- **Touch-friendly** buttons y controles

Para acceder desde otro dispositivo en la misma red:

1. Inicia el servidor con `iniciar_app.bat`
2. Busca la IP mostrada en consola
3. Accede desde el dispositivo móvil: `http://[IP]:5173`

## 🔧 Configuración

### Tipo de Cambio

Configurable desde **Configuración** → Tipo de Cambio

### Áreas de Mesas

Editable en **Gestión de Pedidos** → Agregar/Editar Mesa

### Categorías

Gestión completa en **Categorías**

## 📋 Flujo de Trabajo

### Orden de Mesa

1. Seleccionar mesa en POS
2. Agregar productos al carrito
3. **Enviar a Cocina/Barra** → Se divide automáticamente
4. Cocina/Barra marcan como "Listo"
5. Aparece en "Gestión de Pedidos" como LISTO
6. Procesar pago desde POS

### Orden Rápida (Retail)

1. Agregar productos sin seleccionar mesa
2. Opción "Para Llevar"
3. **Enviar a Cocina/Barra** o pagar directamente

### Cancelación de Órdenes

1. En Cocina/Barra: Click en "Cancelar"
2. La orden va a tab "Canceladas"
3. Se puede restaurar si fue error

## 🎨 Personalización

### Colores

Editar variables CSS en `src/index.css`:

```css
--accent-blue: #007acc;
--accent-green: #4ec9b0;
--accent-red: #f14c4c;
```

### Logo

Cambiar en **Configuración** → Nombre del Negocio

## 🐛 Solución de Problemas

### La sincronización no funciona

- Verificar que el servidor esté corriendo (`node server/index.js`)
- Revisar firewall/antivirus
- Confirmar que todos los dispositivos estén en la misma red

### Los cambios no se guardan

- Verificar permisos de localStorage en el navegador
- Limpiar caché si es necesario

### UI se ve cortada en móvil

- Actualizar a la última versión
- Limpiar caché del navegador
- Verificar que el viewport esté configurado correctamente

## 📄 Licencia

Este proyecto es privado y de uso exclusivo para "La Auténtica".

## 🤝 Soporte

Para soporte técnico o consultas, contactar al desarrollador.

---

**Última actualización**: Diciembre 2025
**Versión**: 2.0.0
