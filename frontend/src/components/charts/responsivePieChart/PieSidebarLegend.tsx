import React, { memo } from 'react';
import { ChartDataItem } from '../types';
import { formatPieValue } from './utils';

export interface PieLegendEntry {
  item: ChartDataItem;
  index: number;
  value: number;
}

interface PieSidebarLegendProps {
  legendData: PieLegendEntry[];
  hiddenItems: Set<number>;
  onToggleItem: (index: number) => void;
}

export const PieSidebarLegend = memo(function PieSidebarLegend({
  legendData,
  hiddenItems,
  onToggleItem,
}: PieSidebarLegendProps) {
  return (
    <ul className="pie-sidebar-legend">
      {legendData.map(({ item, index, value }) => {
        const isHidden = hiddenItems.has(index);
        return (
          <li
            key={index}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onToggleItem(index);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleItem(index);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 4px',
              cursor: 'pointer',
              opacity: isHidden ? 0.5 : 1,
              borderRadius: 'var(--border-radius, 8px)',
              fontSize: '0.625rem',
              textDecoration: isHidden ? 'line-through' : 'none',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                flexShrink: 0,
                backgroundColor: item.color || '#64748b',
                borderRadius: 2,
              }}
            />
            <span className="pie-sidebar-legend__text">
              {item.label || ''} {formatPieValue(value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
});

PieSidebarLegend.displayName = 'PieSidebarLegend';
