import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useSaasAuth } from '@/contexts/SaasAuthContext';
import BackNetLogo from '@/components/common/BackNetLogo';

const SaasLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useSaasAuth();
  const { success, error } = useNotificationContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      error('Preencha email e senha');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        success('Acesso autorizado');
        navigate('/saas', { replace: true });
      } else {
        error(result.message || 'Credenciais inválidas');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao realizar login';
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-8 col-md-5" style={{ maxWidth: '400px' }}>
            <div className="card shadow">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <div className="mb-3 d-flex justify-content-center">
                    <BackNetLogo width={220} height={65} />
                  </div>
                  <div className="badge bg-primary mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    PAINEL SUPER ADMIN
                  </div>
                  <p className="text-muted small mb-0">Acesso restrito ao administrador SaaS</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="saas-email" className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="saas-email"
                      name="email"
                      autoComplete="username email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="superadmin@sistema.com"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="saas-password" className="form-label">Senha</label>
                    <input
                      type="password"
                      className="form-control"
                      id="saas-password"
                      name="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 mb-3"
                    disabled={isLoading}
                  >
                    Entrar
                  </button>
                </form>

                <div className="text-center pt-2 border-top">
                  <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                    © {new Date().getFullYear()} BackNet SaaS. Acesso restrito.
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

export default SaasLogin;
