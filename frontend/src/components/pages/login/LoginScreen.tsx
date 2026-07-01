import React, { useState } from 'react';
import { EntrarButton } from 'components/ui';
import BackNetLogo from 'components/common/BackNetLogo';
import './LoginScreen.scss';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginScreenProps {
  /** Texto de apoio abaixo da logo. */
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
  logoWidth = 240,
  logoHeight = 72,
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
      <div className="login-card">
        <div className="login-card__accent" />
        <div className="login-card__body">
          <div className="login-brand">
            <div className="login-brand__logo">
              <BackNetLogo width={logoWidth} height={logoHeight} />
            </div>
            {badge && <span className="login-badge">{badge}</span>}
            <p className="login-subtitle">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <input
                type="email"
                className="login-input"
                id={emailId}
                name="email"
                autoComplete="username email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label={emailLabel || emailPlaceholder}
                placeholder={emailPlaceholder}
              />
            </div>

            <div className="login-field">
              <input
                type="password"
                className="login-input"
                id={passwordId}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
    </div>
  );
};

export default LoginScreen;
