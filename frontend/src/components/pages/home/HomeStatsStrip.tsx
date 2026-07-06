import React from 'react';
import { STATS_STRIP } from './homeConstants';

const HomeStatsStrip: React.FC = () => (
  <section className="home-stats" aria-label="Destaques do sistema">
    <div className="home-stats-inner">
      {STATS_STRIP.map((item) => (
        <div key={item.label} className="home-stats-item">
          <span className="home-stats-value">{item.value}</span>
          <span className="home-stats-label">{item.label}</span>
        </div>
      ))}
    </div>
  </section>
);

export default HomeStatsStrip;
