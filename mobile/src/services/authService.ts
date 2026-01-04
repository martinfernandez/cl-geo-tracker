import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const TOKEN_REFRESH_KEY = 'last_token_refresh';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Auth state change listeners
type AuthStateListener = (isAuthenticated: boolean) => void;
const authStateListeners: AuthStateListener[] = [];

class AuthService {
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await api.post('/users/register', { email, password, name });
    await this.saveAuthData(response.data);
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post('/users/login', { email, password });
    await this.saveAuthData(response.data);
    return response.data;
  }

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, TOKEN_REFRESH_KEY]);
    this.notifyAuthStateChange(false);
  }

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_KEY);
  }

  async getUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  // Refresh the token - call this periodically to keep the session alive
  async refreshToken(): Promise<AuthResponse | null> {
    try {
      const currentToken = await this.getToken();
      if (!currentToken) {
        return null;
      }

      const response = await api.post('/users/refresh');
      await this.saveAuthData(response.data);
      await AsyncStorage.setItem(TOKEN_REFRESH_KEY, Date.now().toString());
      console.log('[AuthService] Token refreshed successfully');
      return response.data;
    } catch (error: any) {
      console.error('[AuthService] Token refresh failed:', error?.message);
      // If refresh fails with 401, the session is truly expired
      if (error?.response?.status === 401) {
        await this.logout();
      }
      return null;
    }
  }

  // Check if token needs refresh (refresh every 7 days)
  async shouldRefreshToken(): Promise<boolean> {
    const lastRefresh = await AsyncStorage.getItem(TOKEN_REFRESH_KEY);
    if (!lastRefresh) {
      return true;
    }
    const lastRefreshTime = parseInt(lastRefresh, 10);
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - lastRefreshTime > sevenDaysInMs;
  }

  // Called when auth state changes (e.g., 401 from API)
  notifyAuthStateChange(isAuthenticated: boolean): void {
    authStateListeners.forEach(listener => listener(isAuthenticated));
  }

  // Subscribe to auth state changes
  onAuthStateChange(listener: AuthStateListener): () => void {
    authStateListeners.push(listener);
    return () => {
      const index = authStateListeners.indexOf(listener);
      if (index > -1) {
        authStateListeners.splice(index, 1);
      }
    };
  }

  // Force logout - called by API interceptor on 401
  async forceLogout(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, TOKEN_REFRESH_KEY]);
    this.notifyAuthStateChange(false);
  }

  private async saveAuthData(data: AuthResponse): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    await AsyncStorage.setItem(TOKEN_REFRESH_KEY, Date.now().toString());
    this.notifyAuthStateChange(true);
  }
}

export default new AuthService();
