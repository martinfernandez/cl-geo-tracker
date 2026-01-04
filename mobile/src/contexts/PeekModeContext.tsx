import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PEEK_MODE_KEY = 'peek_mode_enabled';

interface PeekModeContextType {
  isPeekMode: boolean;
  togglePeekMode: () => void;
  setPeekMode: (enabled: boolean) => void;
  isLoading: boolean;
}

const PeekModeContext = createContext<PeekModeContextType | undefined>(undefined);

export const PeekModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPeekMode, setIsPeekMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPeekMode();
  }, []);

  const loadPeekMode = async () => {
    try {
      const stored = await AsyncStorage.getItem(PEEK_MODE_KEY);
      if (stored !== null) {
        setIsPeekMode(stored === 'true');
      }
    } catch (error) {
      console.error('Error loading peek mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setPeekMode = useCallback(async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(PEEK_MODE_KEY, enabled.toString());
      setIsPeekMode(enabled);
    } catch (error) {
      console.error('Error saving peek mode:', error);
    }
  }, []);

  const togglePeekMode = useCallback(() => {
    setPeekMode(!isPeekMode);
  }, [isPeekMode, setPeekMode]);

  return (
    <PeekModeContext.Provider
      value={{
        isPeekMode,
        togglePeekMode,
        setPeekMode,
        isLoading,
      }}
    >
      {children}
    </PeekModeContext.Provider>
  );
};

export const usePeekMode = () => {
  const context = useContext(PeekModeContext);
  if (!context) {
    throw new Error('usePeekMode must be used within PeekModeProvider');
  }
  return context;
};
