import React from 'react';
import { ERP_MODULES } from './homeConstants';
import HomeSectionHeader from './HomeSectionHeader';

const HomeModulesSection: React.FC = () => (
  <section id="modulos" className="home-section home-modules">
    <div className="home-section-inner">
      <HomeSectionHeader
        title="Módulos do ERP"
        description="Os mesmos menus do painel administrativo — clientes, financeiro, equipamentos, RPKI e integrações."
      />
      <div className="home-modules-grid">
        {ERP_MODULES.map((mod) => (
          <article key={mod.title} className="home-module-card">
            <span className={`bi ${mod.icon} home-module-icon`} aria-hidden />
            <h3 className="home-module-title">{mod.title}</h3>
            <p className="home-module-desc">{mod.description}</p>
            <a
              href={mod.href}
              target="_blank"
              rel="noopener noreferrer"
              className="home-module-link"
            >
              Ver na wiki
              <span className="bi bi-arrow-up-right" aria-hidden />
            </a>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default HomeModulesSection;
