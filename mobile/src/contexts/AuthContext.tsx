import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import authService, { User } from '../services/authService';
import { registerForPushNotifications } from '../services/pushNotifications';
import { wsService } from '../services/websocket';
import { stopNotificationPolling } from '../services/notificationPoller';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkAuth();

    // Listen for auth state changes (e.g., forced logout from 401)
    const unsubscribe = authService.onAuthStateChange((isAuthenticated) => {
      if (!isAuthenticated) {
        console.log('[AuthContext] Auth state changed to logged out');
        setUser(null);
        stopNotificationPolling();
        wsService.disconnect();
      }
    });

    // Listen for app state changes to refresh token when app comes to foreground
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up periodic token refresh (every 6 hours while app is active)
    startTokenRefreshInterval();

    return () => {
      unsubscribe();
      subscription.remove();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('[AuthContext] App came to foreground, checking token');
      await refreshTokenIfNeeded();
    }
    appState.current = nextAppState;
  };

  const startTokenRefreshInterval = () => {
    // Refresh token every 6 hours
    const sixHoursMs = 6 * 60 * 60 * 1000;
    refreshIntervalRef.current = setInterval(async () => {
      await refreshTokenIfNeeded();
    }, sixHoursMs);
  };

  const refreshTokenIfNeeded = async () => {
    try {
      const isAuth = await authService.isAuthenticated();
      if (!isAuth) return;

      const shouldRefresh = await authService.shouldRefreshToken();
      if (shouldRefresh) {
        console.log('[AuthContext] Refreshing token...');
        const result = await authService.refreshToken();
        if (result) {
          setUser(result.user);
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error refreshing token:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        const userData = await authService.getUser();
        setUser(userData);
        // Connect WebSocket after auth check
        if (userData?.id) {
          wsService.connect(userData.id).catch((err) => {
            console.error('WebSocket connection failed:', err);
          });
        }
        // Refresh token if needed on app start
        await refreshTokenIfNeeded();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    // Connect WebSocket after login
    if (response.user?.id) {
      wsService.connect(response.user.id).catch((err) => {
        console.error('WebSocket connection failed:', err);
      });
    }
    // Register for push notifications after successful login (non-blocking)
    registerForPushNotifications().catch((err) => {
      console.warn('Push notification registration failed:', err);
    });
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await authService.register(email, password, name);
    setUser(response.user);
    // Connect WebSocket after registration
    if (response.user?.id) {
      wsService.connect(response.user.id).catch((err) => {
        console.error('WebSocket connection failed:', err);
      });
    }
    // Register for push notifications after successful registration (non-blocking)
    registerForPushNotifications().catch((err) => {
      console.warn('Push notification registration failed:', err);
    });
  };

  const logout = async () => {
    // Stop notification polling before logout
    stopNotificationPolling();
    // Disconnect WebSocket before logout
    wsService.disconnect();
    await authService.logout();
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
