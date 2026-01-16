# 📱 Guía de Compilación para Android (Sistema POS)

Esta guía detalla el proceso para compilar la aplicación Android con el servidor Node.js integrado, utilizando el script de automatización `preparar_apk.sh`.

## 📋 Requisitos Previos

1.  **Entorno Linux/Mac** (para ejecutar el script bash) o WSL en Windows.
2.  **Java JDK 21** instalado (`sudo apt install openjdk-21-jdk`).
3.  **Android Studio** instalado y configurado.
4.  **Node.js 22+** (Requisito de Capacitor 7).

## 🚀 Pasos para Generar el APK

Hemos automatizado todo el proceso tedioso de mover carpetas, copiar librerías nativas `libnode.so` y parchear archivos Gradle en un solo script.

### 1. Ejecutar el Script de Preparación

Desde la raíz del proyecto:

```bash
# Dar permisos de ejecución (solo la primera vez)
chmod +x preparar_apk.sh

# Ejecutar script
./preparar_apk.sh
```

**Este script realiza automáticamente:**
*   Compila el Frontend (`npm run build`).
*   Sincroniza con Capacitor (`npx cap sync android`).
*   **Copia el proyecto Node.js** a los assets del APK (`android/app/src/main/assets/nodejs-mobile-cordova-assets`).
*   **Copia las librerías nativas** (libnode.so) y configura **CMake** para compilar el puente nativo.
*   **Parchea `build.gradle`** y `NodeJS.java` para evitar errores de compilación comunes.

### 2. Compilar en Android Studio

1.  Abre **Android Studio**.
2.  Abre la carpeta `android/` de este proyecto.
3.  Ve a **File > Sync Project with Gradle Files**.
4.  Ve a **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
    *   O simplemente dale al botón **Run** (▶️) si tienes un dispositivo conectado.

### 3. Solución de Problemas Comunes

*   **"Offline" / Servidor no conecta:**
    *   Asegúrate de desinstalar la app antigua antes de instalar la nueva para limpiar caché.
    *   El servidor tarda unos 5-10 segundos en iniciar la primera vez.
    *   Revisa el Logcat filtrando por `NodeJS-MOBILE` o `server/index.mjs`.

*   **Error "FileNotFoundException: nodejs-mobile-cordova-assets":**
    *   Significa que no se ejecutó `./preparar_apk.sh`. Ejecútalo de nuevo.

*   **Error "UnsatisfiedLinkError":**
    *   El script `./preparar_apk.sh` no copió bien las librerías `.so`. Verifica que la carpeta `android/app/src/main/cpp/libnode/bin` tenga archivos.

---

## 🛠️ Detalles Técnicos (Para Desarrolladores)

*   **Servidor Node:** Se encuentra en `nodejs-project/`. Usa **ESM** (`.mjs`).
*   **Puerto:** El servidor escucha en el puerto `3001` (HTTP).
*   **Puente Nativo:** Se deshabilitó `cordova-bridge` en `main.js` por estabilidad. La comunicación es vía `socket.io` estándar.
*   **Logs:** Los logs del servidor Node.js salen en el **Logcat** de Android bajo el tag `NODEJS-MOBILE` o `System.out`.
