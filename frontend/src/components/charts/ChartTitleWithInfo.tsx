import React from 'react';
import { LabelWithHelp } from 'components/ui/LabelWithHelp';

interface ChartTitleWithInfoProps {
  title: string;
  titleInfo?: string;
}

export const ChartTitleWithInfo: React.FC<ChartTitleWithInfoProps> = ({ title, titleInfo }) => {
  if (!titleInfo) {
    return <h6 className="chart-title">{title}</h6>;
  }

  return (
    <div className="chart-title-row">
      <LabelWithHelp
        as="span"
        className="chart-title chart-title--inline mb-0"
        helpText={titleInfo}
      >
        {title}
      </LabelWithHelp>
    </div>
  );
};
