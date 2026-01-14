import React, { useState, useEffect } from 'react';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { authService } from '@/services/authService';
import { removeAuthToken } from '@/services/core';
import BackNetLogo from '@/components/common/BackNetLogo';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clientIp, setClientIp] = useState<string>('');
  const { info, success, error } = useNotificationContext();

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
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-8 col-md-6" style={{ maxWidth: '380px' }}>
            <div className="card shadow">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <BackNetLogo width={120} height={120} />
                  </div>
                  <h1 className="h3 mb-2 text-dark">BackNet</h1>
                  <p className="text-muted small mb-0">Acesse o painel administrativo</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
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

                  <div className="mb-3">
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
                    className="btn btn-primary w-100 mb-3"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </button>
                </form>

                <div className="text-center mb-3">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-muted small"
                    onClick={() => info('Funcionalidade em desenvolvimento')}
                  >
                    Esqueceu sua senha?
                  </button>
                </div>

                <div className="card-footer bg-transparent border-top text-center pt-3">
                  {clientIp && (
                    <p className="text-muted small mb-2">
                      <i className="bi bi-globe me-1"></i> IP: {clientIp}
                    </p>
                  )}
                  <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                    © {new Date().getFullYear()} BackNet. Todos os direitos reservados.
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