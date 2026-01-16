#!/bin/bash
apk_name="SistemaPOS_v1.2.1_SafeSync.apk"
package_name="com.sistemapos.app"

echo "==========================================="
echo "   📲 INSTALADOR SEGURO (DATA FIX)"
echo "   APK: $apk_name"
echo "==========================================="

if ! command -v adb &> /dev/null; then
    echo "❌ Error: ADB no está instalado."
    exit 1
fi

device_count=$(adb devices | grep -w "device" | wc -l)

if [ "$device_count" -eq 0 ]; then
    echo "❌ Conecta tu móvil por USB para instalar."
    exit 1
fi

echo "📦 Instalando actualización crítica..."
adb install -r "$apk_name"

if [ $? -eq 0 ]; then
    echo "✅ INSTALADO. Esta versión protege tus datos."
else
    echo "❌ Error de instalación."
fi
