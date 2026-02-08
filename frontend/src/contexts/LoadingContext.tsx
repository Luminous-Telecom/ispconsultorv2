import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  /** Mantém a barra de loading no topo ativa (ex.: extração de PDF em background). */
  setExtractionLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiLoading, setApiLoading] = useState(false);
  const [extractionLoading, setExtractionLoadingState] = useState(false);

  const setLoading = useCallback((loading: boolean) => {
    setApiLoading(loading);
  }, []);

  const setExtractionLoading = useCallback((loading: boolean) => {
    setExtractionLoadingState(loading);
  }, []);

  const isLoading = apiLoading || extractionLoading;

  const value = useMemo(
    () => ({ isLoading, setLoading, setExtractionLoading }),
    [isLoading, setLoading, setExtractionLoading]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

