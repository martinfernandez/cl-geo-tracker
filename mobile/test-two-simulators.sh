#!/bin/bash

# Script para abrir dos simuladores iOS para testing

echo "Abriendo primer simulador (iPhone 15 Pro)..."
xcrun simctl boot "iPhone 15 Pro" 2>/dev/null || echo "iPhone 15 Pro ya está corriendo"
open -a Simulator --args -CurrentDeviceUDID $(xcrun simctl list devices | grep "iPhone 15 Pro" | grep -v "unavailable" | head -1 | grep -E -o -i "([0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12})")

sleep 3

echo "Abriendo segundo simulador (iPhone 14)..."
xcrun simctl boot "iPhone 14" 2>/dev/null || echo "iPhone 14 ya está corriendo"
open -a Simulator --args -CurrentDeviceUDID $(xcrun simctl list devices | grep "iPhone 14" | grep -v "unavailable" | head -1 | grep -E -o -i "([0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12})")

echo ""
echo "Simuladores abiertos! Ahora:"
echo "1. Corre: npx expo start"
echo "2. Presiona 'i' para instalar en el primer simulador"
echo "3. Presiona 'shift+i' y selecciona el segundo simulador"
echo ""
echo "O simplemente presiona 'i' dos veces y selecciona diferentes simuladores"
