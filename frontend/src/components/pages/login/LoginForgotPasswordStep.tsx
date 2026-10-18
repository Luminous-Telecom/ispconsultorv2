import React, { useState } from 'react';
import { EnviarButton, Input, VoltarButton } from 'components/ui';
import IspConsultorLogo from 'components/common/IspConsultorLogo';
import LoginEmpresaBranding from './LoginEmpresaBranding';
import TechBackground from './TechBackground';
import './LoginScreen.scss';

export interface LoginForgotPasswordStepProps {
  subtitle: string;
  helpText: string;
  emailPlaceholder: string;
  footer?: React.ReactNode;
  logoWidth?: number;
  empresaLogo?: string | null;
  empresaLogoAlt?: string;
  onSubmit: (email: string) => Promise<void> | void;
  onBack: () => void;
}

const LoginForgotPasswordStep: React.FC<LoginForgotPasswordStepProps> = ({
  subtitle,
  helpText,
  emailPlaceholder,
  footer,
  logoWidth = 250,
  empresaLogo,
  empresaLogoAlt = 'Logo da empresa',
  onSubmit,
  onBack,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(email.trim());
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
                    type="email"
                    id="forgot-password-email"
                    name="email"
                    autoComplete="username email"
                    value={email}
                    onChange={(e) => setEmail(String(e.value))}
                    required
                    disabled={isLoading}
                    aria-label={emailPlaceholder}
                    placeholder={emailPlaceholder}
                  />
                </div>

                <div className="login-submit login-submit--stack">
                  <EnviarButton type="submit" size="md" disabled={isLoading} isPending={isLoading} />
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

export default LoginForgotPasswordStep;
