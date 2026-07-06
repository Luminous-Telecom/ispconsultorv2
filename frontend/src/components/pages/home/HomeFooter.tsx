import React from 'react';
import { Link } from 'react-router-dom';
import IspConsultorIcon from 'components/common/IspConsultorIcon';
import { FOOTER_LINKS, FOOTER_WIKI_LINKS } from './homeConstants';

interface HomeFooterProps {
  scrollTo: (id: string) => void;
}

const HomeFooter: React.FC<HomeFooterProps> = ({ scrollTo }) => (
  <footer className="home-footer">
    <div className="home-footer-grid">
      <div className="home-footer-brand">
        <div className="home-footer-logo-wrap">
          <IspConsultorIcon size={32} className="home-footer-logo" />
          <span className="home-footer-brand-name">ISP Consultor</span>
        </div>
        <p className="home-footer-tagline">
          Gestão completa para consultores de telecomunicações — ERP, financeiro, equipamentos e wiki.
        </p>
      </div>
      <div className="home-footer-links">
        <h3>Produto</h3>
        {FOOTER_LINKS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              scrollTo(item.id);
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
      <div className="home-footer-links">
        <h3>Wiki</h3>
        {FOOTER_WIKI_LINKS.map((item) => (
          <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">
            {item.label}
          </a>
        ))}
      </div>
    </div>
    <div className="home-footer-bottom">
      <p>© {new Date().getFullYear()} ISP Consultor. Todos os direitos reservados.</p>
      <div className="home-footer-legal">
        <Link to="/privacidade" className="home-footer-legal-link">Privacidade</Link>
        <Link to="/termos" className="home-footer-legal-link">Termos</Link>
        <Link to="/cookies" className="home-footer-legal-link">Cookies</Link>
      </div>
    </div>
  </footer>
);

export default HomeFooter;
