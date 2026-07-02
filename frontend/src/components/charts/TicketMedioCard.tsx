import React, { useEffect, useState } from 'react';
import { formatCurrency } from 'utils/formatters';
import { useI18n } from 'contexts/I18nContext';
import { hexToRgba } from './chartColors';

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

const DEFAULT_BAR_COLOR = '#6366f1';

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
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--text-secondary, rgba(255,255,255,0.65))',
                width: '30%',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={item.mes}
            >
              {item.mes}
            </span>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                height: 9,
                borderRadius: 5,
                background: hexToRgba(color, 0.14),
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: grown ? `${Math.max(pct, 4)}%` : '0%',
                  background: `linear-gradient(90deg, ${hexToRgba(color, 0.7)} 0%, ${color} 100%)`,
                  borderRadius: 5,
                  transition: 'width 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--text-primary)',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {formatCurrency(item.valor)}
            </span>
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
