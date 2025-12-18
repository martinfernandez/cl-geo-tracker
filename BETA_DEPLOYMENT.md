# Guía de Deployment Beta - GPS Tracker

Esta guía cubre cómo generar builds instalables y distribuir la app en beta a usuarios de prueba.

## 📋 Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [EAS Build (Recomendado)](#eas-build-recomendado)
3. [TestFlight (iOS)](#testflight-ios)
4. [Google Play Internal Testing (Android)](#google-play-internal-testing-android)
5. [Distribución Ad-Hoc sin Stores](#distribución-ad-hoc-sin-stores)

---

## 🔧 Configuración Inicial

### 1. Instalar EAS CLI (Expo Application Services)

```bash
npm install -g eas-cli
```

### 2. Login en tu cuenta Expo

```bash
eas login
```

### 3. Configurar el proyecto

```bash
cd /Users/martinfernandez/Work/Projects/claude-tracker/mobile
eas build:configure
```

Esto creará un archivo `eas.json` con configuraciones de build.

### 4. Actualizar app.json con información de la app

Edita `/mobile/app.json`:

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
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.tuempresa.gpstracker",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.tuempresa.gpstracker",
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "TU_PROJECT_ID_AQUI"
      }
    }
  }
}
```

---

## 🚀 EAS Build (Recomendado)

EAS Build es el sistema de build cloud de Expo. Soporta builds nativos completos.

### Configuración de eas.json

Crea o edita `/mobile/eas.json`:

```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      },
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

### Build para Testing Interno (No requiere App Store)

#### iOS - Internal Distribution

```bash
cd /Users/martinfernandez/Work/Projects/claude-tracker/mobile

# Build para dispositivos iOS (no simulator)
eas build --platform ios --profile preview
```

Esto genera un archivo `.ipa` que puedes instalar directamente en dispositivos registrados.

#### Android - APK para Testing

```bash
# Build APK (instalable directamente)
eas build --platform android --profile preview
```

Esto genera un `.apk` que puedes compartir y instalar directamente.

### Build para Producción (App Stores)

#### iOS - Production Build

```bash
eas build --platform ios --profile production
```

#### Android - Production Build (AAB)

```bash
eas build --platform android --profile production
```

### Descargar e Instalar Builds

Después de cada build:

1. EAS te dará un link para descargar el archivo
2. **iOS (.ipa)**: Usa Apple Configurator 2 o Xcode para instalar en dispositivos
3. **Android (.apk)**: Descarga y abre en el dispositivo Android

---

## 🍎 TestFlight (iOS)

TestFlight es la plataforma oficial de Apple para beta testing.

### Requisitos Previos

1. **Apple Developer Account** ($99/año)
   - Regístrate en: https://developer.apple.com

2. **App Store Connect**
   - Accede a: https://appstoreconnect.apple.com
   - Crea una nueva app con el mismo Bundle ID de app.json

### Configuración

#### 1. Crear App Store API Key

1. Ve a App Store Connect → Users and Access → Keys
2. Crea una nueva key con rol "App Manager"
3. Descarga el archivo `.p8`
4. Guarda:
   - Key ID
   - Issuer ID
   - Archivo .p8

#### 2. Configurar EAS Submit

Crea `/mobile/credentials.json` (NO committear este archivo):

```json
{
  "ios": {
    "ascApiKeyPath": "./AuthKey_XXXXXX.p8",
    "ascApiKeyIssuerId": "tu-issuer-id",
    "ascApiKeyId": "tu-key-id"
  }
}
```

Actualiza `eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascApiKeyPath": "./AuthKey_XXXXXX.p8",
        "ascApiKeyIssuerId": "tu-issuer-id",
        "ascApiKeyId": "tu-key-id"
      }
    }
  }
}
```

#### 3. Build y Submit a TestFlight

```bash
# Build production
eas build --platform ios --profile production

# Submit a TestFlight
eas submit --platform ios
```

#### 4. Gestionar Beta Testers en TestFlight

1. Ve a App Store Connect → TestFlight
2. Agrega testers:
   - **Internal Testing**: Hasta 100 usuarios (miembros de tu equipo)
   - **External Testing**: Hasta 10,000 usuarios (requiere revisión de Apple)

3. Invita testers por email
4. Los testers instalan la app TestFlight y reciben la beta

---

## 🤖 Google Play Internal Testing (Android)

### Requisitos Previos

1. **Google Play Console Account** ($25 one-time fee)
   - Regístrate en: https://play.google.com/console

2. **Crear App en Google Play Console**
   - Crea nueva app con el mismo package name de app.json

### Configuración

#### 1. Crear Service Account Key

1. Ve a Google Cloud Console: https://console.cloud.google.com
2. Crea un proyecto (si no existe)
3. Habilita Google Play Android Developer API
4. Crea Service Account:
   - IAM & Admin → Service Accounts → Create
   - Descarga JSON key
5. En Play Console → Setup → API Access:
   - Link el service account
   - Otorga permisos de "Admin"

#### 2. Configurar EAS Submit

Actualiza `/mobile/credentials.json`:

```json
{
  "android": {
    "serviceAccountKeyPath": "./google-service-account.json"
  }
}
```

Actualiza `eas.json`:

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

#### 3. Build y Submit a Internal Testing

```bash
# Build production (AAB)
eas build --platform android --profile production

# Submit a Internal Testing track
eas submit --platform android
```

#### 4. Gestionar Testers

1. Ve a Play Console → Testing → Internal Testing
2. Crea una lista de testers (emails)
3. Comparte el link de opt-in con tus testers
4. Los testers pueden instalar desde Play Store

---

## 📦 Distribución Ad-Hoc sin Stores

Si quieres distribuir rápidamente sin pasar por las stores:

### iOS - Ad-Hoc Distribution

**Requisitos**:
- Apple Developer Account
- UDIDs de los dispositivos de prueba

**Pasos**:

1. **Registrar dispositivos en Apple Developer**:
   ```bash
   # Obtener UDID del dispositivo conectado
   xcrun xctrace list devices
   ```

2. **Registrar en Apple Developer Portal**:
   - Ve a Certificates, Identifiers & Profiles
   - Devices → Register New Device
   - Agrega el UDID

3. **Build con provisioning profile ad-hoc**:
   ```bash
   eas build --platform ios --profile preview
   ```

4. **Distribuir**:
   - Descarga el `.ipa`
   - Comparte por email/drive
   - Instala con Apple Configurator 2 o Xcode

### Android - APK Direct Distribution

**Muy simple**:

```bash
# Build APK
eas build --platform android --profile preview

# Descarga el APK
# Comparte por email/drive/link

# En el dispositivo Android:
# 1. Habilita "Install from unknown sources"
# 2. Descarga y abre el APK
# 3. Acepta la instalación
```

---

## 🔐 Variables de Entorno para Builds

### Configurar diferentes backends por ambiente

Actualiza `eas.json`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "env": {
        "API_URL": "http://192.168.0.69:3000"
      }
    },
    "production": {
      "env": {
        "API_URL": "https://api.tudominio.com"
      }
    }
  }
}
```

En tu código, usa:

```typescript
// mobile/src/config/api.ts
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.69:3000';
```

Y en `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": process.env.API_URL
    }
  }
}
```

---

## 📊 Comparación de Métodos

| Método | iOS | Android | Velocidad | Costo | Testers |
|--------|-----|---------|-----------|-------|---------|
| **EAS Preview** | ✅ | ✅ | Rápido | Gratis | Ilimitado* |
| **TestFlight** | ✅ | ❌ | Medio | $99/año | 10,000 |
| **Play Internal** | ❌ | ✅ | Rápido | $25 | Ilimitado |
| **Ad-Hoc (iOS)** | ✅ | ❌ | Rápido | $99/año | 100 devices |
| **APK Direct** | ❌ | ✅ | Muy rápido | Gratis | Ilimitado |

\* Con límites de build en plan gratuito de EAS

---

## 🎯 Recomendación para tu Caso

Para empezar rápido con testing beta:

### Fase 1: Testing Inmediato (Esta semana)

```bash
# Android - La más rápida
cd /Users/martinfernandez/Work/Projects/claude-tracker/mobile
eas build --platform android --profile preview

# Descarga el APK y compártelo con testers
# No requiere cuentas de developer
```

### Fase 2: Testing Profesional (Próximas semanas)

1. **Android**: Internal Testing en Play Console
2. **iOS**: TestFlight

### Fase 3: Producción

1. Configura dominio y SSL para backend
2. Deploy backend en servidor (Heroku, Railway, DigitalOcean)
3. Builds de producción con API_URL de producción
4. Submit a App Store y Google Play

---

## 🔄 Workflow Recomendado

```bash
# 1. Hacer cambios en el código
git add .
git commit -m "Feature: nueva funcionalidad"

# 2. Incrementar versión en app.json
# iOS: buildNumber
# Android: versionCode

# 3. Build para testing
eas build --platform all --profile preview

# 4. Descargar y distribuir a testers

# 5. Recoger feedback, iterar
```

---

## 📝 Checklist Pre-Build

Antes de tu primer build:

- [ ] Actualizar `app.json` con info correcta
- [ ] Crear iconos y splash screen
- [ ] Configurar permissions necesarios
- [ ] Decidir Bundle ID / Package Name definitivo
- [ ] Configurar variables de entorno
- [ ] Instalar EAS CLI: `npm install -g eas-cli`
- [ ] Login en EAS: `eas login`
- [ ] Configurar proyecto: `eas build:configure`

---

## 🚨 Troubleshooting

### Build falla en EAS

```bash
# Ver logs detallados
eas build --platform ios --profile preview --clear-cache

# Limpiar node_modules localmente
cd /Users/martinfernandez/Work/Projects/claude-tracker/mobile
rm -rf node_modules
npm install
```

### App crash al abrir

Verifica:
- Permisos en app.json (location, camera, etc)
- Variables de entorno correctas
- Backend accesible desde internet (para builds de producción)

### No puedo instalar en iPhone

- Verifica que el UDID esté registrado (ad-hoc)
- Confía en el certificado: Settings → General → VPN & Device Management

---

## 📞 Soporte

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- TestFlight: https://developer.apple.com/testflight/
- Google Play Console: https://support.google.com/googleplay/android-developer

---

## 🎬 Próximos Pasos

1. **Ejecutar**:
   ```bash
   cd /Users/martinfernandez/Work/Projects/claude-tracker/mobile
   eas build:configure
   eas build --platform android --profile preview
   ```

2. Esperar ~15-20 minutos por el build

3. Descargar APK desde el link que te da EAS

4. Compartir con testers

5. Recoger feedback y iterar
