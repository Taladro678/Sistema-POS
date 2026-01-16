#!/bin/bash

# Fix for nodejs-mobile-cordova in Capacitor
# Capacitor does not execute Cordova hooks that usually set up the native build environment.
# We manually create the expected structure.

PLUGIN_DIR="android/capacitor-cordova-android-plugins"
TARGET_DIR="$PLUGIN_DIR/libs/cdvnodejsmobile"
SOURCE_MODULE="node_modules/nodejs-mobile-cordova"

echo "🔧 Patching nodejs-mobile-cordova for Capacitor..."

# 1. Create target directory
mkdir -p "$TARGET_DIR"

# 2. Copy CMakeLists.txt
cp "$SOURCE_MODULE/src/android/CMakeLists.txt" "$TARGET_DIR/"

# 3. Copy source files (cpp) from jni/ to the root of cdvnodejsmobile (where CMake expects them)
cp "$SOURCE_MODULE/src/android/jni/"* "$TARGET_DIR/"

# 4. Copy prebuilt library (libnode)
# Ensure destination libnode dir exists
mkdir -p "$TARGET_DIR/libnode"
cp -r "$SOURCE_MODULE/libs/android/libnode/"* "$TARGET_DIR/libnode/"

echo "✅ Patch applied. 'libs/cdvnodejsmobile' structure created."
ls -F "$TARGET_DIR"
