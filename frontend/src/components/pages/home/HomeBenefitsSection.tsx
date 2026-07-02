import React from 'react';
import { NavLinkButton } from 'components/ui';
import { BENEFITS } from './homeConstants';

interface HomeBenefitsSectionProps {
  onOpenLightbox: (src: string) => void;
}

const HomeBenefitsSection: React.FC<HomeBenefitsSectionProps> = ({ onOpenLightbox }) => (
  <section id="beneficios" className="home-section home-benefits">
    <div className="home-section-inner home-benefits-inner">
      <div className="home-benefits-visual">
        <div className="home-benefits-glow" />
        <NavLinkButton
          type="button"
          className="home-benefits-visual-link"
          onClick={() => onOpenLightbox('/dashboard%20clara.png')}
          ariaLabel="Ampliar imagem do dashboard"
        >
          <img src="/dashboard%20clara.png" alt="BackNet Dashboard" className="home-benefits-img" />
        </NavLinkButton>
      </div>
      <div className="home-benefits-content">
        <h2 className="home-section-title">Por que escolher BackNet?</h2>
        <p className="home-benefits-intro">
          Desenvolvido especificamente para consultores de telecomunicações que buscam eficiência e crescimento
        </p>
        <div className="home-benefits-list">
          {BENEFITS.map((b) => (
            <div key={b.title} className="home-benefit-item">
              <span className="bi bi-check-circle-fill home-benefit-icon" />
              <div>
                <h3 className="home-benefit-title">{b.title}</h3>
                <p className="home-benefit-desc">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HomeBenefitsSection;
