import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { saasAuthService, type SaasCurrentUser } from '../services/saas/saasAuthService';

interface SaasAuthContextValue {
  currentUser: SaasCurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; precisaTrocarSenha?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const SaasAuthContext = createContext<SaasAuthContextValue | null>(null);

export const SaasAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SaasCurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!saasAuthService.isAuthenticated()) {
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const response = await saasAuthService.getCurrentUser();
      if (response.success && response.data) {
        setCurrentUser(response.data);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await saasAuthService.login({ email, password });
    if (response.success && response.data) {
      setCurrentUser(response.data.user);
      return {
        success: true,
        precisaTrocarSenha: response.data.user.precisaTrocarSenha,
      };
    }
    return { success: false, message: response.message || 'Credenciais inválidas' };
  };

  const logout = async () => {
    await saasAuthService.logout();
    setCurrentUser(null);
  };

  return (
    <SaasAuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </SaasAuthContext.Provider>
  );
};

export const useSaasAuth = (): SaasAuthContextValue => {
  const ctx = useContext(SaasAuthContext);
  if (!ctx) throw new Error('useSaasAuth deve ser usado dentro de SaasAuthProvider');
  return ctx;
};
