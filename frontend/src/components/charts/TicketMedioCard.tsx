import React, { useEffect, useState } from 'react';
import { DynamicStyledElement } from 'components/ui';
import { formatCurrency } from 'utils/formatters';
import { useI18n } from 'contexts/I18nContext';
import { hexToRgba } from './chartColors';
import { COLOR } from 'constants/colors';

export interface TicketMedioMes {
  mes: string;
  valor: number;
  color?: string;
}

export interface TicketMedioData {
  ticketMedio: number;
  seriesMensal: TicketMedioMes[];
}

export interface TicketMedioCardProps {
  data: TicketMedioData;
}

const DEFAULT_BAR_COLOR = COLOR.indigo;

const HorizontalRanking: React.FC<{ series: TicketMedioMes[]; className?: string }> = ({
  series,
  className,
}) => {
  const max = Math.max(...series.map((s) => s.valor), 1);
  const [grown, setGrown] = useState(false);
  const ordered = [...series].sort((a, b) => b.valor - a.valor);

  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={className}>
      {ordered.map((item, i) => {
        const pct = max > 0 ? (item.valor / max) * 100 : 0;
        const color = item.color || DEFAULT_BAR_COLOR;
        const width = grown ? `${Math.max(pct, 4)}%` : '0%';
        return (
          <div key={i} className="ticket-medio-ranking-item">
            <span className="ticket-medio-ranking-label" title={item.mes}>
              {item.mes}
            </span>
            <DynamicStyledElement
              className="ticket-medio-ranking-track"
              properties={{ background: hexToRgba(color, 0.14) }}
              deps={[color]}
            >
              <DynamicStyledElement
                className="ticket-medio-ranking-fill"
                properties={{
                  width,
                  background: `linear-gradient(90deg, ${hexToRgba(color, 0.7)} 0%, ${color} 100%)`,
                }}
                deps={[width, color]}
              />
            </DynamicStyledElement>
            <span className="ticket-medio-ranking-value">{formatCurrency(item.valor)}</span>
          </div>
        );
      })}
    </div>
  );
};

const TicketMedioCard: React.FC<TicketMedioCardProps> = ({ data }) => {
  const { t } = useI18n();

  return (
    <div className="ticket-medio-card">
      <div className="pie-metric-header ticket-medio-card__header">
        <span className="pie-metric-header__title ticket-medio-card__title">
          {t('dashboard.averageTicket')}
        </span>
      </div>

      <div className="ticket-medio-card__body">
        <div className="ticket-medio-card__value">{formatCurrency(data.ticketMedio)}</div>

        {data.seriesMensal.length > 0 && (
          <HorizontalRanking series={data.seriesMensal} className="ticket-medio-card__ranking" />
        )}
      </div>
    </div>
  );
};

export default TicketMedioCard;
