import React from 'react';
import { hexToRgba } from 'components/charts/chartColors';

export interface StatTile {
  label: string;
  value: React.ReactNode;
  /** Cor de destaque (hex) do bloco. */
  accent?: string;
}

export interface StatTilesCardProps {
  title: string;
  tiles: StatTile[];
  /** Nº de colunas do grid (padrão: menor entre a qtde de blocos e 3). */
  columns?: number;
}

const DEFAULT_ACCENT = '#6366f1';

/** Card com blocos de métricas destacadas (agendador, servidor, etc.). */
const StatTilesCard: React.FC<StatTilesCardProps> = ({ title, tiles, columns }) => {
  const cols = columns ?? Math.min(tiles.length, 3);

  return (
    <div className="chart-card d-flex flex-column">
      <h6 className="chart-title mb-2">{title}</h6>
      <div
        className="mt-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: 8,
        }}
      >
        {tiles.map((tile) => {
          const accent = tile.accent || DEFAULT_ACCENT;
          return (
            <div
              key={tile.label}
              style={{
                minWidth: 0,
                borderRadius: 10,
                padding: '0.5rem 0.6rem',
                background: hexToRgba(accent, 0.1),
                borderLeft: `3px solid ${accent}`,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={typeof tile.value === 'string' || typeof tile.value === 'number' ? String(tile.value) : undefined}
              >
                {tile.value}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={tile.label}
              >
                {tile.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatTilesCard;
