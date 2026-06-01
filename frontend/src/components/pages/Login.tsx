import React, { useState, useEffect } from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { ERROR_MESSAGES } from 'constants/ErrorMessages';
import { authService } from 'services/authService';
import { removeAuthToken } from 'services/core';
import { EntrarButton } from 'components/ui';
import BackNetLogo from 'components/common/BackNetLogo';
import { useI18n } from 'contexts/I18nContext';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import './Login.scss';

const Login: React.FC = () => {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clientIp, setClientIp] = useState<string>('');
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const { copy: copyToClipboard } = useCopyToClipboard({
    successMessage: t('login.ipCopied') || 'IP copiado!',
  });

  useEffect(() => {
    const fetchClientIp = async () => {
      try {
        // Usar URL relativa para funcionar em qualquer ambiente
        const response = await fetch('/client-ip');
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (data.success && data.ip && data.ip !== 'Não disponível') {
          setClientIp(data.ip);
        }
      } catch (err) {
        // Silenciosamente falha se não conseguir obter o IP
      }
    };

    fetchClientIp();
  }, []);

  const handleCopyIp = async () => {
    if (!clientIp) return;
    await copyToClipboard(clientIp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Revalidar email e senha ao submeter
      if (!email || !password) {
        showApiError(t('login.infoRequired'));
        setIsLoading(false);
        return;
      }

      const response = await authService.login({ email, password });

      if (response.success) {
        // Cookie HttpOnly setado pelo backend; flag de sessão setada pelo authService
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page container-fluid vh-100 d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-8 col-md-6" style={{ maxWidth: '380px' }}>
            <div className="card shadow">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <div className="mb-3 d-flex justify-content-center">
                    <BackNetLogo width={250} height={75} />
                  </div>
                  <p className="text-muted small mb-0">{t('login.title')}</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      {t('form.email')}
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      autoComplete="username email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder={t('login.emailPlaceholder')}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                      {t('form.password')}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder={t('login.passwordPlaceholder')}
                    />
                  </div>

                  <EntrarButton
                    type="submit"
                    className="w-100 mb-3"
                    disabled={isLoading}
                    isPending={isLoading}
                  />
                </form>

                <div className="card-footer bg-transparent border-top text-center pt-3">
                  {clientIp && (
                    <p className="text-muted small mb-2">
                      <i className="bi bi-globe me-1"></i> IP:{' '}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={handleCopyIp}
                        onKeyDown={(e) => e.key === 'Enter' && handleCopyIp()}
                        className="login-ip-copy"
                        title={t('login.copyIp') || 'Clique para copiar'}
                      >
                        {clientIp}
                      </span>
                    </p>
                  )}
                  <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                    © {new Date().getFullYear()} BackNet. {t('login.allRightsReserved')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;