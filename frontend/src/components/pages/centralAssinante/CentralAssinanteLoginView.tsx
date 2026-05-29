import React from 'react';
import { Card, Input, EntrarButton } from 'components/ui';
import Button from 'components/ui/Button';
import type { LoginCentralAssinanteRequest } from 'services/centralAssinanteService';
import CentralAssinanteNotifications from './CentralAssinanteNotifications';
import type { CentralAssinanteNotificationsProps } from './CentralAssinanteNotifications';

interface CentralAssinanteLoginViewProps extends CentralAssinanteNotificationsProps {
  empresaLogo?: string | null;
  loginForm: LoginCentralAssinanteRequest;
  onLoginFormChange: (form: LoginCentralAssinanteRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
  loginFieldLabel: string;
  loginFieldPlaceholder: string;
  loginInputType: 'email' | 'text';
  isPending: boolean;
}

const CentralAssinanteLoginView: React.FC<CentralAssinanteLoginViewProps> = ({
  empresaLogo,
  loginForm,
  onLoginFormChange,
  onSubmit,
  onForgotPassword,
  loginFieldLabel,
  loginFieldPlaceholder,
  loginInputType,
  isPending,
  notifications,
  removeNotification,
  pauseNotification,
  resumeNotification,
}) => (
  <div className="min-vh-100 d-flex align-items-center justify-content-center py-2 px-2 central-assinante-container central-assinante-login-container">
    <div className="central-assinante-login-card">
      <div className="central-assinante-card-bg">
        <Card className="border-0">
          <div className="card-header text-center border-0 border-bottom border-secondary pb-2 pt-3 central-assinante-login-header">
            {empresaLogo && (
              <div className="mb-3 central-assinante-login-logo-wrapper">
                <img src={empresaLogo} alt="Logo da Empresa" className="central-assinante-login-logo" />
              </div>
            )}
            <h2 className="h6 mb-1 fw-bold text-white">
              <i className="bi bi-person-circle text-white-50 me-2" />
              Central do Assinante
            </h2>
            <p className="text-white-50 mb-0 small">Faça login para acessar seus dados</p>
          </div>
          <div className="card-body pt-2 px-3 pb-3 central-assinante-login-body">
            <form onSubmit={onSubmit}>
              <div className="mb-2">
                <label htmlFor="login" className="form-label small text-white-50">
                  {loginFieldLabel}
                </label>
                <Input
                  type={loginInputType}
                  id="login"
                  value={loginForm.login}
                  onChange={(e) => onLoginFormChange({ ...loginForm, login: String(e.value) })}
                  placeholder={loginFieldPlaceholder}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="senha" className="form-label small text-white-50">
                  Senha
                </label>
                <Input
                  type="password"
                  id="senha"
                  value={loginForm.senha}
                  onChange={(e) => onLoginFormChange({ ...loginForm, senha: String(e.value) })}
                  placeholder="Digite sua senha"
                  required
                  disabled={isPending}
                />
              </div>
              <div className="d-grid mt-2 mb-1">
                <EntrarButton type="submit" disabled={isPending} isPending={isPending} />
              </div>
              <div className="text-center mt-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-white-50 text-decoration-none p-0 small"
                  onClick={onForgotPassword}
                  style={{ fontSize: '0.85rem' }}
                >
                  Esqueci minha senha
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
    <CentralAssinanteNotifications
      notifications={notifications}
      removeNotification={removeNotification}
      pauseNotification={pauseNotification}
      resumeNotification={resumeNotification}
    />
  </div>
);

export default CentralAssinanteLoginView;
