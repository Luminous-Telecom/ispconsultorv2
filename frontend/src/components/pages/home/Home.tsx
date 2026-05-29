import React from 'react';
import HomeHeader from './HomeHeader';
import HomeHero from './HomeHero';
import HomeCompareSection from './HomeCompareSection';
import HomeFeaturesSection from './HomeFeaturesSection';
import HomeIntegrationsSection from './HomeIntegrationsSection';
import HomeAutoatendimentoSection from './HomeAutoatendimentoSection';
import HomeBenefitsSection from './HomeBenefitsSection';
import HomePlanosSection from './HomePlanosSection';
import HomeFaqSection from './HomeFaqSection';
import HomeFutureFeaturesSection from './HomeFutureFeaturesSection';
import HomeCtaSection from './HomeCtaSection';
import HomeFooter from './HomeFooter';
import HomeLightbox from './HomeLightbox';
import { useHomePage } from './useHomePage';
import './Home.scss';

const Home: React.FC = () => {
  const {
    theme,
    toggleTheme,
    isMenuOpen,
    setIsMenuOpen,
    showContato,
    setShowContato,
    faqOpen,
    setFaqOpen,
    lightboxSrc,
    setLightboxSrc,
    ctaButtonsRef,
    scrollTo,
  } = useHomePage();

  return (
    <div className="home-page">
      <HomeHeader
        theme={theme}
        toggleTheme={toggleTheme}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        scrollTo={scrollTo}
      />

      <main className="home-main">
        <HomeHero scrollTo={scrollTo} onOpenLightbox={setLightboxSrc} />
        <HomeCompareSection />
        <HomeFeaturesSection />
        <HomeIntegrationsSection />
        <HomeAutoatendimentoSection
          scrollTo={scrollTo}
          onShowContato={() => setShowContato(true)}
        />
        <HomeBenefitsSection onOpenLightbox={setLightboxSrc} />
        <HomePlanosSection />
        <HomeFaqSection faqOpen={faqOpen} setFaqOpen={setFaqOpen} />
        <HomeFutureFeaturesSection />
        <HomeCtaSection
          showContato={showContato}
          setShowContato={setShowContato}
          ctaButtonsRef={ctaButtonsRef}
        />
        <HomeFooter scrollTo={scrollTo} />
      </main>

      {lightboxSrc && (
        <HomeLightbox lightboxSrc={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
};

export default Home;
