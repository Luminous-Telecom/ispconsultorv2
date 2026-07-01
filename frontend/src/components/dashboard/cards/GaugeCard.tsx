import React, { useEffect, useId, useState } from 'react';
import { hexToRgba } from 'components/charts/chartColors';

export interface GaugeDetailRow {
  label: string;
  value: React.ReactNode;
}

export interface GaugeCardProps {
  title: string;
  /** Percentual preenchido do medidor (0-100). */
  usedPercent: number;
  /** Rótulo curto exibido abaixo do percentual no centro (ex.: "Uso"). */
  usageLabel: string;
  rows: GaugeDetailRow[];
}

function getUsageColor(percent: number): string {
  if (percent >= 90) return '#ef4444';
  if (percent >= 70) return '#f59e0b';
  return '#10b981';
}

const SIZE = 108;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

/** Card de uso de recurso com medidor radial animado (RAM, disco, etc.). */
const GaugeCard: React.FC<GaugeCardProps> = ({ title, usedPercent, usageLabel, rows }) => {
  const gradientId = useId();
  const pct = Math.max(0, Math.min(100, usedPercent));
  const color = getUsageColor(pct);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    setGrown(false);
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const offset = grown ? CIRC * (1 - pct / 100) : CIRC;

  return (
    <div className="chart-card d-flex flex-column">
      <h6 className="chart-title mb-2">{title}</h6>

      <div className="d-flex justify-content-center mb-2">
        <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={hexToRgba(color, 0.65)} />
                <stop offset="100%" stopColor={color} />
              </linearGradient>
            </defs>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={hexToRgba(color, 0.14)}
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.03em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {pct}%
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {usageLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="d-flex flex-column gap-1 mt-auto">
        {rows.map((row) => (
          <div key={row.label} className="d-flex justify-content-between align-items-center">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {row.label}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GaugeCard;
