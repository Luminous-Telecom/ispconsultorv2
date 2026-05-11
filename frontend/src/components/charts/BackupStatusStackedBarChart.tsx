import React, { useRef, useLayoutEffect, useEffect, useState, useMemo, memo, useCallback } from 'react';
import * as d3 from 'd3';
import { ChartEmptyState } from './ChartEmptyState';
import { InfoHelpIcon } from 'components/ui/InfoHelpIcon';

export type BackupStatusKey = 'sucesso' | 'somente_local' | 'falha_envio' | 'verificado' | 'falha';

export interface BackupStatusDayDatum {
  label: string;
  dataISO: string;
  falha: number;
  sucesso: number;
  somente_local: number;
  falha_envio: number;
  verificado: number;
}

/** No card do dashboard: só sucesso e falha (legenda sem local, falha envio, verificado). */
const STACK_KEYS: BackupStatusKey[] = ['sucesso', 'falha'];

const STATUS_COLORS: Record<BackupStatusKey, string> = {
  sucesso: '#22c55e',
  somente_local: '#eab308',
  falha_envio: '#f97316',
  verificado: '#3b82f6',
  falha: '#ef4444',
};

function BackupStatusHeaderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="6" rx="1.5" stroke="#534AB7" strokeWidth="2" />
      <rect x="4" y="12" width="10" height="8" rx="1.5" stroke="#534AB7" strokeWidth="2" />
      <path d="M16 14v6M13 17h6" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export interface BackupStatusStackedBarChartProps {
  days: BackupStatusDayDatum[];
  title: string;
  legendLabels: Record<BackupStatusKey, string>;
  emptyMessage?: string;
  onSegmentClick?: (dataISO: string, status: BackupStatusKey) => void;
  /** Chaves ocultas via legenda (mesmo padrão do ResponsivePieChart). */
  hiddenKeys?: ReadonlySet<string>;
  onLegendToggle?: (key: BackupStatusKey) => void;
  /** Badge de período (ex.: mês) quando não há falhas para destacar. */
  headerPeriodBadge?: string;
  /** Texto do alerta de falhas (ex.: "2 falhas detectadas"); se ausente e sem período, sem badge. */
  failureBadgeText?: string | null;
  /** True se existir backup em algum dia do período filtrado (evita vazio quando só a janela dos últimos 7 dias está zerada). */
  periodHasBackupEvents: boolean;
  /** Texto do tooltip do ícone de informação ao lado do título */
  headerInfo?: string;
}

const BackupStatusStackedBarChart: React.FC<BackupStatusStackedBarChartProps> = memo(
  ({
    days,
    title,
    legendLabels,
    emptyMessage,
    onSegmentClick,
    hiddenKeys,
    onLegendToggle,
    headerPeriodBadge,
    failureBadgeText,
    periodHasBackupEvents,
    headerInfo,
  }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(400);

    const chartData = useMemo(
      () =>
        days.map((d) => ({
          label: d.label,
          dataISO: d.dataISO,
          sucesso: d.sucesso,
          somente_local: d.somente_local,
          falha_envio: d.falha_envio,
          verificado: d.verificado,
          falha: d.falha,
        })),
      [days]
    );

    const visibleKeys = useMemo(
      () => STACK_KEYS.filter((k) => !hiddenKeys?.has(k)),
      [hiddenKeys]
    );

    const maxTotalAll = useMemo(
      () =>
        chartData.length > 0
          ? Math.max(
              1,
              ...chartData.map((d) =>
                STACK_KEYS.reduce((s, k) => s + (Number(d[k]) || 0), 0)
              )
            )
          : 0,
      [chartData]
    );

    const maxTotal = useMemo(() => {
      if (chartData.length === 0) return 0;
      if (visibleKeys.length === 0) return maxTotalAll;
      return Math.max(
        1,
        ...chartData.map((d) => visibleKeys.reduce((s, k) => s + (Number(d[k]) || 0), 0))
      );
    }, [chartData, visibleKeys, maxTotalAll]);

    const hasCountsInWindow = useMemo(
      () =>
        chartData.some(
          (d) =>
            (Number(d.sucesso) || 0) +
              (Number(d.somente_local) || 0) +
              (Number(d.falha_envio) || 0) +
              (Number(d.verificado) || 0) +
              (Number(d.falha) || 0) >
            0
        ),
      [chartData]
    );

    const showChartBody =
      chartData.length > 0 && (hasCountsInWindow || periodHasBackupEvents);

    useLayoutEffect(() => {
      const el = wrapRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => {
        const w = el.getBoundingClientRect().width;
        setWidth(Math.max(160, w || 300));
      });
      ro.observe(el);
      setWidth(Math.max(160, el.getBoundingClientRect().width || 300));
      return () => ro.disconnect();
    }, []);

    const textMuted = useCallback(() => {
      if (typeof window === 'undefined') return '#94a3b8';
      const v = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
      return v || '#94a3b8';
    }, []);

    useEffect(() => {
      const svg = svgRef.current;
      if (!svg || chartData.length === 0 || (!hasCountsInWindow && !periodHasBackupEvents)) return;

      const isCompact = width < 300;
      const margin = {
        top: 6,
        right: isCompact ? 4 : 12,
        left: isCompact ? 22 : 36,
        bottom: isCompact ? 20 : 28,
      };
      const height = isCompact ? 140 : 200;
      const innerW = Math.max(1, width - margin.left - margin.right);
      const innerH = height - margin.top - margin.bottom;

      const stackKeys = visibleKeys.length > 0 ? visibleKeys : [];
      const series =
        stackKeys.length > 0
          ? d3.stack<typeof chartData[0]>().keys([...stackKeys])(chartData)
          : [];

      const x = d3
        .scaleBand<string>()
        .domain(chartData.map((d) => d.label))
        .range([0, innerW])
        .padding(0.25);

      const y = d3
        .scaleLinear()
        .domain([0, maxTotal])
        .nice()
        .range([innerH, 0]);

      const svgSel = d3.select(svg);
      svgSel.selectAll('*').remove();
      svgSel.attr('width', width).attr('height', height);

      const defs = svgSel.append('defs');
      const tooltipFilterId = `tooltip-shadow-${Math.random().toString(36).slice(2)}`;
      defs
        .append('filter')
        .attr('id', tooltipFilterId)
        .attr('x', '-20%')
        .attr('y', '-20%')
        .attr('width', '140%')
        .attr('height', '140%')
        .append('feDropShadow')
        .attr('dx', 0)
        .attr('dy', 4)
        .attr('stdDeviation', 6)
        .attr('flood-opacity', 0.25);

      const g = svgSel.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const axisColor = textMuted();
      const axisFontSize = isCompact ? '8px' : '10px';

      const gAxis = g.append('g').attr('class', 'y-axis').call(d3.axisLeft(y).ticks(isCompact ? 3 : 4).tickSize(-innerW));
      gAxis.selectAll('.tick line').attr('stroke', axisColor).attr('stroke-opacity', 0.35);
      gAxis.select('.domain').attr('stroke', axisColor);
      gAxis.selectAll('.tick text').attr('fill', axisColor).attr('font-size', axisFontSize);

      const gx = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x));
      gx.selectAll('text').attr('fill', axisColor).attr('font-size', axisFontSize);
      gx.select('.domain').attr('stroke', axisColor);

      series.forEach((serie) => {
        const statusKey = serie.key as BackupStatusKey;
        const color = STATUS_COLORS[statusKey] ?? '#64748b';
        g.append('g')
          .selectAll('rect')
          .data(serie)
          .join('rect')
          .attr('data-status-key', statusKey)
          .attr('x', (d) => x(d.data.label) ?? 0)
          .attr('y', (d) => y(d[1]))
          .attr('height', (d) => Math.max(0, y(d[0]) - y(d[1])))
          .attr('width', x.bandwidth())
          .attr('fill', color)
          .attr('rx', 2)
          .style('cursor', (d) => (onSegmentClick && y(d[0]) - y(d[1]) > 0.5 ? 'pointer' : 'default'))
          .on('click', (event, d) => {
            event.stopPropagation();
            const h = y(d[0]) - y(d[1]);
            if (h < 0.5 || !onSegmentClick) return;
            onSegmentClick(d.data.dataISO, statusKey);
          });
      });

      const tooltipG = svgSel.append('g').attr('class', 'chart-tooltip').style('opacity', 0).style('pointer-events', 'none');
      const tooltipBg = tooltipG
        .append('rect')
        .attr('rx', 6)
        .attr('ry', 6)
        .attr('fill', 'var(--bg-tertiary)')
        .attr('stroke', 'var(--border-color)')
        .attr('stroke-width', 1)
        .attr('filter', `url(#${tooltipFilterId})`);

      const tooltipContent = tooltipG.append('g').attr('transform', 'translate(12,12)');
      tooltipContent
        .append('text')
        .attr('class', 'tooltip-label')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .attr('fill', 'var(--text-muted)')
        .attr('y', 0);
      tooltipContent
        .append('text')
        .attr('class', 'tooltip-value')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', 'var(--text-primary)')
        .attr('y', 16);

      const padding = { x: 16, y: 12 };

      const placeTooltip = (d: d3.SeriesPoint<(typeof chartData)[0]>, statusKey: BackupStatusKey) => {
        const v = Number(d.data[statusKey]) || 0;
        const nome = legendLabels[statusKey] ?? statusKey;
        tooltipContent.select('.tooltip-label').text(d.data.label);
        tooltipContent.select('.tooltip-value').text(`${nome}: ${v.toLocaleString('pt-BR')}`);
        const bbox = (tooltipContent.node() as SVGGElement | null)?.getBBox();
        const tw = bbox ? Math.max(bbox.width + padding.x, 100) : 120;
        const th = bbox ? bbox.height + padding.y : 42;
        tooltipBg.attr('width', tw).attr('height', th).attr('x', 0).attr('y', 0);
        const bx = x(d.data.label) ?? 0;
        const pointX = margin.left + bx + x.bandwidth() / 2;
        const pointY = margin.top + y(d[1]);
        let tx = pointX - tw / 2;
        let ty = pointY - th - 16;
        if (tx + tw > width - 8) tx = width - tw - 8;
        if (tx < 8) tx = 8;
        if (ty < 8) ty = pointY + 20;
        if (ty + th > height - 8) ty = height - th - 8;
        if (ty < 8) ty = 8;
        tooltipG.attr('transform', `translate(${tx},${ty})`);
      };

      type StackPoint = d3.SeriesPoint<(typeof chartData)[0]>;

      g.selectAll<SVGRectElement, StackPoint>('rect')
        .on('mouseenter', function (_event, d) {
          const h = y(d[0]) - y(d[1]);
          if (h < 0.5) return;
          const statusKey = (this.getAttribute('data-status-key') as BackupStatusKey) || visibleKeys[0] || 'sucesso';
          placeTooltip(d, statusKey);
          tooltipG.transition().duration(180).ease(d3.easeCubicOut).style('opacity', 1);
        })
        .on('mouseleave', () => {
          tooltipG.transition().duration(150).ease(d3.easeCubicOut).style('opacity', 0);
        });
    }, [
      chartData,
      width,
      maxTotal,
      maxTotalAll,
      hasCountsInWindow,
      periodHasBackupEvents,
      onSegmentClick,
      textMuted,
      legendLabels,
      visibleKeys,
    ]);

    if (!showChartBody) {
      return (
        <ChartEmptyState
          title={title}
          message={emptyMessage}
          containerClassName="chart-container-pie"
        />
      );
    }

    const headerBadge =
      failureBadgeText != null && failureBadgeText !== ''
        ? { className: 'backup-status-card__alert-badge', text: failureBadgeText }
        : headerPeriodBadge
          ? { className: 'pie-metric-header__badge', text: headerPeriodBadge }
          : null;

    return (
      <div
        ref={wrapRef}
        className="backup-status-card chart-radial-style"
        style={{ height: '100%', position: 'relative' }}
      >
        <div className="pie-metric-header">
          <div className="pie-metric-header__icon" aria-hidden>
            <BackupStatusHeaderIcon />
          </div>
          {headerInfo ? (
            <div className="pie-metric-header__title-with-help">
              <h6 className="pie-metric-header__title backup-status-card__title">{title}</h6>
              <InfoHelpIcon text={headerInfo} className="ms-1" />
            </div>
          ) : (
            <h6 className="pie-metric-header__title backup-status-card__title">{title}</h6>
          )}
          {headerBadge ? (
            <span className={headerBadge.className}>{headerBadge.text}</span>
          ) : null}
        </div>

        <svg
          ref={svgRef}
          style={{ display: 'block', maxWidth: '100%', overflow: 'visible', flex: '1 1 auto', minHeight: 0 }}
        />
        <ul className="backup-status-card__legend">
          {STACK_KEYS.map((k) => {
            const isHidden = hiddenKeys?.has(k) ?? false;
            return (
              <li
                key={k}
                className="backup-status-card__legend-item"
                role={onLegendToggle ? 'button' : undefined}
                tabIndex={onLegendToggle ? 0 : undefined}
                onClick={
                  onLegendToggle
                    ? (e) => {
                        e.stopPropagation();
                        onLegendToggle(k);
                      }
                    : undefined
                }
                onKeyDown={
                  onLegendToggle
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onLegendToggle(k);
                        }
                      }
                    : undefined
                }
                style={{
                  cursor: onLegendToggle ? 'pointer' : 'default',
                  opacity: isHidden ? 0.5 : 1,
                  textDecoration: isHidden ? 'line-through' : 'none',
                  padding: onLegendToggle ? '2px 4px' : undefined,
                  borderRadius: onLegendToggle ? 'var(--border-radius, 8px)' : undefined,
                }}
              >
                <span
                  className="backup-status-card__legend-swatch"
                  style={{ backgroundColor: STATUS_COLORS[k] }}
                />
                <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{legendLabels[k]}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
);

BackupStatusStackedBarChart.displayName = 'BackupStatusStackedBarChart';

export default BackupStatusStackedBarChart;
