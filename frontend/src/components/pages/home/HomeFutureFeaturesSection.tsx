import React from 'react';
import { FUTURE_FEATURES } from './homeConstants';

const HomeFutureFeaturesSection: React.FC = () => (
  <section id="recursos-futuros" className="home-section home-future-features">
    <div className="home-section-inner">
      <div className="home-section-header">
        <h2 className="home-section-title">Módulos em desenvolvimento</h2>
        <p className="home-section-desc">
          Novos módulos em desenvolvimento para otimizar ainda mais sua operação
        </p>
      </div>
      <div className="home-features-grid">
        {FUTURE_FEATURES.map((f) => (
          <article key={f.title} className="home-feature-card home-feature-card-future">
            <div className="home-feature-icon-wrap">
              <span className={`bi ${f.icon}`} />
            </div>
            <span className="home-feature-badge">Em breve</span>
            <h3 className="home-feature-title">{f.title}</h3>
            <p className="home-feature-desc">{f.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default HomeFutureFeaturesSection;
