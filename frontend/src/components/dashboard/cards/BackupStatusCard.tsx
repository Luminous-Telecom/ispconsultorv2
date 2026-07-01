import React from 'react';
import {
  BackupStatusStackedBarChart,
  type BackupStatusDayDatum,
  type BackupStatusKey,
} from 'components/charts';

export interface BackupStatusCardProps {
  days: BackupStatusDayDatum[];
  title: string;
  legendLabels: Record<BackupStatusKey, string>;
  emptyMessage?: string;
  onSegmentClick?: (dataISO: string, status: BackupStatusKey) => void;
  hiddenKeys?: ReadonlySet<string>;
  onLegendToggle?: (key: BackupStatusKey) => void;
  periodHasBackupEvents: boolean;
}

/** Card de status de backup (barras empilhadas dos últimos dias). */
const BackupStatusCard: React.FC<BackupStatusCardProps> = (props) => (
  <div className="chart-card chart-card-pie chart-card-pie--metric chart-card-pie--sm">
    <BackupStatusStackedBarChart {...props} />
  </div>
);

export default BackupStatusCard;
