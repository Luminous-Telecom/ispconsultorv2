import React, { useState } from 'react';
import { AppButton, ConfirmarButton, Input, VoltarButton } from 'components/ui';
import IspConsultorLogo from 'components/common/IspConsultorLogo';
import type { TwoFactorLoginMethods } from 'services/authService';
import './LoginScreen.scss';

export interface LoginTwoFactorStepProps {
  subtitle: string;
  codeLabel: string;
  codePlaceholder: string;
  helpText: string;
  rememberLabel: string;
  sendEmailLabel: string;
  passkeyLabel: string;
  methods?: TwoFactorLoginMethods;
  footer?: React.ReactNode;
  logoWidth?: number;
  logoHeight?: number;
  empresaLogo?: string | null;
  empresaLogoAlt?: string;
  onSubmit: (code: string, rememberBrowser: boolean) => Promise<void> | void;
  onSendEmail?: () => Promise<void> | void;
  onPasskey?: (rememberBrowser: boolean) => Promise<void> | void;
  onBack: () => void;
}

const LoginTwoFactorStep: React.FC<LoginTwoFactorStepProps> = ({
  subtitle,
  codeLabel,
  codePlaceholder,
  helpText,
  rememberLabel,
  sendEmailLabel,
  passkeyLabel,
  methods,
  footer,
  logoWidth = 250,
  logoHeight,
  empresaLogo,
  empresaLogoAlt = 'Logo da empresa',
  onSubmit,
  onSendEmail,
  onPasskey,
  onBack,
}) => {
  const [code, setCode] = useState('');
  const [rememberBrowser, setRememberBrowser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const showCodeField = !methods || methods.totp || methods.email;
  const showEmail = !!methods?.email && !!onSendEmail;
  const showPasskey = !!methods?.webauthn && !!onPasskey;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(code.trim(), rememberBrowser);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!onSendEmail) return;
    setIsSendingEmail(true);
    try {
      await onSendEmail();
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePasskey = async () => {
    if (!onPasskey) return;
    setIsLoading(true);
    try {
      await onPasskey(rememberBrowser);
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
                <p className="login-subtitle">{subtitle}</p>
              </div>

              <form onSubmit={handleSubmit}>
                {showCodeField && (
                  <div className="login-field">
                    <Input
                      type="text"
                      id="login-2fa-code"
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(String(e.value))}
                      required={showCodeField}
                      disabled={isLoading}
                      aria-label={codeLabel}
                      placeholder={codePlaceholder}
                    />
                  </div>
                )}
                <p className="form-helper-message mb-2">{helpText}</p>

                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="login-2fa-remember"
                    checked={rememberBrowser}
                    onChange={(e) => setRememberBrowser(e.target.checked)}
                    disabled={isLoading}
                  />
                  <label className="form-check-label" htmlFor="login-2fa-remember">
                    {rememberLabel}
                  </label>
                </div>

                <div className="login-submit d-flex flex-column gap-2">
                  {showCodeField && (
                    <ConfirmarButton type="submit" disabled={isLoading} isPending={isLoading} />
                  )}
                  {showEmail && (
                    <AppButton
                      type="button"
                      label={sendEmailLabel}
                      variant="secondary"
                      onClick={handleSendEmail}
                      disabled={isLoading || isSendingEmail}
                      isPending={isSendingEmail}
                    />
                  )}
                  {showPasskey && (
                    <AppButton
                      type="button"
                      label={passkeyLabel}
                      variant="secondary"
                      onClick={handlePasskey}
                      disabled={isLoading}
                      isPending={isLoading && !showCodeField}
                    />
                  )}
                  <VoltarButton type="button" onClick={onBack} disabled={isLoading || isSendingEmail} />
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

export default LoginTwoFactorStep;
