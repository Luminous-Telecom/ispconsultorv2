import React, { memo } from 'react';
import { PieLegendDot } from 'components/ui';
import { ChartDataItem } from '../types';
import { formatPieValue } from './utils';
import { CHART_MUTED_COLOR } from '../chartColors';

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
            className={`pie-legend-item ${isHidden ? 'pie-legend-item--hidden' : ''}`}
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
          >
            <PieLegendDot color={item.color || CHART_MUTED_COLOR} />
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
