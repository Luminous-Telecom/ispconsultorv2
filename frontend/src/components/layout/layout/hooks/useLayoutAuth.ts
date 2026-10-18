import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService, CurrentUser } from 'services/authService';
import { getAuthToken } from 'services/core';
import { useNotificationContext } from '../../../notifications/NotificationProvider';
import type { TranslateFn } from '../types';
import { isPublicRoute } from '../utils';

export const useLayoutAuth = (t: TranslateFn) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { success } = useNotificationContext();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const response = await authService.getCurrentUser();
          if (response.success && response.data) {
            setCurrentUser(response.data);
          }
        } catch {
          // Silenciosamente falhar se não conseguir carregar o usuário
        }
      }
    };

    loadCurrentUser();
  }, []);

  // Links antigos apontavam para /adm?... — encaminha para /login sem perder o token
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const confirmToken = params.get('confirmar_email_recuperacao');
    if (!confirmToken) return;
    navigate(
      `/login?confirmar_email_recuperacao=${encodeURIComponent(confirmToken)}`,
      { replace: true }
    );
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('confirmar_email_recuperacao')) return;

    const token = getAuthToken();
    if (!isPublicRoute(location.pathname) && !token) {
      navigate('/login', { replace: true });
    }
  }, [navigate, location.pathname, location.search]);

  const handleLogout = async () => {
    await authService.logout();
    success(t('layout.logoutSuccess'));
    navigate('/login');
  };

  return {
    currentUser,
    handleLogout,
  };
};
