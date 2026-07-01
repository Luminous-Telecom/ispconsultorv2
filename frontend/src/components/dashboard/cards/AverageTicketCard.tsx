import React from 'react';
import { TicketMedioCard, type TicketMedioData } from 'components/charts';

export interface AverageTicketCardProps {
  data: TicketMedioData;
  /** `compact` (largura fixa da linha compacta) ou `metric` (preenche a coluna). */
  variant?: 'compact' | 'metric';
}

/** Card de ticket médio (ranking horizontal moderno). */
const AverageTicketCard: React.FC<AverageTicketCardProps> = ({ data, variant = 'compact' }) => (
  <div
    className={`chart-card chart-card-pie chart-card-pie--metric${variant === 'compact' ? ' chart-card-pie--sm' : ''}`}
  >
    <TicketMedioCard data={data} />
  </div>
);

export default AverageTicketCard;
