#!/bash
# Script para capturar pantalla, copiar al portapapeles y abrir en ksnip
# Desarrollado para Xubuntu/Xfce

# 1. Tomar captura de pantalla completa (puedes cambiar -f por -r para seleccionar región)
# -f: pantalla completa
# -c: copiar al portapapeles
# -o ksnip: abrir con el editor ksnip
xfce4-screenshooter -f -c -o ksnip
