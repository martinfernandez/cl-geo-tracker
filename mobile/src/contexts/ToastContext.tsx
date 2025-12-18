import React, { createContext, useContext, useState, ReactNode } from 'react';
import Toast, { ToastType } from '../components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('info');
  const [toastDuration, setToastDuration] = useState(3000);

  const showToast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
    setToastMessage(message);
    setToastType(type);
    setToastDuration(duration);
    setToastVisible(true);
  };

  const showSuccess = (message: string, duration: number = 3000) => {
    showToast(message, 'success', duration);
  };

  const showError = (message: string, duration: number = 3000) => {
    showToast(message, 'error', duration);
  };

  const showInfo = (message: string, duration: number = 3000) => {
    showToast(message, 'info', duration);
  };

  const showWarning = (message: string, duration: number = 3000) => {
    showToast(message, 'warning', duration);
  };

  const handleHide = () => {
    setToastVisible(false);
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
      }}
    >
      {children}
      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={handleHide}
        duration={toastDuration}
      />
    </ToastContext.Provider>
  );
};
