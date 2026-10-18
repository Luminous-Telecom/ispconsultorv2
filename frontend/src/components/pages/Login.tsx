import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startAuthentication } from '@simplewebauthn/browser';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { ERROR_MESSAGES } from 'constants/ErrorMessages';
import { authService, isRequires2fa, type TwoFactorLoginMethods } from 'services/authService';
import { DadosEmpresaService } from 'services/dadosEmpresaService';
import { removeAuthToken } from 'services/core';
import { useI18n } from 'contexts/I18nContext';
import LoginScreen, { LoginCredentials } from './login/LoginScreen';
import LoginTwoFactorStep from './login/LoginTwoFactorStep';
import LoginFooter from './login/LoginFooter';

const Login: React.FC = () => {
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [methods, setMethods] = useState<TwoFactorLoginMethods | undefined>();

  const { data: empresaPublica } = useQuery({
    queryKey: ['dados-empresa-public-login'],
    queryFn: () => DadosEmpresaService.getPublic(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const empresaLogo = empresaPublica?.logo || null;
  const empresaLogoAlt = empresaPublica?.nome_fantasia || empresaPublica?.razao_social
    ? t('login.companyLogoAltNamed', {
        name: empresaPublica.nome_fantasia || empresaPublica.razao_social,
      })
    : t('login.companyLogoAlt');

  const finishLogin = () => {
    sessionStorage.setItem('last_login_time', Date.now().toString());
    success(t('login.success'));
    window.location.href = '/adm';
  };

  const handleLogin = async ({ email, password }: LoginCredentials) => {
    if (!email || !password) {
      showApiError(t('login.infoRequired'));
      return;
    }

    try {
      const response = await authService.login({ email, password });
      if (response.success && response.data) {
        if (isRequires2fa(response.data)) {
          setTempToken(response.data.temp_token);
          setMethods(response.data.methods);
          return;
        }
        finishLogin();
      } else {
        removeAuthToken();
        showApiError(response.message || ERROR_MESSAGES.UNAUTHORIZED);
      }
    } catch (err) {
      removeAuthToken();
      showApiError(err, ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleVerify2fa = async (code: string, rememberBrowser: boolean) => {
    if (!tempToken || !code) {
      showApiError(t('login.twoFactorCodeRequired'));
      return;
    }

    try {
      const response = await authService.verify2fa(tempToken, code, rememberBrowser);
      if (response.success) {
        finishLogin();
      } else {
        removeAuthToken();
        showApiError(response.message || ERROR_MESSAGES.UNAUTHORIZED);
      }
    } catch (err) {
      removeAuthToken();
      showApiError(err, ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleSendEmail = async () => {
    if (!tempToken) return;
    try {
      const response = await authService.sendEmail2faCode(tempToken);
      if (response.success) {
        success(
          response.data?.sent_to
            ? t('login.twoFactorEmailSentTo', { email: response.data.sent_to })
            : t('login.twoFactorEmailSent')
        );
      } else {
        showApiError(response.message || ERROR_MESSAGES.GENERIC_ERROR);
      }
    } catch (err) {
      showApiError(err, ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handlePasskey = async (rememberBrowser: boolean) => {
    if (!tempToken) return;
    try {
      const optionsRes = await authService.webauthnLoginOptions(tempToken);
      if (!optionsRes.success || !optionsRes.data) {
        showApiError(optionsRes.message || ERROR_MESSAGES.GENERIC_ERROR);
        return;
      }
      const assertion = await startAuthentication({
        optionsJSON: optionsRes.data as unknown as Parameters<
          typeof startAuthentication
        >[0]['optionsJSON'],
      });
      const response = await authService.webauthnLoginVerify(tempToken, assertion, rememberBrowser);
      if (response.success) {
        finishLogin();
      } else {
        removeAuthToken();
        showApiError(response.message || ERROR_MESSAGES.UNAUTHORIZED);
      }
    } catch (err) {
      removeAuthToken();
      showApiError(err, ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const twoFactorHelp = (() => {
    if (!methods) return t('login.twoFactorHelp');
    const parts: string[] = [];
    if (methods.totp) parts.push(t('login.twoFactorHelpTotp'));
    if (methods.email) parts.push(t('login.twoFactorHelpEmail'));
    if (methods.webauthn) parts.push(t('login.twoFactorHelpPasskey'));
    return parts.length ? parts.join(' ') : t('login.twoFactorHelp');
  })();

  if (tempToken) {
    return (
      <LoginTwoFactorStep
        subtitle={t('login.twoFactorTitle')}
        codeLabel={t('login.twoFactorCode')}
        codePlaceholder={t('login.twoFactorPlaceholder')}
        helpText={twoFactorHelp}
        rememberLabel={t('login.twoFactorRemember')}
        sendEmailLabel={t('login.twoFactorSendEmail')}
        passkeyLabel={t('login.twoFactorPasskey')}
        methods={methods}
        logoWidth={250}
        empresaLogo={empresaLogo}
        empresaLogoAlt={empresaLogoAlt}
        onSubmit={handleVerify2fa}
        onSendEmail={methods?.email ? handleSendEmail : undefined}
        onPasskey={methods?.webauthn ? handlePasskey : undefined}
        onBack={() => {
          setTempToken(null);
          setMethods(undefined);
        }}
        footer={<LoginFooter />}
      />
    );
  }

  return (
    <LoginScreen
      subtitle={t('login.title')}
      emailPlaceholder={t('form.email')}
      passwordPlaceholder={t('form.password')}
      idPrefix="login"
      logoWidth={250}
      empresaLogo={empresaLogo}
      empresaLogoAlt={empresaLogoAlt}
      onSubmit={handleLogin}
      footer={<LoginFooter />}
    />
  );
};

export default Login;
