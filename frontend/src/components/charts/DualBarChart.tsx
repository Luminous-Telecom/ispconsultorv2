import React, { useMemo } from 'react';
import { ChartDataItem, ChartFormat } from './types';
import { useI18n } from '@/contexts/I18nContext';

interface DualBarChartProps {
  receberData: ChartDataItem[];
  pagarData: ChartDataItem[];
  title: string;
  format?: ChartFormat;
}

export const DualBarChart: React.FC<DualBarChartProps> = ({
  receberData,
  pagarData,
  title,
  format = 'currency'
}) => {
  const { t } = useI18n();
  // Combinar dados de receber e pagar, mantendo labels únicas
  const combinedData = useMemo(() => {
    const dataMap = new Map<string, { receber: number; pagar: number }>();

    // Adicionar dados de receber
    receberData.forEach(item => {
      const key = item.mes || item.label || '';
      const value = item.value || item.valor || 0;
      if (!dataMap.has(key)) {
        dataMap.set(key, { receber: 0, pagar: 0 });
      }
      dataMap.get(key)!.receber = value;
    });

    // Adicionar dados de pagar
    pagarData.forEach(item => {
      const key = item.mes || item.label || '';
      const value = item.value || item.valor || 0;
      if (!dataMap.has(key)) {
        dataMap.set(key, { receber: 0, pagar: 0 });
      }
      dataMap.get(key)!.pagar = value;
    });

    // Converter para array e ordenar por data (assumindo formato MM/YY)
    const sortedData = Array.from(dataMap.entries())
      .map(([key, values]) => ({
        label: key,
        receber: values.receber,
        pagar: values.pagar
      }))
      .sort((a, b) => {
        // Tentar ordenar por data se for formato MM/YY
        const dateA = a.label.includes('/') ? new Date(2020 + parseInt(a.label.split('/')[1]), parseInt(a.label.split('/')[0]) - 1) : new Date();
        const dateB = b.label.includes('/') ? new Date(2020 + parseInt(b.label.split('/')[1]), parseInt(b.label.split('/')[0]) - 1) : new Date();
        return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
      });

    return sortedData;
  }, [receberData, pagarData]);

  // Calcular valores máximos para escalar as barras
  const maxReceber = useMemo(() =>
    Math.max(...combinedData.map(item => item.receber || 0)), [combinedData]
  );

  const maxPagar = useMemo(() =>
    Math.max(...combinedData.map(item => item.pagar || 0)), [combinedData]
  );

  const formatValue = (val: number) => {
    if (format === 'currency') {
      return `R$ ${val.toFixed(2).replace('.', ',')}`;
    }
    return val.toString();
  };

  if (!combinedData || combinedData.length === 0) {
    return (
      <div className="chart-container">
        <h6 className="chart-title">{title}</h6>
        <div className="text-center text-muted py-4">
          Nenhum dado disponível
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h6 className="chart-title">{title}</h6>
      <div className="dual-bar-chart">
        {combinedData.map((item, index) => {
          const receberWidth = maxReceber > 0 ? (item.receber / maxReceber) * 100 : 0;
          const pagarWidth = maxPagar > 0 ? (item.pagar / maxPagar) * 100 : 0;

          return (
            <div key={index} className="dual-bar-item">
              <div className="dual-bar-label">
                {item.label}
              </div>
              <div className="dual-bar-container">
                {/* Barra de Receber (verde) */}
                <div className="dual-bar-section">
                  <div
                    className="dual-bar dual-bar-receber"
                    style={{ width: `${receberWidth}%` }}
                  >
                    <span className="dual-bar-value">
                      {formatValue(item.receber)}
                    </span>
                  </div>
                </div>

                {/* Barra de Pagar (vermelho) */}
                <div className="dual-bar-section">
                  <div
                    className="dual-bar dual-bar-pagar"
                    style={{ width: `${pagarWidth}%` }}
                  >
                    <span className="dual-bar-value">
                      {formatValue(item.pagar)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="dual-bar-legend">
        <div className="dual-bar-legend-item">
          <div className="dual-bar-legend-color dual-bar-legend-receber"></div>
          <span className="dual-bar-legend-text">{t('financial.toReceive')}</span>
        </div>
        <div className="dual-bar-legend-item">
          <div className="dual-bar-legend-color dual-bar-legend-pagar"></div>
          <span className="dual-bar-legend-text">{t('financial.toPayLabel')}</span>
        </div>
      </div>
    </div>
  );
};