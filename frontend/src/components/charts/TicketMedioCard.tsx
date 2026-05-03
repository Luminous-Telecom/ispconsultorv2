import React, { useState } from 'react';
import { formatCurrency } from 'utils/formatters';

export interface TicketMedioMes {
  mes: string;
  valor: number;
}

export interface TicketMedioData {
  ticketMedio: number;
  variacaoTicket?: string;
  pedidos: number;
  variacaoPedidos?: string;
  receitaTotal: number;
  variacaoReceita?: string;
  periodo: string;
  seriesMensal: TicketMedioMes[];
}

export interface TicketMedioCardProps {
  data: TicketMedioData;
}

function parseVariacao(v?: string): { sinal: 1 | -1 | 0; texto: string } {
  if (!v) return { sinal: 0, texto: '' };
  const neg = v.startsWith('-');
  return { sinal: neg ? -1 : 1, texto: v };
}

const VariacaoBadge: React.FC<{ variacao?: string; sufixo?: string }> = ({ variacao, sufixo }) => {
  const { sinal, texto } = parseVariacao(variacao);
  if (!texto) return null;
  const cor = sinal >= 0 ? '#10b981' : '#ef4444';
  const bg = sinal >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 20,
        background: bg,
        color: cor,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        {sinal >= 0
          ? <path d="M5 8V2M2 5l3-3 3 3" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M5 2v6M2 5l3 3 3-3" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        }
      </svg>
      {texto}{sufixo ? ` ${sufixo}` : ''}
    </span>
  );
};

const BarChart: React.FC<{ series: TicketMedioMes[] }> = ({ series }) => {
  const max = Math.max(...series.map((s) => s.valor), 1);
  const last = series.length - 1;
  const [tooltip, setTooltip] = useState<{ x: number; y: number; item: TicketMedioMes } | null>(null);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
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
        ÚLTIMOS {series.length} MESES
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch', gap: 4 }}>
        {series.map((item, i) => {
          const heightPct = max > 0 ? (item.valor / max) * 100 : 12;
          const barHeightPct = Math.max(heightPct, 12);
          const isLast = i === last;
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
                setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, item });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <span
                style={{
                  fontSize: 8,
                  fontWeight: isLast ? 700 : 600,
                  color: isLast ? 'var(--text-primary)' : 'var(--text-secondary, rgba(255,255,255,0.55))',
                  textAlign: 'center',
                  lineHeight: 1.15,
                  width: '100%',
                  marginBottom: 4,
                  flexShrink: 0,
                }}
              >
                {formatCurrency(item.valor)}
              </span>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  width: '100%',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: `${barHeightPct}%`,
                    background: isLast ? '#a89fe8' : '#534AB7',
                    borderRadius: '3px 3px 2px 2px',
                    opacity: isLast ? 1 : 0.7,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = isLast ? '1' : '0.7')}
                />
              </div>
              <span
                style={{
                  fontSize: 9,
                  marginTop: 4,
                  color: isLast ? 'var(--text-primary)' : 'var(--text-secondary, rgba(255,255,255,0.4))',
                  fontWeight: isLast ? 700 : 400,
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

      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: 'var(--bg-tertiary, rgba(20,22,28,0.97))',
            color: 'var(--text-primary, #fff)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            padding: '5px 9px',
            fontSize: 11,
            fontWeight: 500,
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 1 }}>{tooltip.item.mes}</div>
          <div>{formatCurrency(tooltip.item.valor)}</div>
        </div>
      )}
    </div>
  );
};

const TicketMedioCard: React.FC<TicketMedioCardProps> = ({ data }) => {
  const { sinal: sinalTicket } = parseVariacao(data.variacaoTicket);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 10,
        border: '0.5px solid rgba(0,0,0,0.12)',
        background: 'var(--bg-secondary)',
        padding: '7px 8px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: '#EEEDFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="5" width="20" height="14" rx="2" stroke="#534AB7" strokeWidth="2" />
            <path d="M2 10h20" stroke="#534AB7" strokeWidth="2" />
          </svg>
        </div>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Ticket médio
        </span>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 20,
            background: '#EEEDFE',
            color: '#3C3489',
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {data.periodo}
        </span>
      </div>

      {/* Valor principal */}
      <div style={{ marginBottom: 3 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: 3,
          }}
        >
          {formatCurrency(data.ticketMedio)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <VariacaoBadge variacao={data.variacaoTicket} />
          {data.variacaoTicket && (
            <span style={{ fontSize: 10, color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}>
              vs mês anterior
            </span>
          )}
        </div>
        {sinalTicket !== 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0 0' }} />}
      </div>

      {/* Gráfico de barras — ocupa o espaço restante do card */}
      {data.seriesMensal.length > 0 && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <BarChart series={data.seriesMensal} />
        </div>
      )}
    </div>
  );
};

export default TicketMedioCard;
