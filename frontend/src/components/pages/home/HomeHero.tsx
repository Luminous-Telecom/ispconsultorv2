import React from 'react';
import { AppButton, NavLinkButton } from 'components/ui';

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
        <AppButton
          type="button"
          label="Saiba mais"
          variant="unstyled"
          className="home-btn home-btn-outline"
          onClick={() => scrollTo('recursos')}
        />
      </div>
    </div>
    <div className="home-hero-visual">
      <div className="home-hero-visual-glow" />
      <NavLinkButton
        type="button"
        className="home-hero-visual-link"
        onClick={() => onOpenLightbox('/dashboard.png')}
        ariaLabel="Ampliar imagem do dashboard"
      >
        <img src="/dashboard.png" alt="BackNet Dashboard" className="home-hero-visual-img" />
      </NavLinkButton>
    </div>
  </section>
);

export default HomeHero;
