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

  useEffect(() => {
    const token = getAuthToken();

    if (!isPublicRoute(location.pathname) && !token) {
      navigate('/login', { replace: true });
    }
  }, [navigate, location.pathname]);

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
