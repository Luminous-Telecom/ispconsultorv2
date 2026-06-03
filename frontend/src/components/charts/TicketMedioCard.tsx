import React, { useState } from 'react';
import { formatCurrency } from 'utils/formatters';
import { useI18n } from 'contexts/I18nContext';
import { LabelWithHelp } from 'components/ui/LabelWithHelp';
import { ChartFloatingTooltip, ChartFloatingTooltipData } from './ChartFloatingTooltip';

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

const BAR_ZONE_MIN_HEIGHT_PX = 80;
const DEFAULT_BAR_COLOR = '#534AB7';

const BarChart: React.FC<{ series: TicketMedioMes[]; chartSubtitle: string }> = ({ series, chartSubtitle }) => {
  const max = Math.max(...series.map((s) => s.valor), 1);
  const [tooltip, setTooltip] = useState<ChartFloatingTooltipData | null>(null);

  return (
    <div
      style={{
        flex: '1 1 auto',
        minHeight: BAR_ZONE_MIN_HEIGHT_PX,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 8,
        padding: '5px 8px 4px',
        marginTop: 4,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-secondary, rgba(255,255,255,0.4))', letterSpacing: '0.06em', marginBottom: 4, flexShrink: 0 }}>
        {chartSubtitle}
      </div>
      <div
        style={{
          flex: '1 1 auto',
          minHeight: BAR_ZONE_MIN_HEIGHT_PX - 28,
          display: 'flex',
          alignItems: 'stretch',
          gap: 4,
        }}
      >
        {series.map((item, i) => {
          const heightPct = max > 0 ? (item.valor / max) * 100 : 12;
          const barHeightPct = Math.max(heightPct, 12);
          const barColor = item.color || DEFAULT_BAR_COLOR;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 0,
                height: '100%',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                setTooltip({
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8,
                  label: item.mes,
                  value: formatCurrency(item.valor),
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 600,
                  color: 'var(--text-secondary, rgba(255,255,255,0.55))',
                  textAlign: 'center',
                  lineHeight: 1.15,
                  width: '100%',
                  marginBottom: 4,
                  flexShrink: 0,
                }}
              >
                {formatCurrency(item.valor)}
              </span>
              <div style={{ flex: 1, minHeight: 36, width: '100%', position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: `${barHeightPct}%`,
                    background: barColor,
                    borderRadius: '3px 3px 2px 2px',
                    opacity: 0.85,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
                />
              </div>
              <span
                style={{
                  fontSize: 9,
                  marginTop: 4,
                  color: barColor,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {item.mes}
              </span>
            </div>
          );
        })}
      </div>

      <ChartFloatingTooltip data={tooltip} />
    </div>
  );
};

const TicketMedioCard: React.FC<TicketMedioCardProps> = ({ data }) => {
  const { t } = useI18n();
  const ticketInfoText = t('dashboard.averageTicketInfo');
  const chartSubtitle = t('dashboard.averageTicketByPlanType');

  return (
    <div
      className="ticket-medio-card"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <div className="pie-metric-header">
        <div className="pie-metric-header__icon" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="5" width="20" height="14" rx="2" stroke="#534AB7" strokeWidth="2" />
            <path d="M2 10h20" stroke="#534AB7" strokeWidth="2" />
          </svg>
        </div>
        <div className="pie-metric-header__title-with-help">
          <LabelWithHelp as="span" className="pie-metric-header__title" helpText={ticketInfoText}>
            {t('dashboard.averageTicket')}
          </LabelWithHelp>
        </div>
        <span className="pie-metric-header__badge">{t('dashboard.averageTicketBadge')}</span>
      </div>

      <div style={{ marginBottom: 3 }}>
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-secondary, rgba(255,255,255,0.5))',
            marginBottom: 2,
          }}
        >
          {t('dashboard.averageTicketMainCaption')}
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          {formatCurrency(data.ticketMedio)}
        </div>
      </div>

      {data.seriesMensal.length > 0 && (
        <div style={{ flex: '1 1 auto', minHeight: BAR_ZONE_MIN_HEIGHT_PX, display: 'flex', flexDirection: 'column' }}>
          <BarChart series={data.seriesMensal} chartSubtitle={chartSubtitle} />
        </div>
      )}
    </div>
  );
};

export default TicketMedioCard;
