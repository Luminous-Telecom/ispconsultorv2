import { useEffect } from 'react';
import { SYSTEM_NAME } from 'constants/systemBrand';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useSaasAuth } from 'contexts/SaasAuthContext';

export const useSaasLayoutAuth = () => {
  const navigate = useNavigate();
  const { success } = useNotificationContext();
  const { currentUser, logout, isAuthenticated, isLoading: authLoading } = useSaasAuth();

  useEffect(() => {
    document.title = `SuperAdmin — ${SYSTEM_NAME} SaaS`;
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/saas/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    await logout();
    success('Sessão encerrada');
    navigate('/saas/login');
  };

  return {
    currentUser,
    authLoading,
    handleLogout,
  };
};
