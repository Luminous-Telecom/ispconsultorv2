import React from 'react';
import { INTEGRATIONS } from './homeConstants';

const HomeIntegrationsSection: React.FC = () => (
  <section id="integracoes" className="home-section home-integrations">
    <div className="home-section-inner">
      <div className="home-section-header">
        <h2 className="home-section-title">Integração com API</h2>
        <p className="home-section-desc">
          Conecte seus sistemas através da API do ISP Consultor
        </p>
      </div>
      <div className="home-integrations-grid">
        {INTEGRATIONS.map((item) => (
          <div key={item.title} className="home-integration-card">
            <div className="home-integration-icon">{item.emoji}</div>
            <h3 className="home-integration-title">{item.title}</h3>
            <p className="home-integration-desc">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HomeIntegrationsSection;
