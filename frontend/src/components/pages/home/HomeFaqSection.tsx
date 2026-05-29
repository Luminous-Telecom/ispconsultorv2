import React from 'react';
import { FAQ_ITEMS } from './homeConstants';

interface HomeFaqSectionProps {
  faqOpen: number | null;
  setFaqOpen: React.Dispatch<React.SetStateAction<number | null>>;
}

const HomeFaqSection: React.FC<HomeFaqSectionProps> = ({ faqOpen, setFaqOpen }) => (
  <section id="faq" className="home-section home-faq">
    <div className="home-section-inner">
      <div className="home-section-header">
        <h2 className="home-section-title">Perguntas Frequentes</h2>
        <p className="home-section-desc">
          Tire suas dúvidas sobre o BackNet
        </p>
      </div>
      <div className="home-faq-list">
        {FAQ_ITEMS.map((item, i) => (
          <div key={item.question} className="home-faq-item">
            <button
              type="button"
              className="home-faq-question"
              onClick={() => setFaqOpen(faqOpen === i ? null : i)}
              aria-expanded={faqOpen === i}
            >
              <span>{item.question}</span>
              <span className={`bi ${faqOpen === i ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
            </button>
            {faqOpen === i && <p className="home-faq-answer">{item.answer}</p>}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HomeFaqSection;
