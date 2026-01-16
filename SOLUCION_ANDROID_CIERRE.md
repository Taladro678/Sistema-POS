
# 📱 Solución: El Nodo se cierra al apagar la pantalla (Android)

Es un problema común en Android moderno debido al ahorro de batería ("Doze Mode"). Aunque hemos optimizado la app, algunos fabricantes (Xiaomi, Samsung, Huawei) son muy agresivos cerrando procesos en segundo plano.

## ✅ Pasos Obligatorios (Configuración del Teléfono)

Debes realizar esto en el dispositivo Android donde corre el servidor:

### 1. Desactivar Optimización de Batería (Doze)
1.  Ve a **Ajustes > Aplicaciones**.
2.  Busca **Sistema POS**.
3.  Toca en **Batería** u **Optimización de batería**.
4.  Selecciona **"Sin restricciones"** o **"No optimizar"**.

### 2. Bloquear la App en Recientes (Para Xiaomi/Huawei)
1.  Abre la app **Sistema POS**.
2.  Abre la vista de **Aplicaciones Recientes** (botón cuadrado o deslizar arriba).
3.  Mantén pulsada la app **Sistema POS**.
4.  Toca el **Candado 🔒** para que se quede fija.

### 3. Configuración Específica por Marca

*   **Samsung**: Ajustes > Mantenimiento dispositivo > Batería > Límites de uso en segundo plano > **Apps siempre activas** > Añadir Sistema POS.
*   **Xiaomi (MIUI/HyperOS)**:
    *   Ajustes > Batería > Ahorro de batería de aplicaciones > Sistema POS > **Sin restricciones**.
    *   Seguridad > Aumento de velocidad > Bloquear aplicaciones > Sistema POS.

---

## 🛠️ Solución Técnica (Requiere Re-compilar)

He aplicado los siguientes cambios en el código fuente para hacer el servidor "inmortal":

1.  **WifiLock Agresivo**: Ahora la app mantiene la antena WiFi encendida activamente (modo `high perf`) para evitar que el sistema corte la conexión de red al apagar la pantalla.
2.  **WakeLock CPU**: Se fuerza a la CPU a no "dormir" completamente mientras el servidor corre.
3.  **Notificación Persistente**: Servicio en primer plano configurado como `dataSync` (Android 14+ compatible).

### Para aplicar estos cambios:

1.  Conecta tu móvil al PC.
2.  Ejecuta de nuevo el script de compilación (o pide que lo haga):

```bash
./preparar_apk.sh
# Luego compila y ejecuta desde Android Studio
```
