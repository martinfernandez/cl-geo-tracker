# Guía de Testing en Dispositivos Reales

Esta guía te ayudará a instalar y probar la aplicación GPS Tracker en dispositivos físicos (iOS y Android).

## 📋 Requisitos Previos

- **Mac** con Xcode instalado (para iOS)
- **Android Studio** (para Android)
- **Dispositivos físicos** conectados a la misma red WiFi que tu Mac
- **Backend** corriendo en `http://192.168.0.69:3000`

## 🔧 Configuración Inicial

### 1. Backend - Verificar que esté accesible

El backend debe estar corriendo y accesible desde la red local:

```bash
cd /Users/martinfernandez/Work/Projects/claude-tracker/backend
npm run dev
```

Verifica que esté escuchando en: `http://192.168.0.69:3000`

### 2. Verificar Firewall (macOS)

Asegúrate de que el firewall permita conexiones entrantes al puerto 3000.

## 📱 Opción 1: Expo Go (Más Rápido para Testing)

### Para iOS y Android

1. **Instala Expo Go en tu dispositivo:**
   - iOS: App Store (busca "Expo Go")
   - Android: Google Play (busca "Expo Go")

2. **Conecta el dispositivo a la misma red WiFi que tu Mac**

3. **Inicia el servidor Expo:**
   ```bash
   cd /Users/martinfernandez/Work/Projects/claude-tracker/mobile
   npx expo start
   ```

4. **Escanea el QR code:**
   - **iOS**: Abre la cámara y escanea el QR
   - **Android**: Abre Expo Go y escanea el QR

### ⚠️ Limitaciones de Expo Go:
- No soporta todas las funcionalidades nativas
- Algunas notificaciones pueden no funcionar correctamente

## 📦 Opción 2: Development Build (Recomendado para Testing Completo)

### Para iOS

1. **Conecta tu iPhone con cable USB**

2. **Verifica los dispositivos disponibles:**
   ```bash
   cd /Users/martinfernandez/Work/Projects/claude-tracker/mobile
   xcrun xctrace list devices
   ```

3. **Instala en el dispositivo:**
   ```bash
   npx expo run:ios --device "Nombre del iPhone"
   ```

4. **Confía en el certificado de desarrollo:**
   - En el iPhone: Settings > General > VPN & Device Management
   - Toca en el perfil de desarrollo
   - Toca "Trust"

### Para Android

1. **Habilita el modo desarrollador en Android:**
   - Settings > About Phone
   - Toca "Build Number" 7 veces
   - Vuelve a Settings > Developer Options
   - Activa "USB Debugging"

2. **Conecta el dispositivo con USB**

3. **Verifica que esté conectado:**
   ```bash
   adb devices
   ```

4. **Instala en el dispositivo:**
   ```bash
   cd /Users/martinfernandez/Work/Projects/claude-tracker/mobile
   npx expo run:android --device
   ```

## 🧪 Testing de Funcionalidades

### 1. Registro e Inicio de Sesión
- Crear cuenta nueva
- Iniciar sesión
- Cerrar sesión

### 2. Dispositivos GPS
- Agregar dispositivo con IMEI real
- Ver dispositivo en el mapa
- Ver historial de posiciones
- Editar nombre del dispositivo
- Eliminar dispositivo

### 3. Eventos
- Crear evento de cada tipo (Robo, Extravío, Accidente, Incendio)
- Subir foto en evento
- Ver evento en el mapa
- Comentar en evento
- Dar like a evento
- Cerrar/Reabrir evento

### 4. Áreas de Interés
- Crear área pública
- Crear área privada
- Buscar áreas públicas
- Unirse a área
- Ver eventos del área

### 5. Notificaciones
- Notificación de evento cercano
- Notificación de solicitud de área
- Notificación de comentario
- Notificación de reacción

### 6. Mapa
- Zoom in/out
- Ver marcadores de eventos
- Ver círculos de áreas
- Tracking en tiempo real (si está habilitado)

## 📊 Agregar Dispositivos GPS Reales

### Opción A: Desde la App Móvil

1. Abre la app
2. Ve a "Dispositivos"
3. Toca el botón "+"
4. Ingresa el IMEI del dispositivo GPS real
5. Opcionalmente, dale un nombre descriptivo

### Opción B: Desde la Base de Datos (Prisma Studio)

1. **Abre Prisma Studio:**
   ```bash
   cd /Users/martinfernandez/Work/Projects/claude-tracker/backend
   npx prisma studio --port 5555
   ```

2. **Accede a:** http://localhost:5555

3. **Agrega dispositivos:**
   - Ve a la tabla Device
   - Click en "Add Record"
   - Completa:
     - imei: IMEI del dispositivo GPS real
     - name: Nombre descriptivo
     - userId: ID del usuario propietario

### Opción C: Usando API directamente

```bash
# Login primero para obtener token
curl -X POST http://192.168.0.69:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","password":"tupassword"}'

# Agregar dispositivo (reemplaza TOKEN con el token obtenido)
curl -X POST http://192.168.0.69:3000/api/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"imei":"123456789012345","name":"Mi GPS Real"}'
```

## 🔍 Simulación de Posiciones GPS

Para testing sin dispositivo GPS real, puedes insertar posiciones manualmente usando Prisma Studio o la API.

## 🐛 Troubleshooting

### App no conecta con el backend

1. Verifica que ambos estén en la misma red WiFi
2. Verifica que el backend esté corriendo:
   ```bash
   curl http://192.168.0.69:3000/api/health
   ```
3. Verifica la IP en mobile/src/services/api.ts (debe ser 192.168.0.69)

## 📝 Notas Importantes

- **IP Actual del Backend**: 192.168.0.69:3000
- Si cambias de red WiFi, necesitarás actualizar la IP en mobile/src/services/api.ts
- Para builds de producción, configura una URL pública estable
- Los dispositivos GPS reales deben enviar datos al endpoint: POST /api/positions

## 🚀 Flujo Recomendado para Testing

1. **Inicio**: Expo Go para testing rápido de UI/UX
2. **Intermedio**: Development Build para probar notificaciones
3. **Final**: Standalone Build para testing como usuario final
