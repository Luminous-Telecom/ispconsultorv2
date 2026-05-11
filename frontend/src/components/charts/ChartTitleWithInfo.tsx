import React from 'react';
import { InfoHelpIcon } from 'components/ui/InfoHelpIcon';

interface ChartTitleWithInfoProps {
  title: string;
  titleInfo?: string;
}

/** Título de gráfico de linha/barra com ícone de ajuda opcional (tooltip). */
export const ChartTitleWithInfo: React.FC<ChartTitleWithInfoProps> = ({ title, titleInfo }) => {
  if (!titleInfo) {
    return <h6 className="chart-title">{title}</h6>;
  }
  return (
    <div className="chart-title-row">
      <h6 className="chart-title chart-title--inline mb-0">{title}</h6>
      <InfoHelpIcon text={titleInfo} className="ms-0 flex-shrink-0" />
    </div>
  );
};
