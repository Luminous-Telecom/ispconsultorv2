import React from 'react';
import { AppButton } from 'components/ui';
import { useTheme } from 'contexts/ThemeContext';
import { HERO_CHECKS, WIKI_HOME_URL } from './homeConstants';
import HomeDashboardPreview from './HomeDashboardPreview';

interface HomeHeroProps {
  scrollTo: (id: string) => void;
  onOpenLightbox: (src: string) => void;
}

const HomeHero: React.FC<HomeHeroProps> = ({ scrollTo, onOpenLightbox }) => {
  const { theme } = useTheme();

  return (
    <section className="home-hero">
      <div className="home-hero-inner">
        <div className="home-hero-content">
          <h1 className="home-hero-title">
            Gestão para consultores de{' '}
            <span className="home-hero-accent">telecomunicações</span>
          </h1>
          <p className="home-hero-desc">
            ERP completo para consultores: clientes, contratos, financeiro, equipamentos, RPKI e wiki integrada.
          </p>
          <div className="home-hero-checks">
            {HERO_CHECKS.map((text) => (
              <div key={text} className="home-hero-check">
                <span className="home-hero-check-icon">✓</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div className="home-hero-buttons">
            <AppButton
              type="button"
              label="Agendar Demonstração"
              variant="unstyled"
              className="home-btn home-btn-accent"
              onClick={() => scrollTo('cta')}
            />
            <AppButton
              type="button"
              label="Central de Ajuda"
              variant="unstyled"
              className="home-btn home-btn-outline"
              onClick={() => window.open(WIKI_HOME_URL, '_blank', 'noopener,noreferrer')}
            />
            <AppButton
              type="button"
              label="Ver recursos"
              variant="unstyled"
              className="home-btn home-btn-outline"
              onClick={() => scrollTo('recursos')}
            />
          </div>
        </div>
        <div className="home-hero-visual">
          <HomeDashboardPreview
            theme={theme}
            onOpenLightbox={onOpenLightbox}
            linkClassName="home-hero-visual-link"
            imgClassName="home-hero-visual-img"
          />
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
