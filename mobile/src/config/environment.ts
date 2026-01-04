import Constants from 'expo-constants';

export type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  apiUrl: string;
  wsUrl: string;
  environment: Environment;
}

const ENV_CONFIGS: Record<Environment, EnvironmentConfig> = {
  development: {
    apiUrl: 'http://192.168.0.249:3000/api',
    wsUrl: 'ws://192.168.0.249:3000/ws',
    environment: 'development',
  },
  staging: {
    apiUrl: 'https://cl-geo-tracker-staging.up.railway.app/api',
    wsUrl: 'wss://cl-geo-tracker-staging.up.railway.app/ws',
    environment: 'staging',
  },
  production: {
    apiUrl: 'https://cl-geo-tracker-production.up.railway.app/api',
    wsUrl: 'wss://cl-geo-tracker-production.up.railway.app/ws',
    environment: 'production',
  },
};

function getEnvironment(): Environment {
  // Check for EAS build environment variable from app.config.ts
  const easEnv = Constants.expoConfig?.extra?.environment as Environment | undefined;

  if (easEnv && ENV_CONFIGS[easEnv]) {
    console.log(`[Environment] Using EAS environment: ${easEnv}`);
    return easEnv;
  }

  // Fallback: production for Railway
  const fallback: Environment = 'production';
  console.log(`[Environment] Using fallback: ${fallback}`);
  return fallback;
}

export const ENV = getEnvironment();
export const config = ENV_CONFIGS[ENV];

// Export individual values for convenience
export const API_URL = config.apiUrl;
export const WS_URL = config.wsUrl;
export const BASE_URL = config.apiUrl.replace('/api', '');
export const IS_DEV = ENV === 'development';
export const IS_STAGING = ENV === 'staging';
export const IS_PROD = ENV === 'production';
