import React from 'react';

interface HomeHeroProps {
  scrollTo: (id: string) => void;
  onOpenLightbox: (src: string) => void;
}

const HomeHero: React.FC<HomeHeroProps> = ({ scrollTo, onOpenLightbox }) => (
  <section className="home-hero">
    <div className="home-hero-content">
      <h1 className="home-hero-title">
        Gestão para consultores de <span className="home-hero-accent">telecomunicações</span>
      </h1>
      <p className="home-hero-desc">
        Clientes, contratos, cobrança e NFS-e em um só lugar.
      </p>
      <div className="home-hero-checks">
        <div className="home-hero-check">
          <span className="home-hero-check-icon">✓</span>
          <span>Gestão completa de clientes e contratos</span>
        </div>
        <div className="home-hero-check">
          <span className="home-hero-check-icon">✓</span>
          <span>Integração de Bolix com Asaas e Efí</span>
        </div>
        <div className="home-hero-check">
          <span className="home-hero-check-icon">✓</span>
          <span>Automação de processos e notificações</span>
        </div>
      </div>
      <div className="home-hero-buttons">
        <button type="button" className="home-btn home-btn-outline" onClick={() => scrollTo('recursos')}>
          Saiba mais
        </button>
      </div>
    </div>
    <div className="home-hero-visual">
      <div className="home-hero-visual-glow" />
      <button type="button" className="home-hero-visual-link" onClick={() => onOpenLightbox('/dashboard.png')}>
        <img src="/dashboard.png" alt="BackNet Dashboard" className="home-hero-visual-img" />
      </button>
    </div>
  </section>
);

export default HomeHero;
