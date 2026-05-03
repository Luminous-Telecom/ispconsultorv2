import React, { useRef, useEffect } from 'react';
import {
  Chart,
  ArcElement,
  DoughnutController,
  Tooltip,
} from 'chart.js';

Chart.register(ArcElement, DoughnutController, Tooltip);

export interface ClientesData {
  ativos: number;
  inativos: number;
  variacaoAtivos?: string;
  variacaoInativos?: string;
  periodo: string;
}

export interface ClientesCardProps {
  data: ClientesData;
  onSliceClick?: (ativo: boolean) => void;
}

const COR_ATIVOS = '#534AB7';
const COR_INATIVOS = '#D85A30';

const ClientesCard: React.FC<ClientesCardProps> = ({ data, onSliceClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onSliceClickRef = useRef(onSliceClick);
  onSliceClickRef.current = onSliceClick;

  const total = data.ativos + data.inativos;
  const pctAtivos = total > 0 ? Math.round((data.ativos / total) * 100) : 0;
  const pctInativos = total > 0 ? 100 - pctAtivos : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    const totalVal = data.ativos + data.inativos;

    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Ativos', 'Inativos'],
        datasets: [
          {
            data: [data.ativos, data.inativos],
            backgroundColor: [COR_ATIVOS, COR_INATIVOS],
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        cutout: '72%',
        animation: { duration: 400 },
        onClick: (_event, elements) => {
          if (!elements.length) return;
          const idx = elements[0].index; // 0 = ativos, 1 = inativos
          onSliceClickRef.current?.(idx === 0);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = totalVal > 0 ? Math.round((Number(ctx.raw) / totalVal) * 100) : 0;
                return ` ${ctx.label}: ${pct}%`;
              },
            },
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [data.ativos, data.inativos, data.periodo, data.variacaoAtivos, data.variacaoInativos]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 12,
        border: '0.5px solid rgba(0,0,0,0.12)',
        background: 'var(--bg-secondary)',
        overflow: 'hidden',
        padding: '12px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
              stroke="#534AB7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="7" r="4" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M23 21v-2a4 4 0 0 0-3-3.87"
              stroke="#534AB7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 3.13a4 4 0 0 1 0 7.75"
              stroke="#534AB7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <span
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          Base de clientes
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

      {/* Gráfico doughnut com centro */}
      <div
        style={{
          position: 'relative',
          width: 140,
          height: 140,
          margin: '0 auto 12px',
        }}
      >
        <canvas ref={canvasRef} width={140} height={140} style={{ display: 'block', cursor: onSliceClick ? 'pointer' : 'default' }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: 'var(--text-primary)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {total.toLocaleString('pt-BR')}
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-secondary, rgba(255,255,255,0.5))',
              marginTop: 2,
            }}
          >
            total
          </span>
        </div>
      </div>

      {/* Cards Ativos / Inativos */}
      <div style={{ display: 'flex', gap: 8 }}>
        {/* Ativos */}
        <div
          style={{
            flex: 1,
            background: '#EEEDFE',
            borderRadius: 8,
            padding: '8px 10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: COR_ATIVOS,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#3C3489' }}>Ativos</span>
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 500,
              color: '#26215C',
              lineHeight: 1.2,
              marginBottom: 3,
            }}
          >
            {data.ativos.toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: 10, color: '#534AB7' }}>
            {pctAtivos}%{data.variacaoAtivos ? ` · ${data.variacaoAtivos}` : ''}
          </div>
        </div>

        {/* Inativos */}
        <div
          style={{
            flex: 1,
            background: '#FAECE7',
            borderRadius: 8,
            padding: '8px 10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: COR_INATIVOS,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#993C1D' }}>Inativos</span>
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 500,
              color: '#4A1B0C',
              lineHeight: 1.2,
              marginBottom: 3,
            }}
          >
            {data.inativos.toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: 10, color: '#993C1D' }}>
            {pctInativos}%{data.variacaoInativos ? ` · ${data.variacaoInativos}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientesCard;
