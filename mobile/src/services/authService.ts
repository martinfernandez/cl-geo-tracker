import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

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
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
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

  private async saveAuthData(data: AuthResponse): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
}

export default new AuthService();
