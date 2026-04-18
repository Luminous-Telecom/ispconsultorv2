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

const MAX_STORED_ERRORS = 10;
const MAX_MESSAGE_LEN = 800;
const MAX_STACK_LEN = 4000;
const MAX_URL_LEN = 500;
const MAX_UA_LEN = 160;

/** Evita que stacks enormes encham o localStorage e quebrem outras chaves (ex.: tema). */
function narrowErrorForStorage(info: ErrorInfo): ErrorInfo {
  return {
    ...info,
    message: info.message.slice(0, MAX_MESSAGE_LEN),
    stack: info.stack?.slice(0, MAX_STACK_LEN),
    userAgent: info.userAgent.slice(0, MAX_UA_LEN),
    url: info.url.slice(0, MAX_URL_LEN),
  };
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
      existingErrors.push(narrowErrorForStorage(errorInfo));

      while (existingErrors.length > MAX_STORED_ERRORS) {
        existingErrors.shift();
      }

      localStorage.setItem('app_errors', JSON.stringify(existingErrors));
    } catch {
      try {
        localStorage.removeItem('app_errors');
        localStorage.setItem('app_errors', JSON.stringify([narrowErrorForStorage(errorInfo)]));
      } catch (second) {
        console.warn('Could not save error to localStorage:', second);
      }
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