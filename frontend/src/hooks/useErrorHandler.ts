import { useCallback } from 'react';

export interface ErrorInfo {
  message: string;
  stack?: string;
  component?: string;
  userId?: string;
  timestamp: Date;
  userAgent: string;
  url: string;
}

export const useErrorHandler = () => {
  const logError = useCallback((error: Error, componentName?: string) => {
    const errorInfo: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      component: componentName,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log para console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorInfo);
    }

    // Aqui você pode integrar com serviços de logging como Sentry, LogRocket, etc.
    // Exemplo:
    // if (process.env.NODE_ENV === 'production') {
    //   // Sentry.captureException(error, { extra: errorInfo });
    // }

    // Por enquanto, apenas armazena no localStorage para debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      existingErrors.push(errorInfo);

      // Mantém apenas os últimos 10 erros
      if (existingErrors.length > 10) {
        existingErrors.shift();
      }

      localStorage.setItem('app_errors', JSON.stringify(existingErrors));
    } catch (storageError) {
      console.warn('Could not save error to localStorage:', storageError);
    }
  }, []);

  const getStoredErrors = useCallback((): ErrorInfo[] => {
    try {
      return JSON.parse(localStorage.getItem('app_errors') || '[]');
    } catch {
      return [];
    }
  }, []);

  const clearStoredErrors = useCallback(() => {
    localStorage.removeItem('app_errors');
  }, []);

  const handleAsyncError = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    componentName?: string
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      logError(error as Error, componentName);
      return null;
    }
  }, [logError]);

  return {
    logError,
    getStoredErrors,
    clearStoredErrors,
    handleAsyncError,
  };
};