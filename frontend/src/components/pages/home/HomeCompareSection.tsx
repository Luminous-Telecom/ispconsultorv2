import React from 'react';
import { COMPARE_ANTES, COMPARE_DEPOIS } from './homeConstants';

const HomeCompareSection: React.FC = () => (
  <section id="compare" className="home-section home-compare">
    <div className="home-section-inner">
      <div className="home-section-header">
        <h2 className="home-section-title">É para você?</h2>
        <p className="home-section-desc">
          Se você se identificou com "Planilha ou sistema descentralizado", o ISP Consultor foi feito para sua consultoria.
        </p>
      </div>
      <div className="home-compare-grid">
        <div className="home-compare-col home-compare-antigo">
          <h3 className="home-compare-col-title">
            <span className="bi bi-x-circle" />
            Planilha ou sistema descentralizado
          </h3>
          <ul className="home-compare-list">
            {COMPARE_ANTES.map((item) => (
              <li key={item}>
                <span className="bi bi-x" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="home-compare-col home-compare-novo">
          <h3 className="home-compare-col-title">
            <span className="bi bi-check-circle-fill" />
            Com o ISP Consultor
          </h3>
          <ul className="home-compare-list">
            {COMPARE_DEPOIS.map((item) => (
              <li key={item}>
                <span className="bi bi-check-lg" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);

export default HomeCompareSection;
