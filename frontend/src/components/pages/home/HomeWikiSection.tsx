import React from 'react';
import { AppButton } from 'components/ui';
import { WIKI_HUBS, WIKI_HOME_URL } from './homeConstants';
import HomeSectionHeader from './HomeSectionHeader';

const HomeWikiSection: React.FC = () => (
  <section id="wiki" className="home-section home-wiki">
    <div className="home-section-inner">
      <HomeSectionHeader
        title="Central de Ajuda — Wiki"
        description="Documentação alinhada aos menus do ERP: tutoriais, integrações e referência de cada tela."
      />
      <div className="home-wiki-grid">
        {WIKI_HUBS.map((hub) => (
          <a
            key={hub.title}
            href={hub.href}
            target="_blank"
            rel="noopener noreferrer"
            className="home-wiki-card"
          >
            <span className={`bi ${hub.icon} home-wiki-icon`} aria-hidden />
            <h3 className="home-wiki-title">{hub.title}</h3>
            <p className="home-wiki-desc">{hub.description}</p>
            <span className="home-wiki-arrow bi bi-arrow-up-right" aria-hidden />
          </a>
        ))}
      </div>
      <div className="home-wiki-cta">
        <AppButton
          type="button"
          label="Abrir Central de Ajuda"
          variant="unstyled"
          className="home-btn home-btn-primary"
          onClick={() => window.open(WIKI_HOME_URL, '_blank', 'noopener,noreferrer')}
        />
      </div>
    </div>
  </section>
);

export default HomeWikiSection;
