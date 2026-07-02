import React from 'react';
import { DynamicStyledElement } from 'components/ui';
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
      <DynamicStyledElement
        className="mt-auto stat-tiles-grid-dynamic"
        properties={{ '--stat-tiles-cols': cols }}
        deps={[cols]}
      >
        {tiles.map((tile) => {
          const accent = tile.accent || DEFAULT_ACCENT;
          return (
            <DynamicStyledElement
              key={tile.label}
              className="stat-tile-dynamic"
              properties={{
                '--stat-tile-accent': accent,
                background: hexToRgba(accent, 0.1),
                borderLeft: `3px solid ${accent}`,
              }}
              deps={[accent]}
            >
              <div
                className="stat-tile-value-dynamic"
                title={typeof tile.value === 'string' || typeof tile.value === 'number' ? String(tile.value) : undefined}
              >
                {tile.value}
              </div>
              <div className="stat-tile-label-dynamic" title={tile.label}>
                {tile.label}
              </div>
            </DynamicStyledElement>
          );
        })}
      </DynamicStyledElement>
    </div>
  );
};

export default StatTilesCard;
