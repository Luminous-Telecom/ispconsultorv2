import React, { useState } from 'react';
import { EntrarButton, Input } from 'components/ui';
import IspConsultorLogo from 'components/common/IspConsultorLogo';
import './LoginScreen.scss';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginScreenProps {
  /** Texto de apoio abaixo da logo (ex.: "Acesse o painel administrativo"). */
  subtitle: string;
  /** Selo destacado que identifica o produto (ex.: "SaaS"). */
  badge?: string;
  emailLabel?: string;
  passwordLabel?: string;
  emailPlaceholder?: string;
  passwordPlaceholder?: string;
  /** Prefixo dos ids dos campos para evitar colisão entre telas. */
  idPrefix?: string;
  /** Conteúdo do rodapé do card (copyright, IP, etc.). */
  footer?: React.ReactNode;
  logoWidth?: number;
  logoHeight?: number;
  /** URL da logo da empresa cadastrada (painel esquerdo, abaixo da marca). */
  empresaLogo?: string | null;
  /** Texto alternativo da logo da empresa. */
  empresaLogoAlt?: string;
  onSubmit: (credentials: LoginCredentials) => Promise<void> | void;
}

/** Tela de login moderna compartilhada (CRM e SaaS). */
const LoginScreen: React.FC<LoginScreenProps> = ({
  subtitle,
  badge,
  emailLabel,
  passwordLabel,
  emailPlaceholder,
  passwordPlaceholder,
  idPrefix = 'login',
  footer,
  logoWidth = 250,
  logoHeight,
  empresaLogo,
  empresaLogoAlt = 'Logo da empresa',
  onSubmit,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const emailId = `${idPrefix}-email`;
  const passwordId = `${idPrefix}-password`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit({ email, password });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className={`login-shell${empresaLogo ? '' : ' login-shell--form-only'}`}>
        {empresaLogo ? (
          <aside className="login-branding" aria-label="Marca">
            <div className="login-branding__logos">
              <div className="login-branding__empresa">
                <img
                  src={empresaLogo}
                  alt={empresaLogoAlt}
                  className="login-branding__empresa-logo"
                />
              </div>
            </div>
          </aside>
        ) : null}

        <main className="login-panel">
          <div className="login-card">
            <div className="login-card__accent" />
            <div className="login-card__body">
              <div className="login-brand">
                <div className="login-brand__logo">
                  <IspConsultorLogo
                    width={logoWidth}
                    {...(logoHeight != null ? { height: logoHeight } : {})}
                  />
                </div>
                {badge && <span className="login-badge">{badge}</span>}
                <p className="login-subtitle">{subtitle}</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="login-field">
                  <Input
                    type="email"
                    id={emailId}
                    name="email"
                    autoComplete="username email"
                    value={email}
                    onChange={(e) => setEmail(String(e.value))}
                    required
                    disabled={isLoading}
                    aria-label={emailLabel || emailPlaceholder}
                    placeholder={emailPlaceholder}
                  />
                </div>

                <div className="login-field">
                  <Input
                    type="password"
                    id={passwordId}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(String(e.value))}
                    required
                    disabled={isLoading}
                    aria-label={passwordLabel || passwordPlaceholder}
                    placeholder={passwordPlaceholder}
                  />
                </div>

                <div className="login-submit">
                  <EntrarButton type="submit" disabled={isLoading} isPending={isLoading} />
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

export default LoginScreen;
