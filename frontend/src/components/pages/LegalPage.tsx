import React, { useEffect } from 'react';
import { SYSTEM_NAME } from 'constants/systemBrand';
import { Link } from 'react-router-dom';
import IspConsultorLogo from 'components/common/IspConsultorLogo';
import { IconOnlyButton } from 'components/ui';
import { useTheme } from 'contexts/ThemeContext';
import './LegalPage.scss';

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

const LegalPage: React.FC<LegalPageProps> = ({ title, children }) => {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    document.title = `${title} — ${SYSTEM_NAME}`;
  }, [title]);

  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link to="/" className="legal-logo-link">
            <IspConsultorLogo width={120} height={38} className="legal-logo" />
          </Link>
          <div className="legal-header-actions">
            <IconOnlyButton
              className="legal-theme-toggle"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
              label={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            >
              <span className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`} />
            </IconOnlyButton>
            <Link to="/" className="legal-btn legal-btn-outline">
              Voltar ao site
            </Link>
          </div>
        </div>
      </header>

      <main className="legal-main">
        <div className="legal-content">
          <h1 className="legal-title">{title}</h1>
          <div className="legal-body">{children}</div>
        </div>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <p>© {new Date().getFullYear()} {SYSTEM_NAME}. Todos os direitos reservados.</p>
          <div className="legal-footer-links">
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LegalPage;
