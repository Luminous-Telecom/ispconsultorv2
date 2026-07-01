import React from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { ERROR_MESSAGES } from 'constants/ErrorMessages';
import { authService } from 'services/authService';
import { removeAuthToken } from 'services/core';
import { useI18n } from 'contexts/I18nContext';
import LoginScreen, { LoginCredentials } from './login/LoginScreen';
import LoginFooter from './login/LoginFooter';

const Login: React.FC = () => {
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const handleLogin = async ({ email, password }: LoginCredentials) => {
    if (!email || !password) {
      showApiError(t('login.infoRequired'));
      return;
    }

    try {
      const response = await authService.login({ email, password });
      if (response.success) {
        sessionStorage.setItem('last_login_time', Date.now().toString());
        success(t('login.success'));
        window.location.href = '/adm';
      } else {
        removeAuthToken();
        showApiError(response.message || ERROR_MESSAGES.UNAUTHORIZED);
      }
    } catch (err) {
      removeAuthToken();
      showApiError(err, ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  return (
    <LoginScreen
      subtitle={t('login.title')}
      emailPlaceholder={t('form.email')}
      passwordPlaceholder={t('form.password')}
      idPrefix="login"
      logoWidth={250}
      logoHeight={75}
      onSubmit={handleLogin}
      footer={<LoginFooter />}
    />
  );
};

export default Login;
