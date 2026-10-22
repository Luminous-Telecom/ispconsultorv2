import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { ERROR_MESSAGES } from 'constants/ErrorMessages';
import { authService, isRequires2fa, type TwoFactorLoginMethods } from 'services/authService';
import { removeAuthToken } from 'services/core';
import { useI18n } from 'contexts/I18nContext';
import LoginScreen, { LoginCredentials } from './login/LoginScreen';
import LoginTwoFactorStep from './login/LoginTwoFactorStep';
import LoginForgotPasswordStep from './login/LoginForgotPasswordStep';
import LoginResetPasswordStep from './login/LoginResetPasswordStep';
import LoginFooter from './login/LoginFooter';

type LoginView = 'login' | 'forgot' | 'reset' | '2fa';

const Login: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [view, setView] = useState<LoginView>('login');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [methods, setMethods] = useState<TwoFactorLoginMethods | undefined>();
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('redefinir_senha');
    if (!token) return;
    setResetToken(token);
    setView('reset');
  }, [searchParams]);

  useEffect(() => {
    const confirmToken = searchParams.get('confirmar_email_recuperacao');
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
          const next = new URLSearchParams(searchParams);
          next.delete('confirmar_email_recuperacao');
          const qs = next.toString();
          navigate({ pathname: '/login', search: qs ? `?${qs}` : '' }, { replace: true });
        }
      }
    };
    void confirm();
    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate, showApiError, success, t]);

  const clearResetQuery = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('redefinir_senha');
    const qs = next.toString();
    navigate({ pathname: '/login', search: qs ? `?${qs}` : '' }, { replace: true });
  };

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
          setView('2fa');
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

  const handleForgotPassword = async (email: string) => {
    if (!email) {
      showApiError(t('login.forgotEmailRequired'));
      return;
    }
    try {
      const response = await authService.forgotPassword(email);
      if (response.success) {
        success(response.message || t('login.forgotSuccess'));
        setView('login');
      } else {
        showApiError(response.message || ERROR_MESSAGES.GENERIC_ERROR);
      }
    } catch (err) {
      showApiError(err, ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleResetPassword = async (password: string, passwordConfirmation: string) => {
    if (!resetToken) {
      showApiError(t('login.resetInvalidLink'));
      return;
    }
    if (!password || password.length < 6) {
      showApiError(t('login.resetPasswordMin'));
      return;
    }
    if (password !== passwordConfirmation) {
      showApiError(t('login.resetPasswordMismatch'));
      return;
    }
    try {
      const response = await authService.resetPassword(resetToken, password, passwordConfirmation);
      if (response.success) {
        success(response.message || t('login.resetSuccess'));
        setResetToken(null);
        setView('login');
        clearResetQuery();
      } else {
        showApiError(response.message || ERROR_MESSAGES.GENERIC_ERROR);
      }
    } catch (err) {
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

  if (view === '2fa' && tempToken) {
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
        onSubmit={handleVerify2fa}
        onSendEmail={methods?.email ? handleSendEmail : undefined}
        onPasskey={methods?.webauthn ? handlePasskey : undefined}
        onBack={() => {
          setTempToken(null);
          setMethods(undefined);
          setView('login');
        }}
        footer={<LoginFooter />}
      />
    );
  }

  if (view === 'forgot') {
    return (
      <LoginForgotPasswordStep
        subtitle={t('login.forgotTitle')}
        helpText={t('login.forgotHelp')}
        emailPlaceholder={t('form.email')}
        logoWidth={250}
        onSubmit={handleForgotPassword}
        onBack={() => setView('login')}
        footer={<LoginFooter />}
      />
    );
  }

  if (view === 'reset' && resetToken) {
    return (
      <LoginResetPasswordStep
        subtitle={t('login.resetTitle')}
        helpText={t('login.resetHelp')}
        passwordPlaceholder={t('login.resetPasswordPlaceholder')}
        confirmPlaceholder={t('login.resetConfirmPlaceholder')}
        logoWidth={250}
        onSubmit={handleResetPassword}
        onBack={() => {
          setResetToken(null);
          setView('login');
          clearResetQuery();
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
      forgotPasswordLabel={t('login.forgotPassword')}
      onForgotPassword={() => setView('forgot')}
      onSubmit={handleLogin}
      footer={<LoginFooter />}
    />
  );
};

export default Login;
