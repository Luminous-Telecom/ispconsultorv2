import React from 'react';

export interface LoginEmpresaBrandingProps {
  empresaLogo: string;
  empresaLogoAlt?: string;
}

/** Painel esquerdo do login com a logo da empresa. */
const LoginEmpresaBranding: React.FC<LoginEmpresaBrandingProps> = ({
  empresaLogo,
  empresaLogoAlt = 'Logo da empresa',
}) => (
  <aside className="login-branding" aria-label="Marca">
    <div className="login-branding__stage">
      <div className="login-branding__empresa">
        <img
          src={empresaLogo}
          alt={empresaLogoAlt}
          className="login-branding__empresa-logo"
        />
      </div>
    </div>
  </aside>
);

export default LoginEmpresaBranding;
