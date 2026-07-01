import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useSaasAuth } from 'contexts/SaasAuthContext';
import { useI18n } from 'contexts/I18nContext';
import LoginScreen, { LoginCredentials } from '../login/LoginScreen';
import LoginFooter from '../login/LoginFooter';

const SaasLogin: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { login } = useSaasAuth();
  const { success, error } = useNotificationContext();

  const handleLogin = async ({ email, password }: LoginCredentials) => {
    if (!email || !password) {
      error(t('login.infoRequired'));
      return;
    }

    try {
      const result = await login(email, password);
      if (result.success) {
        success(t('login.success'));
        navigate('/saas', { replace: true });
      } else {
        error(result.message || 'Credenciais inválidas');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao realizar login';
      error(msg);
    }
  };

  return (
    <LoginScreen
      subtitle={t('login.title')}
      badge="SaaS"
      emailPlaceholder={t('form.email')}
      passwordPlaceholder={t('form.password')}
      idPrefix="saas"
      logoWidth={250}
      logoHeight={75}
      onSubmit={handleLogin}
      footer={<LoginFooter />}
    />
  );
};

export default SaasLogin;
