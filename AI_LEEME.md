# Documentación del Proyecto para IA (AI_LEEME.md)

Este documento sirve como punto de entrada para cualquier agente de IA que trabaje en este proyecto. Describe la arquitectura, el estado y las reglas críticas.

## 1. Visión General

**Sistemapos** es una aplicación de Punto de Venta (POS) construida, diseñada para funcionar principalmente offline con sincronización opcional a Google Drive.

### Stack Tecnológico

- **Framework:** React 19 (Vite)
- **Lenguaje:** JavaScript (JSX)
- **Estilos:** CSS Vainilla (`App.css`, `responsive.css`)
- **Iconos:** Lucide React
- **Router:** React Router Dom v7

## 2. Estructura de Directorios

- `/src/context`: **CRÍTICO**. Contiene la lógica de negocio y estado global.
  - `DataContext.jsx`: "Base de datos" en memoria. Maneja inventario, ventas, configuración y persistencia en `localStorage`.
  - `AuthContext.jsx`: Manejo de usuarios y permisos (Roles: admin, manager, cashier).
  - `SettingsContext.jsx`: Configuración de UI y sistema.
- `/src/pages`: Vistas principales (`POSPage`, `InventoryPage`, etc.).
- `/src/components`: Componentes reutilizables.
- `/src/services`: Integraciones externas (ej. `googleDrive.js`).

## 3. Lógica Crítica y "Trampas" Comunes

### DataContext y Persistencia

- Los datos se cargan desde `localStorage`.
- **FIX CRÍTICO (Inicialización):** Existe una lógica específica en `loadData` para evitar que los arrays vacíos (items borrados) sean reemplazados por `mockData` al recargar.
  - Si `isInitialized` es `true` en localStorage, NO se debe hacer fallback a datos de prueba.
- **Sincronización:** Hay lógica de "Auto-Sync" a Google Drive con debouncing.

### Estilos

- Se prefiere CSS puro sobre librerías de componentes.
- Mantener diseño "Glassmorphism" y estética moderna/oscura si no se indica lo contrario.

## 4. Instrucciones de Desarrollo

- **Comandos:**
  - `npm run dev`: Iniciar servidor de desarrollo.
  - `npm run build`: Construir para producción.
- **Reglas:**
  - Mantener las dependencias mínimas.
  - **Idioma:** Todo el código y comentarios nuevos deben estar alineados con el idioma del proyecto (Español/Inglés mixto actualmente, preferir Español para UI).

## 5. Estado Actual

- Implementando sistema de descuentos y comentarios.
- Refinando la Navbar (Material Design).
