#!/bin/bash
apk_name="SistemaPOS_v1.2.0_NewIcon.apk"
package_name="com.sistemapos.app"

echo "==========================================="
echo "   📲 INSTALADOR ADB SISTEMA POS"
echo "   APK: $apk_name"
echo "==========================================="

# Verificar ADB
if ! command -v adb &> /dev/null; then
    echo "❌ Error: ADB no está instalado o no está en el PATH."
    echo "Instálalo con: sudo apt install adb"
    exit 1
fi

# Verificar Dispositivo
echo "🔍 Buscando dispositivo Android..."
device_count=$(adb devices | grep -w "device" | wc -l)

if [ "$device_count" -eq 0 ]; then
    echo "❌ No se detectó ningún dispositivo conectado."
    echo "Asegúrate de:"
    echo "1. Conectar tu móvil por USB."
    echo "2. Activar la 'Depuración USB' en Opciones de Desarrollador."
    exit 1
fi

echo "✅ Dispositivo detectado."

# Desinstalar versión anterior (Opcional, pero recomendado para actualizaciones mayores)
# echo "🗑️ Limpiando versión anterior (para evitar conflictos de firma)..."
# adb uninstall $package_name

# Instalar
echo "📦 Instalando APK (manteniendo datos)..."
adb install -r "$apk_name"

if [ $? -eq 0 ]; then
    echo "==========================================="
    echo "   ✅ INSTALACION COMPLETADA EXITOSAMENTE"
    echo "==========================================="
    echo "Ahora:"
    echo "1. Abre la app en el móvil."
    echo "2. Sigue los pasos de configuración de batería (SOLUCION_ANDROID_CIERRE.md)."
else
    echo "❌ Falló la instalación."
fi
