import React from 'react';
import { FEATURES } from './homeConstants';

const HomeFeaturesSection: React.FC = () => (
  <section id="recursos" className="home-section home-features">
    <div className="home-section-inner">
      <div className="home-section-header">
        <h2 className="home-section-title">Recursos Completos</h2>
        <p className="home-section-desc">
          Todas as ferramentas que você precisa para gerenciar sua consultoria de telecomunicações
        </p>
      </div>
      <div className="home-features-grid">
        {FEATURES.map((f) => (
          <article key={f.title} className="home-feature-card">
            <div className="home-feature-icon-wrap">
              <span className={`bi ${f.icon}`} />
            </div>
            <h3 className="home-feature-title">{f.title}</h3>
            <p className="home-feature-desc">{f.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default HomeFeaturesSection;
