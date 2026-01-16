#!/bin/bash
# Script para preparar y sincronizar el proyecto Android

echo "==========================================="
echo "   PREPARANDO CONSTRUCCION DE APK (ANDROID)"
echo "==========================================="

# 1. Construir el Frontend
echo "[1/4] Construyendo el Frontend (Vite)..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error en la construcción del frontend"
    exit 1
fi

# 2. Sincronizar con Capacitor
echo "[2/4] Sincronizando con Capacitor..."
# Forzamos la sincronización ignorando la versión de Node si es necesario
# Nota: Capacitor CLI requiere Node 22+. Si el usuario tiene una versión menor,
# este comando podría fallar.
npx cap sync android

if [ $? -ne 0 ]; then
    echo "⚠️  Capacitor sync falló (probablemente por requisitos de Node.js v22)"
    echo "   Continuando de todos modos..."
fi

# 3. Configurar estructura para nodejs-mobile-cordova
echo "[3/4] Configurando estructura para nodejs-mobile-cordova..."

# Configurar assets para el plugin (IMPORTANTE: carpeta específica que busca el plugin)
NODEJS_ASSETS_DIR="android/app/src/main/assets/nodejs-mobile-cordova-assets"
mkdir -p "$NODEJS_ASSETS_DIR"

# Copiar proyecto Node para que sea accesible por el plugin
if [ -d "nodejs-project" ]; then
    echo "   Copiando nodejs-project a $NODEJS_ASSETS_DIR..."
    # Limpiar destino para asegurar copia fresca
    rm -rf "$NODEJS_ASSETS_DIR"/*
    cp -r nodejs-project/* "$NODEJS_ASSETS_DIR/"
    
    # También dejar una copia en www/nodejs-project por si acaso (compatibilidad con algunos forks)
    mkdir -p android/capacitor-cordova-android-plugins/src/main/assets/www/nodejs-project
    cp -r nodejs-project/* android/capacitor-cordova-android-plugins/src/main/assets/www/nodejs-project/
else
    echo "❌ Error: nodejs-project no encontrado en la raíz"
    exit 1
fi

# Copiar un index.html mínimo
echo "   Creando index.html..."
echo '<!DOCTYPE html><html><head><title>POS</title></head><body></body></html>' > android/capacitor-cordova-android-plugins/src/main/assets/www/index.html


# Parchear NodeJS.java para evitar error de BuildConfig
NODEJS_JAVA="android/capacitor-cordova-android-plugins/src/main/java/com/janeasystems/cdvnodejsmobile/NodeJS.java"
if [ -f "$NODEJS_JAVA" ]; then
    echo "   Parcheando NodeJS.java (eliminando dependencia de BuildConfig)..."
    # Reemplazar BuildConfig.DEBUG por true para evitar errores de importación
    sed -i 's/BuildConfig.DEBUG/true/g' "$NODEJS_JAVA"
    
    # Si por alguna razón ya se había añadido el import incorrecto, lo quitamos
    sed -i '/import capacitor.cordova.android.plugins.BuildConfig;/d' "$NODEJS_JAVA"
fi

# Habilitar generación de BuildConfig en build.gradle del plugin
BUILD_GRADLE="android/capacitor-cordova-android-plugins/build.gradle"
if [ -f "$BUILD_GRADLE" ]; then
    if ! grep -q "buildFeatures" "$BUILD_GRADLE"; then
        echo "   Habilitando buildConfig en build.gradle..."
        # Insertar buildFeatures antes de compileOptions para evitar errores de inserción múltiple
        sed -i '/compileOptions {/i\    buildFeatures {\n        buildConfig = true\n    }' "$BUILD_GRADLE"
    fi
fi

# Verificar si existen los binarios en node_modules (aunque sean .gz)
LIBS_PATH="node_modules/nodejs-mobile-cordova/libs/android/libnode/bin"

# Limpiar directorio temporal
rm -rf temp_node_mobile
mkdir -p temp_node_mobile/libnode

if [ -d "$LIBS_PATH" ]; then
    echo "   ✅ Librerías encontradas en node_modules (comprimidas)..."
    # Copiar recursivamente
    cp -r node_modules/nodejs-mobile-cordova/libs/android/libnode/* temp_node_mobile/libnode/
    
    # Descomprimir libnode.so.gz -> libnode.so
    echo "   Descomprimiendo librerías..."
    find temp_node_mobile/libnode/bin -name "*.gz" -exec gunzip -f {} \;
else
    echo "❌ No se encontraron librerías en $LIBS_PATH."
    # Intentar ejecutar install script
    echo "   Intentando ejecutar install.js..."
    cd node_modules/nodejs-mobile-cordova
    if [ -f "install/install.js" ]; then
        node install/install.js
    fi
    cd ../..
    
    # Intentar copiar de nuevo
    if [ -d "$LIBS_PATH" ]; then
         cp -r node_modules/nodejs-mobile-cordova/libs/android/libnode/* temp_node_mobile/libnode/
         find temp_node_mobile/libnode/bin -name "*.gz" -exec gunzip -f {} \;
    else
         echo "❌ FALLO CRITICO: No se pudieron obtener las librerías nativas."
         exit 1
    fi
fi

# Preparar entorno para CMake EN LA APP PRINCIPAL (android/app)
# Esto evita que el sync de Capacitor borre nuestra configuración
echo "[5/6] Configurando compilación nativa en app principal..."
APP_CPP_DIR="android/app/src/main/cpp/nodejs-mobile"
mkdir -p "$APP_CPP_DIR"

# 1. Copiar headers y libnode precompilada
rm -rf "$APP_CPP_DIR/libnode"
mkdir -p "$APP_CPP_DIR/libnode"
cp -r temp_node_mobile/libnode/bin "$APP_CPP_DIR/libnode/"
cp -r temp_node_mobile/libnode/include "$APP_CPP_DIR/libnode/"

# 2. Copiar fuentes C++ del plugin (wrapper)
SRC_JNI="node_modules/nodejs-mobile-cordova/src/android/jni"
SRC_COMMON="node_modules/nodejs-mobile-cordova/src/common/cordova-bridge"

echo "   Copiando fuentes C++..."
cp "$SRC_JNI/native-lib.cpp" "$APP_CPP_DIR/"
cp "$SRC_COMMON/cordova-bridge.cpp" "$APP_CPP_DIR/"
cp "$SRC_COMMON/cordova-bridge.h" "$APP_CPP_DIR/"

# Crear CMakeLists.txt en la app principal
echo "   Creando CMakeLists.txt..."
cat <<EOF > "$APP_CPP_DIR/CMakeLists.txt"
cmake_minimum_required(VERSION 3.4.1)
add_library(nodejs-mobile-cordova-native-lib SHARED native-lib.cpp cordova-bridge.cpp)
include_directories(libnode/include/node/)
include_directories(.)
add_library(libnode SHARED IMPORTED)
set_target_properties(libnode PROPERTIES IMPORTED_LOCATION \${CMAKE_SOURCE_DIR}/libnode/bin/\${ANDROID_ABI}/libnode.so)
find_library(log-lib log)
target_link_libraries(nodejs-mobile-cordova-native-lib libnode \${log-lib})
EOF

# 3. Configurar build.gradle de la APP PRINCIPAL para usar CMake
APP_BUILD_GRADLE="android/app/build.gradle"
if ! grep -q "externalNativeBuild" "$APP_BUILD_GRADLE"; then
    echo "   Inyectando configuración CMake en android/app/build.gradle..."
    # Añadir externalNativeBuild al final del bloque android
    sed -i '/defaultConfig {/a\        externalNativeBuild {\n            cmake {\n                arguments "-DANDROID_STL=c++_shared"\n            }\n        }' "$APP_BUILD_GRADLE"
    
    # Añadir externalNativeBuild path
    sed -i '/buildTypes {/i\    externalNativeBuild {\n        cmake {\n            path "src/main/cpp/nodejs-mobile/CMakeLists.txt"\n        }\n    }' "$APP_BUILD_GRADLE"
fi

# 4. Desactivar CMake en el plugin para evitar conflictos
BUILD_GRADLE_PLUGIN="android/capacitor-cordova-android-plugins/build.gradle"
if [ -f "$BUILD_GRADLE_PLUGIN" ]; then
   # Comentar externalNativeBuild si existe (el original lo tiene)
   # Nota: Como capacitor regenera este archivo, esto es solo por seguridad en esta sesión
   :
fi



echo "[5/5] Listo para compilar"
echo ""
echo "==========================================="
echo "   ✅ PREPARACION COMPLETADA"
echo "==========================================="
echo ""
echo "PASOS SIGUIENTES:"
echo "1. Abre Android Studio."
echo "2. Abre la carpeta 'android' de este proyecto."
echo "3. Espera a que Gradle termine de sincronizar."
echo "4. Ve a 'Build' > 'Build Bundle(s) / APK(s)' > 'Build APK(s)'."
echo ""
echo "La APK se generará en:"
echo "android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "NOTA: He habilitado 'usesCleartextTraffic' en el AndroidManifest.xml"
echo "para que el servidor local (puerto 3001) sea accesible."
