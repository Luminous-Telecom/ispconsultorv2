import React, { useState, useEffect } from 'react';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { authService } from '@/services/authService';
import { removeAuthToken } from '@/services/core';
import { API_CONFIG } from '@/config/api';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clientIp, setClientIp] = useState<string>('');
  const { info, success, error } = useNotificationContext();

  useEffect(() => {
    const fetchClientIp = async () => {
      try {
        const baseUrl = API_CONFIG.BASE_URL_WITHOUT_API || '';
        const response = await fetch(`${baseUrl}/client-ip`);
        const data = await response.json();
        if (data.success && data.ip) {
          setClientIp(data.ip);
        }
      } catch (err) {
        // Silenciosamente falha se não conseguir obter o IP
      }
    };

    fetchClientIp();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Revalidar email e senha ao submeter
      if (!email || !password) {
        error('Informe email e senha para continuar.');
        setIsLoading(false);
        return;
      }

      const response = await authService.login({ email, password });

      if (response.success && response.data?.token) {
        // Verificar se o token foi salvo antes de navegar
        const token = localStorage.getItem('auth_token');
        if (token) {
          // Salvar timestamp do login para evitar redirecionamento imediato em caso de erro 401
          sessionStorage.setItem('last_login_time', Date.now().toString());
          success('Autenticação realizada com sucesso.');
          // Usar window.location para forçar reload completo e evitar problemas de cache/SPA
          window.location.href = '/adm';
        } else {
          error('Erro ao salvar token de autenticação. Tente novamente.');
          removeAuthToken();
        }
      } else {
        removeAuthToken();
        error(response.message || 'Não foi possível autenticar. Verifique suas credenciais.');
      }
    } catch (err) {
      removeAuthToken();
      // Verificar se é um erro de autenticação (credenciais inválidas)
      const errorMessage = err instanceof Error ? err.message : 'Falha ao autenticar. Tente novamente.';
      // Não mostrar erro se o token foi salvo (login bem-sucedido apesar do erro)
      const token = localStorage.getItem('auth_token');
      if (!token) {
        error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <i className="bi bi-shield-lock"></i>
            </div>
            <h1 className="login-title">BackNet</h1>
            <p className="login-subtitle">Acesse o painel administrativo</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
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
                placeholder="seu@email.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Senha
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
                placeholder="Sua senha"
              />
            </div>

            <button
              type="submit"
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
              aria-busy={isLoading}
            >
              <span>{isLoading ? 'Entrando...' : 'Entrar'}</span>
            </button>
          </form>

          <div className="forgot-password">
            <button
              type="button"
              className="forgot-password-button"
              onClick={() => info('Funcionalidade em desenvolvimento')}
            >
              Esqueceu sua senha?
            </button>
          </div>

          <div className="login-footer">
            {clientIp && (
              <p className="login-ip-text">
                <i className="bi bi-globe"></i> IP: {clientIp}
              </p>
            )}
            <p className="login-footer-text">
              © {new Date().getFullYear()} BackNet. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;