import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import BackNetLogo from 'components/common/BackNetLogo';
import { useTheme } from 'contexts/ThemeContext';
import './LegalPage.scss';

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

const LegalPage: React.FC<LegalPageProps> = ({ title, children }) => {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    document.title = `${title} — BackNet`;
  }, [title]);

  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link to="/" className="legal-logo-link">
            <BackNetLogo width={120} height={38} className="legal-logo" />
          </Link>
          <div className="legal-header-actions">
            <button
              type="button"
              className="legal-theme-toggle"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            >
              <span className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`} />
            </button>
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
          <p>© {new Date().getFullYear()} BackNet. Todos os direitos reservados.</p>
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
