import React, { useState } from 'react';
import { useNotificationContext } from '../../components/notifications/NotificationProvider';
import { authService } from '../../services/authService';
import { removeAuthToken } from '../../services/core';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { info, success, error } = useNotificationContext();

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
    <div className="min-vh-100 bg-light d-flex align-items-center">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <h1 className="h4 text-primary fw-bold mb-1">BackNet</h1>
                  <p className="text-muted mb-0">Acesse o painel administrativo</p>
                </div>

                <form onSubmit={handleSubmit} className="mb-3">
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
                    className="btn btn-primary w-100"
                    disabled={isLoading}
                    aria-busy={isLoading}
                  >
                    Entrar
                  </button>
                </form>

                <div className="text-center">
                  <button
                    type="button"
                    className="btn btn-link px-0"
                    onClick={() => info('Funcionalidade em desenvolvimento')}
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center mt-4">
              <p className="text-muted mb-0">© {new Date().getFullYear()} BackNet. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;