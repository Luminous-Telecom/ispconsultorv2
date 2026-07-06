import React from 'react';
import { useTheme } from 'contexts/ThemeContext';
import { BENEFITS } from './homeConstants';
import HomeDashboardPreview from './HomeDashboardPreview';

interface HomeBenefitsSectionProps {
  onOpenLightbox: (src: string) => void;
}

const HomeBenefitsSection: React.FC<HomeBenefitsSectionProps> = ({ onOpenLightbox }) => {
  const { theme } = useTheme();

  return (
    <section id="beneficios" className="home-section home-benefits">
      <div className="home-section-inner home-benefits-inner">
        <div className="home-benefits-visual">
          <HomeDashboardPreview
            theme={theme}
            onOpenLightbox={onOpenLightbox}
            linkClassName="home-benefits-visual-link"
            imgClassName="home-benefits-img"
          />
        </div>
        <div className="home-benefits-content">
          <h2 className="home-section-title">Por que escolher ISP Consultor?</h2>
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
};

export default HomeBenefitsSection;
