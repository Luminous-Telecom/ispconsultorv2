import React from 'react';
import { AUTOATENDIMENTO } from './homeConstants';

interface HomeAutoatendimentoSectionProps {
  scrollTo: (id: string) => void;
  onShowContato: () => void;
}

const HomeAutoatendimentoSection: React.FC<HomeAutoatendimentoSectionProps> = ({
  scrollTo,
  onShowContato,
}) => (
  <section id="autoatendimento" className="home-section home-autoatendimento">
    <div className="home-section-inner">
      <div className="home-section-header">
        <h2 className="home-section-title">Autoatendimento para clientes</h2>
        <p className="home-section-desc">
          Acesse rapidamente os recursos disponíveis no ISP Consultor
        </p>
      </div>
      <div className="home-autoatendimento-grid">
        {AUTOATENDIMENTO.map((item) => {
          const isSuporte = item.title === 'Suporte';
          const isAcessarSistema = item.title === 'Acessar Sistema';
          const isClickable = isSuporte || isAcessarSistema;
          const handleClick = isSuporte
            ? () => {
                onShowContato();
                scrollTo('cta');
              }
            : isAcessarSistema
              ? () => window.open('/login', '_blank', 'noopener,noreferrer')
              : undefined;
          const handleKeyDown = isClickable
            ? (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick?.();
                }
              }
            : undefined;

          return (
            <div
              key={item.title}
              className={`home-autoatendimento-card ${isClickable ? 'home-autoatendimento-card-clickable' : ''}`}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
            >
              <span className={`bi ${item.icon} home-autoatendimento-icon`} />
              <h3 className="home-autoatendimento-title">{item.title}</h3>
              <p className="home-autoatendimento-desc">{item.desc}</p>
              <span className="bi bi-chevron-right home-autoatendimento-arrow" />
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default HomeAutoatendimentoSection;
