# Guía Completa de Deployment - GPS Tracker

Esta guía cubre todo el proceso de deployment desde subir el código a GitHub hasta tener la app funcionando en producción.

## 📋 Índice

1. [Repositorio Git](#1-repositorio-git)
2. [Deploy del Backend](#2-deploy-del-backend)
3. [Configurar App Móvil](#3-configurar-app-móvil)
4. [Generar Builds Beta](#4-generar-builds-beta)
5. [Distribución](#5-distribución)

---

## 1. Repositorio Git

### 1.1 Inicializar Git (si no está inicializado)

```bash
cd /Users/martinfernandez/Work/Projects/claude-tracker
git init
```

### 1.2 Crear .gitignore

Crear archivo `.gitignore` en la raíz:

```bash
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Misc
.DS_Store
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# Backend specific
backend/uploads/
backend/prisma/dev.db*
backend/.env

# Mobile specific
mobile/.expo/
mobile/.expo-shared/
mobile/dist/
mobile/ios/
mobile/android/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.cer
google-services.json
GoogleService-Info.plist

# Build files
*.apk
*.aab
*.ipa

# Temp files
*.tmp
*.temp
.cache/
```

### 1.3 Crear repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre: `gps-tracker` (o el que prefieras)
3. Descripción: "GPS Tracking App con eventos y áreas de interés"
4. **Private** (recomendado para apps en desarrollo)
5. No inicialices con README (ya tienes código)

### 1.4 Conectar y subir código

```bash
cd /Users/martinfernandez/Work/Projects/claude-tracker

# Agregar archivos
git add .

# Primer commit
git commit -m "Initial commit: GPS Tracker app with backend and mobile"

# Conectar con GitHub (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/gps-tracker.git

# Subir código
git branch -M main
git push -u origin main
```

---

## 2. Deploy del Backend

Vamos a usar **Railway** (gratis para empezar, fácil de configurar).

### 2.1 Preparar Backend para Producción

#### Crear archivo `.env.example`

```bash
cd /Users/martinfernandez/Work/Projects/claude-tracker/backend
```

Crear `backend/.env.example`:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
JWT_SECRET="your-super-secret-jwt-key-change-this"
PORT=3000
NODE_ENV=production
```

#### Actualizar package.json

Verificar que `backend/package.json` tenga:

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "dev": "tsx watch src/server.ts",
    "postinstall": "prisma generate"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 2.2 Deploy en Railway

#### Opción A: Desde GitHub (Recomendado)

1. **Ir a Railway**: https://railway.app
2. **Sign up** con GitHub
3. **New Project** → **Deploy from GitHub repo**
4. Seleccionar tu repositorio `gps-tracker`
5. Railway detectará automáticamente el backend

#### Configurar Variables de Entorno

En Railway, ir a tu proyecto → Variables:

```
DATABASE_URL=postgresql://... (Railway provee esto automáticamente)
JWT_SECRET=un-secret-super-seguro-cambialo-123
PORT=3000
NODE_ENV=production
```

#### Configurar el Build

En Railway → Settings:

- **Root Directory**: `backend`
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npm start`

#### Ejecutar Migraciones

En Railway → Deploy logs, después del primer deploy:

```bash
npx prisma migrate deploy
```

O desde tu máquina local:

```bash
# Usar la DATABASE_URL de Railway
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### 2.3 Alternativa: Deploy en Render.com

1. Ir a https://render.com
2. **New** → **Web Service**
3. Conectar GitHub repo
4. Configurar:
   - **Name**: gps-tracker-api
   - **Root Directory**: backend
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**: Agregar las mismas de arriba

### 2.4 Obtener URL del Backend

Una vez deployed, obtendrás una URL tipo:
- Railway: `https://gps-tracker-production.up.railway.app`
- Render: `https://gps-tracker-api.onrender.com`

**Guarda esta URL**, la necesitarás para la app móvil.

---

## 3. Configurar App Móvil

### 3.1 Actualizar API URL

Editar `mobile/src/services/api.ts`:

```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANTE: Reemplazar con tu URL de producción
const API_URL = __DEV__
  ? 'http://192.168.0.69:3000'  // Desarrollo local
  : 'https://tu-backend.railway.app';  // Producción

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ... resto del código
```

### 3.2 Configurar app.json

Actualizar `mobile/app.json`:

```json
{
  "expo": {
    "name": "GPS Tracker",
    "slug": "gps-tracker",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.gpstracker.app",
      "buildNumber": "1",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "GPS Tracker necesita tu ubicación para mostrar eventos cercanos",
        "NSLocationAlwaysUsageDescription": "GPS Tracker necesita tu ubicación para rastrear dispositivos",
        "NSCameraUsageDescription": "GPS Tracker necesita acceso a la cámara para tomar fotos de eventos",
        "NSPhotoLibraryUsageDescription": "GPS Tracker necesita acceso a tus fotos para seleccionar imágenes"
      }
    },
    "android": {
      "package": "com.gpstracker.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "GPS Tracker necesita tu ubicación"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "GPS Tracker necesita acceso a tus fotos",
          "cameraPermission": "GPS Tracker necesita acceso a tu cámara"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "SERA_GENERADO_AUTOMATICAMENTE"
      }
    }
  }
}
```

---

## 4. Generar Builds Beta

### 4.1 Instalar y Configurar EAS

```bash
cd /Users/martinfernandez/Work/Projects/claude-tracker/mobile

# Login en Expo
eas login

# Configurar proyecto
eas build:configure
```

Esto creará `eas.json` automáticamente.

### 4.2 Configurar eas.json

El archivo `eas.json` debe verse así:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 4.3 Generar Build Android (APK para testing)

```bash
cd /Users/martinfernandez/Work/Projects/claude-tracker/mobile

# Build APK para distribución directa
eas build --platform android --profile preview
```

**Esto tomará 10-15 minutos**. EAS te dará un link para descargar el APK cuando termine.

### 4.4 Generar Build iOS (para TestFlight)

#### Requisitos previos:
- Apple Developer Account ($99/año)
- Estar logueado en Apple Developer

```bash
# Build para iOS
eas build --platform ios --profile production
```

### 4.5 Generar ambos en paralelo

```bash
# Build para ambas plataformas
eas build --platform all --profile preview
```

---

## 5. Distribución

### 5.1 Android - Distribución Directa (Más Rápido)

1. **Descargar APK** del link que te dio EAS
2. **Compartir** el APK por:
   - Email
   - Google Drive
   - Dropbox
   - WhatsApp
   - Telegram

3. **Instalación en dispositivos**:
   - Descargar el APK
   - Abrir el archivo
   - Permitir "Instalar desde fuentes desconocidas"
   - Instalar

### 5.2 Android - Google Play Internal Testing (Más Profesional)

#### Requisitos:
- Google Play Console account ($25 one-time)

#### Pasos:

1. **Crear app en Play Console**:
   - Ir a https://play.google.com/console
   - Create app
   - Completar información básica

2. **Build AAB** (en lugar de APK):
   ```bash
   eas build --platform android --profile production
   ```

3. **Subir a Internal Testing**:
   - Play Console → Testing → Internal testing
   - Create new release
   - Upload AAB
   - Add release notes
   - Review & rollout

4. **Invitar testers**:
   - Create email list
   - Share opt-in link

### 5.3 iOS - TestFlight

#### Requisitos:
- Apple Developer Account ($99/año)

#### Pasos:

1. **Generar App Store Connect API Key**:
   - https://appstoreconnect.apple.com
   - Users and Access → Keys → Generate API Key
   - Descargar `.p8` file

2. **Configurar en EAS**:
   ```bash
   eas credentials
   ```

3. **Build y submit**:
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

4. **Gestionar en TestFlight**:
   - App Store Connect → TestFlight
   - Add internal/external testers
   - Send invitations

---

## 6. Variables de Entorno por Ambiente

### 6.1 Configurar múltiples ambientes

Actualizar `eas.json`:

```json
{
  "build": {
    "development": {
      "env": {
        "API_URL": "http://192.168.0.69:3000"
      }
    },
    "preview": {
      "env": {
        "API_URL": "https://tu-backend-staging.railway.app"
      }
    },
    "production": {
      "env": {
        "API_URL": "https://tu-backend.railway.app"
      }
    }
  }
}
```

### 6.2 Usar en el código

```typescript
// mobile/src/config/constants.ts
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
```

---

## 7. Checklist Pre-Deploy

### Backend:
- [ ] Variables de entorno configuradas
- [ ] Base de datos PostgreSQL creada
- [ ] Migraciones ejecutadas
- [ ] Backend accesible desde internet
- [ ] Health endpoint funcionando: `GET /api/health`

### Mobile:
- [ ] API_URL apuntando al backend de producción
- [ ] Bundle identifier/package name únicos
- [ ] Iconos y splash screen configurados
- [ ] Permisos declarados correctamente
- [ ] Builds generados exitosamente

### Testing:
- [ ] Backend responde correctamente desde internet
- [ ] App puede registrar usuarios
- [ ] App puede crear eventos
- [ ] Notificaciones funcionan
- [ ] Mapa carga correctamente

---

## 8. Comandos Rápidos

### Deploy Backend (Railway)
```bash
git add .
git commit -m "Update backend"
git push origin main
# Railway auto-deploys
```

### Generar nueva versión de la app
```bash
cd mobile

# Incrementar version en app.json
# Android: versionCode++
# iOS: buildNumber++

# Generar builds
eas build --platform all --profile preview
```

### Ver logs del backend
```bash
# Railway
railway logs

# Render
# Ver en dashboard web
```

---

## 9. Troubleshooting

### Backend no responde
- Verificar variables de entorno
- Ver logs en Railway/Render
- Verificar que migraciones corrieron

### Build falla
```bash
# Limpiar cache
eas build --platform android --profile preview --clear-cache

# Ver logs detallados
eas build:list
```

### App no conecta con backend
- Verificar URL en api.ts
- Verificar que backend esté accesible desde internet
- Probar endpoint con curl:
  ```bash
  curl https://tu-backend.railway.app/api/health
  ```

---

## 10. Costos Estimados

| Servicio | Costo | Notas |
|----------|-------|-------|
| **Railway** | Gratis → $5/mes | 500 horas gratis/mes, luego $5 |
| **Render** | Gratis → $7/mes | Free tier con limitaciones |
| **EAS Build** | Gratis → $29/mes | 30 builds/mes gratis |
| **Google Play** | $25 | One-time fee |
| **Apple Developer** | $99/año | Requerido para iOS |

**Recomendación para empezar**: Railway Free + EAS Free + APK directo = $0

---

## 11. Próximos Pasos Después del Deploy

1. **Monitoreo**: Configurar Sentry para error tracking
2. **Analytics**: Configurar Google Analytics/Mixpanel
3. **CI/CD**: Automatizar builds con GitHub Actions
4. **Testing**: Configurar tests automáticos
5. **Dominio**: Comprar dominio personalizado para el backend

---

## 12. Recursos

- **Expo EAS Docs**: https://docs.expo.dev/build/introduction/
- **Railway Docs**: https://docs.railway.app/
- **Render Docs**: https://render.com/docs
- **Play Console**: https://play.google.com/console
- **App Store Connect**: https://appstoreconnect.apple.com

---

¿Listo para empezar? El siguiente paso es:

1. **Subir código a GitHub**
2. **Deploy backend en Railway**
3. **Actualizar API_URL en la app**
4. **Generar primer build con EAS**
