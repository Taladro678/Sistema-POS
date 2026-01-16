#!/bin/bash
apk_name="SistemaPOS_v2.0_AutoUpdate.apk"

echo "==========================================="
echo "   📲 INSTALADOR v2.0 (AUTO-UPDATE)"
echo "   APK: $apk_name"
echo "==========================================="

if ! command -v adb &> /dev/null; then
    echo "❌ Error: ADB no está instalado."
    exit 1
fi

device_count=$(adb devices | grep -w "device" | wc -l)

if [ "$device_count" -eq 0 ]; then
    echo "❌ Conecta tu móvil por USB."
    exit 1
fi

echo "📦 Instalando versión final con Auto-Update..."
adb install -r "$apk_name"

if [ $? -eq 0 ]; then
    echo "✅ INSTALADO. A partir de ahora, la app se actualizará sola."
    echo "⚠️ REQUISITO: Sube los cambios a GitHub releases o mantén el repositorio actualizado."
else
    echo "❌ Error de instalación."
fi
