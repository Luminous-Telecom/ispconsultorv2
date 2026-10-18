import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService, CurrentUser } from 'services/authService';
import { getAuthToken } from 'services/core';
import { useNotificationContext } from '../../../notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import type { TranslateFn } from '../types';
import { isPublicRoute } from '../utils';

export const useLayoutAuth = (t: TranslateFn) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
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
    const params = new URLSearchParams(location.search);
    const confirmToken = params.get('confirmar_email_recuperacao');
    if (!confirmToken) return;

    let cancelled = false;
    const confirm = async () => {
      try {
        const res = await authService.confirmRecoveryEmail(confirmToken);
        if (cancelled) return;
        if (res.success) {
          success(t('userConfig.recoveryEmailConfirmSuccess'));
        } else {
          showApiError(res.message || t('userConfig.recoveryEmailConfirmSuccess'));
        }
      } catch (err) {
        if (!cancelled) {
          showApiError(err);
        }
      } finally {
        if (!cancelled) {
          params.delete('confirmar_email_recuperacao');
          const nextSearch = params.toString();
          navigate(
            { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
            { replace: true }
          );
        }
      }
    };
    void confirm();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, navigate, showApiError, success, t]);

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
