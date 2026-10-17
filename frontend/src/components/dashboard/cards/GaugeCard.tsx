import React, { useEffect, useId, useRef, useState } from 'react';
import { useElementProperties } from 'hooks/useElementProperties';
import { hexToRgba } from 'components/charts/chartColors';
import { COLOR } from 'constants/colors';

export interface GaugeDetailRow {
  label: string;
  value: React.ReactNode;
}

export interface GaugeCardProps {
  title: string;
  usedPercent: number;
  usageLabel: string;
  rows: GaugeDetailRow[];
}

function getUsageColor(percent: number): string {
  if (percent >= 90) return COLOR.red;
  if (percent >= 70) return COLOR.amber;
  return COLOR.emerald;
}

const SIZE = 108;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

const GaugeCard: React.FC<GaugeCardProps> = ({ title, usedPercent, usageLabel, rows }) => {
  const gradientId = useId();
  const pct = Math.max(0, Math.min(100, usedPercent));
  const color = getUsageColor(pct);
  const [grown, setGrown] = useState(false);
  const progressCircleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    setGrown(false);
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const offset = grown ? CIRC * (1 - pct / 100) : CIRC;

  useElementProperties(progressCircleRef as React.RefObject<HTMLElement | null>, { strokeDashoffset: offset }, [offset]);

  return (
    <div className="chart-card d-flex flex-column">
      <h6 className="chart-title mb-2">{title}</h6>

      <div className="d-flex justify-content-center mb-2">
        <div className="gauge-card-ring">
          <svg width={SIZE} height={SIZE} className="gauge-card-svg">
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
              ref={progressCircleRef}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              className="gauge-card-circle-animated"
            />
          </svg>
          <div className="gauge-card-center">
            <span className="gauge-card-pct">{pct}%</span>
            <span className="gauge-card-usage-label">{usageLabel}</span>
          </div>
        </div>
      </div>

      <div className="d-flex flex-column gap-1 mt-auto">
        {rows.map((row) => (
          <div key={row.label} className="d-flex justify-content-between align-items-center">
            <span className="gauge-row-label">{row.label}</span>
            <span className="gauge-row-value">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GaugeCard;
