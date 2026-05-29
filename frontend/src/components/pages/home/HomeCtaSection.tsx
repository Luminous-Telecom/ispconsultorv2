import React from 'react';
import { CONTATO } from './homeConstants';

interface HomeCtaSectionProps {
  showContato: boolean;
  setShowContato: React.Dispatch<React.SetStateAction<boolean>>;
  ctaButtonsRef: React.RefObject<HTMLDivElement | null>;
}

const HomeCtaSection: React.FC<HomeCtaSectionProps> = ({
  showContato,
  setShowContato,
  ctaButtonsRef,
}) => (
  <section id="cta" className="home-cta">
    <div className="home-cta-inner">
      <h2 className="home-cta-title">Pronto para transformar sua gestão?</h2>
      <p className="home-cta-desc">
        Comece a gerenciar seu negócio com eficiência usando o BackNet
      </p>
      <div className="home-cta-buttons" ref={ctaButtonsRef}>
        {!showContato ? (
          <button type="button" className="home-btn home-btn-cta-outline" onClick={() => setShowContato(true)}>
            Agendar Demonstração
          </button>
        ) : (
          <>
            <a href={CONTATO.whatsapp} target="_blank" rel="noopener noreferrer" className="home-btn home-btn-contato">
              <span className="bi bi-whatsapp" />
              WhatsApp
            </a>
            <a href={CONTATO.telegram} target="_blank" rel="noopener noreferrer" className="home-btn home-btn-contato">
              <span className="bi bi-telegram" />
              Telegram
            </a>
          </>
        )}
      </div>
      <p className="home-cta-note">60 dias de teste gratuito. Sem cartão de crédito necessário.</p>
    </div>
  </section>
);

export default HomeCtaSection;
