import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Get environment from EAS build or default to production
  const environment = process.env.APP_ENV || 'production';

  return {
    ...config,
    name: environment === 'production' ? 'PeeK' : `PeeK (${environment})`,
    slug: 'gps-tracker',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'geotracker',
    splash: {
      backgroundColor: '#0A0A0F',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: environment === 'production'
        ? 'com.martinfernandez.peektracker'
        : `com.martinfernandez.peektracker.${environment}`,
      infoPlist: {
        UIBackgroundModes: ['location', 'fetch'],
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'PeeK necesita acceso a tu ubicación para compartirla con tu grupo incluso cuando la app está en segundo plano.',
        NSLocationAlwaysUsageDescription:
          'PeeK necesita acceso a tu ubicación para compartirla con tu grupo incluso cuando la app está en segundo plano.',
        NSLocationWhenInUseUsageDescription:
          'PeeK necesita acceso a tu ubicación para mostrarte en el mapa.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: environment === 'production'
        ? 'com.peek.app'
        : `com.peek.app.${environment}`,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: environment === 'staging'
                ? 'cl-geo-tracker-staging.up.railway.app'
                : 'cl-geo-tracker-production.up.railway.app',
              pathPrefix: '/e/',
            },
            {
              scheme: 'https',
              host: environment === 'staging'
                ? 'cl-geo-tracker-staging.up.railway.app'
                : 'cl-geo-tracker-production.up.railway.app',
              pathPrefix: '/q/',
            },
            {
              scheme: 'geotracker',
              host: 'event',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      permissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.RECORD_AUDIO',
      ],
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'PeeK necesita acceso a tu ubicación para compartirla con tu grupo.',
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Permitir a PeeK acceder a tus fotos.',
          cameraPermission: 'Permitir a PeeK usar tu cámara.',
        },
      ],
    ],
    extra: {
      environment,
      eas: {
        projectId: 'e365a376-c27d-47b9-9855-ce053b6bffc8',
      },
    },
  };
};
