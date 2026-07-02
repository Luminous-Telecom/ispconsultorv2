import React from 'react';
import { Card, Input, CancelarButton, AlterarSenhaButton, NavLinkButton } from 'components/ui';

interface TrocarSenhaForm {
  senhaAtual: string;
  novaSenha: string;
  confirmarNovaSenha: string;
}

interface CentralAssinanteTrocarSenhaModalProps {
  trocarSenhaForm: TrocarSenhaForm;
  setTrocarSenhaForm: React.Dispatch<React.SetStateAction<TrocarSenhaForm>>;
  mostrarNovaSenha: boolean;
  setMostrarNovaSenha: React.Dispatch<React.SetStateAction<boolean>>;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const CentralAssinanteTrocarSenhaModal: React.FC<CentralAssinanteTrocarSenhaModalProps> = ({
  trocarSenhaForm,
  setTrocarSenhaForm,
  mostrarNovaSenha,
  setMostrarNovaSenha,
  isPending,
  onSubmit,
  onClose,
}) => (
  <div
    className="modal show d-block central-assinante-modal-backdrop"
    tabIndex={-1}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}
  >
    <div className="modal-dialog modal-dialog-centered central-assinante-modal-dialog central-assinante-modal-dialog-lg" onClick={(e) => e.stopPropagation()}>
      <div className="modal-content central-assinante-card-bg border-0 central-assinante-modal-content">
        <Card className="border-0">
          <div className="card-header text-center border-0 border-bottom border-secondary pb-2 pt-3 central-assinante-login-header">
            <h2 className="h6 mb-1 fw-bold text-white">
              <i className="bi bi-key text-white-50 central-assinante-item-icon me-1"></i>
              Trocar Senha
            </h2>
            <p className="text-white-50 mb-0 small">Informe sua senha atual e a nova senha</p>
          </div>
          <div className="card-body pt-2 px-3 pb-3 central-assinante-login-body">
            <form onSubmit={onSubmit}>
              <div className="mb-2">
                <label htmlFor="senha-atual" className="form-label small text-white-50">Senha Atual</label>
                <Input
                  type="password"
                  id="senha-atual"
                  value={trocarSenhaForm.senhaAtual}
                  onChange={(e) => setTrocarSenhaForm({ ...trocarSenhaForm, senhaAtual: String(e.value) })}
                  placeholder="Digite sua senha atual"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="mb-2">
                <label htmlFor="nova-senha" className="form-label small text-white-50">Nova Senha</label>
                <div className="central-assinante-input-with-toggle">
                  <Input
                    type={mostrarNovaSenha ? 'text' : 'password'}
                    id="nova-senha"
                    value={trocarSenhaForm.novaSenha}
                    onChange={(e) => setTrocarSenhaForm({ ...trocarSenhaForm, novaSenha: String(e.value) })}
                    placeholder="Digite a nova senha (mínimo 6 caracteres)"
                    required
                    disabled={isPending}
                    className="central-assinante-input-with-toggle-field"
                  />
                  <NavLinkButton
                    className="central-assinante-password-toggle"
                    onClick={() => setMostrarNovaSenha((v) => !v)}
                    disabled={isPending}
                    ariaLabel={mostrarNovaSenha ? 'Ocultar' : 'Mostrar'}
                  >
                    {mostrarNovaSenha ? 'Ocultar' : 'Mostrar'}
                  </NavLinkButton>
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="confirmar-nova-senha" className="form-label small text-white-50">Confirmar Nova Senha</label>
                <div className="central-assinante-input-with-toggle">
                  <Input
                    type={mostrarNovaSenha ? 'text' : 'password'}
                    id="confirmar-nova-senha"
                    value={trocarSenhaForm.confirmarNovaSenha}
                    onChange={(e) => setTrocarSenhaForm({ ...trocarSenhaForm, confirmarNovaSenha: String(e.value) })}
                    placeholder="Digite novamente a nova senha"
                    required
                    disabled={isPending}
                    className="central-assinante-input-with-toggle-field"
                  />
                  <NavLinkButton
                    className="central-assinante-password-toggle"
                    onClick={() => setMostrarNovaSenha((v) => !v)}
                    disabled={isPending}
                    ariaLabel={mostrarNovaSenha ? 'Ocultar' : 'Mostrar'}
                  >
                    {mostrarNovaSenha ? 'Ocultar' : 'Mostrar'}
                  </NavLinkButton>
                </div>
              </div>

              <div className="d-grid gap-2">
                <AlterarSenhaButton
                  type="submit"
                  className="w-100"
                  disabled={isPending}
                  isPending={isPending}
                />
                <CancelarButton
                  type="button"
                  className="w-100"
                  onClick={onClose}
                  disabled={isPending}
                />
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  </div>
);

export default CentralAssinanteTrocarSenhaModal;
