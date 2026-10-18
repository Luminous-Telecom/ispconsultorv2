import React, { useState } from 'react';
import { AlterarSenhaButton, Input, VoltarButton } from 'components/ui';
import IspConsultorLogo from 'components/common/IspConsultorLogo';
import LoginEmpresaBranding from './LoginEmpresaBranding';
import TechBackground from './TechBackground';
import './LoginScreen.scss';

export interface LoginResetPasswordStepProps {
  subtitle: string;
  helpText: string;
  passwordPlaceholder: string;
  confirmPlaceholder: string;
  footer?: React.ReactNode;
  logoWidth?: number;
  empresaLogo?: string | null;
  empresaLogoAlt?: string;
  onSubmit: (password: string, passwordConfirmation: string) => Promise<void> | void;
  onBack: () => void;
}

const LoginResetPasswordStep: React.FC<LoginResetPasswordStepProps> = ({
  subtitle,
  helpText,
  passwordPlaceholder,
  confirmPlaceholder,
  footer,
  logoWidth = 250,
  empresaLogo,
  empresaLogoAlt = 'Logo da empresa',
  onSubmit,
  onBack,
}) => {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(password, passwordConfirmation);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <TechBackground />
      <div className={`login-shell${empresaLogo ? '' : ' login-shell--form-only'}`}>
        {empresaLogo ? (
          <LoginEmpresaBranding empresaLogo={empresaLogo} empresaLogoAlt={empresaLogoAlt} />
        ) : null}

        <main className="login-panel">
          <div className="login-card">
            <div className="login-card__accent" />
            <div className="login-card__body">
              <div className="login-brand">
                <div className="login-brand__logo">
                  <IspConsultorLogo width={logoWidth} />
                </div>
                <p className="login-subtitle">{subtitle}</p>
                <p className="login-help">{helpText}</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="login-field">
                  <Input
                    type="password"
                    id="reset-password"
                    name="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(String(e.value))}
                    required
                    disabled={isLoading}
                    aria-label={passwordPlaceholder}
                    placeholder={passwordPlaceholder}
                  />
                </div>
                <div className="login-field">
                  <Input
                    type="password"
                    id="reset-password-confirm"
                    name="password_confirmation"
                    autoComplete="new-password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(String(e.value))}
                    required
                    disabled={isLoading}
                    aria-label={confirmPlaceholder}
                    placeholder={confirmPlaceholder}
                  />
                </div>

                <div className="login-submit login-submit--stack">
                  <AlterarSenhaButton type="submit" disabled={isLoading} isPending={isLoading} />
                  <VoltarButton type="button" size="md" onClick={onBack} disabled={isLoading} />
                </div>
              </form>

              {footer && <div className="login-footer">{footer}</div>}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginResetPasswordStep;
