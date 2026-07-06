import React from 'react';
import { AUTOATENDIMENTO, WIKI_HOME_URL } from './homeConstants';
import HomeSectionHeader from './HomeSectionHeader';

interface HomeAutoatendimentoSectionProps {
  scrollTo: (id: string) => void;
  onShowContato: () => void;
}

const HomeAutoatendimentoSection: React.FC<HomeAutoatendimentoSectionProps> = ({
  scrollTo,
  onShowContato,
}) => {
  const handleAction = (action: (typeof AUTOATENDIMENTO)[number]['action']) => {
    switch (action) {
      case 'login':
        window.open('/login', '_blank', 'noopener,noreferrer');
        break;
      case 'wiki':
        window.open(WIKI_HOME_URL, '_blank', 'noopener,noreferrer');
        break;
      case 'contato':
        onShowContato();
        scrollTo('cta');
        break;
      default:
        break;
    }
  };

  return (
    <section id="autoatendimento" className="home-section home-autoatendimento">
      <div className="home-section-inner">
        <HomeSectionHeader
          title="Autoatendimento"
          description="Recursos para consultores e clientes — login, faturas, wiki e suporte."
        />
        <div className="home-autoatendimento-grid">
          {AUTOATENDIMENTO.map((item) => {
            const isClickable = item.action !== 'none';
            return (
              <div
                key={item.title}
                className={`home-autoatendimento-card ${isClickable ? 'home-autoatendimento-card-clickable' : ''}`}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={isClickable ? () => handleAction(item.action) : undefined}
                onKeyDown={
                  isClickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleAction(item.action);
                        }
                      }
                    : undefined
                }
              >
                <span className={`bi ${item.icon} home-autoatendimento-icon`} aria-hidden />
                <h3 className="home-autoatendimento-title">{item.title}</h3>
                <p className="home-autoatendimento-desc">{item.desc}</p>
                {isClickable ? (
                  <span className="bi bi-chevron-right home-autoatendimento-arrow" aria-hidden />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeAutoatendimentoSection;
