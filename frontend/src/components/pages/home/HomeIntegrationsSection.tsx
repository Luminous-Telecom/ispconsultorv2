import React from 'react';
import { INTEGRATIONS } from './homeConstants';
import HomeSectionHeader from './HomeSectionHeader';

const HomeIntegrationsSection: React.FC = () => (
  <section id="integracoes" className="home-section home-integrations">
    <div className="home-section-inner">
      <HomeSectionHeader
        title="Integração com API"
        description="Conecte sistemas externos ao ERP — REST, webhooks e documentação na wiki."
      />
      <div className="home-integrations-grid">
        {INTEGRATIONS.map((item) => (
          <a
            key={item.title}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="home-integration-card"
          >
            <span className={`bi ${item.icon} home-integration-icon`} aria-hidden />
            <h3 className="home-integration-title">{item.title}</h3>
            <p className="home-integration-desc">{item.desc}</p>
            <span className="home-integration-link">
              Ver na wiki
              <span className="bi bi-arrow-up-right" aria-hidden />
            </span>
          </a>
        ))}
      </div>
    </div>
  </section>
);

export default HomeIntegrationsSection;
