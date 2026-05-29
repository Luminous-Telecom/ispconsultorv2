import React from 'react';
import { Card, Input, EnviarSenhaButton, VoltarButton } from 'components/ui';
import type { RecuperarSenhaRequest } from 'services/centralAssinanteService';
import CentralAssinanteNotifications from './CentralAssinanteNotifications';
import type { CentralAssinanteNotificationsProps } from './CentralAssinanteNotifications';

interface CentralAssinanteRecuperarSenhaViewProps extends CentralAssinanteNotificationsProps {
  form: RecuperarSenhaRequest;
  onFormChange: (form: RecuperarSenhaRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  isPending: boolean;
}

const CentralAssinanteRecuperarSenhaView: React.FC<CentralAssinanteRecuperarSenhaViewProps> = ({
  form,
  onFormChange,
  onSubmit,
  onBack,
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
            <h2 className="h6 mb-1 fw-bold text-white">
              <i className="bi bi-key text-white-50 me-2" />
              Recuperar Senha
            </h2>
            <p className="text-white-50 mb-0 small">
              Informe seu CNPJ e Email para recuperar sua senha
            </p>
          </div>
          <div className="card-body pt-2 px-3 pb-3 central-assinante-login-body">
            <form onSubmit={onSubmit}>
              <div className="mb-2">
                <label htmlFor="recuperar-cnpj" className="form-label small text-white-50">
                  CNPJ
                </label>
                <Input
                  type="text"
                  id="recuperar-cnpj"
                  value={form.cnpj}
                  onChange={(e) => onFormChange({ ...form, cnpj: String(e.value) })}
                  placeholder="Digite seu CNPJ"
                  required
                  disabled={isPending}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="recuperar-email" className="form-label small text-white-50">
                  Email
                </label>
                <Input
                  type="email"
                  id="recuperar-email"
                  value={form.email}
                  onChange={(e) => onFormChange({ ...form, email: String(e.value) })}
                  placeholder="Digite seu Email"
                  required
                  disabled={isPending}
                />
              </div>
              <div className="d-grid gap-2">
                <EnviarSenhaButton type="submit" className="w-100" disabled={isPending} isPending={isPending} />
                <VoltarButton type="button" className="w-100" onClick={onBack} disabled={isPending} />
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

export default CentralAssinanteRecuperarSenhaView;
