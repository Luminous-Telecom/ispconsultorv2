import React from 'react';
import { useI18n } from 'contexts/I18nContext';

export interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  className?: string;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = '',
}) => {
  const { t } = useI18n();

  return (
    <div className={`d-flex align-items-center filter-compact ${className}`} style={{ gap: 2 }}>
      <span className="text-muted" style={{ fontSize: '0.65rem', lineHeight: 1 }}>{t('filter.date')}:</span>
      <input
        type="date"
        className="form-control form-control-sm"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        style={{ width: '6.5rem', fontSize: '0.65rem', height: '1.25rem', lineHeight: 1, boxSizing: 'border-box' }}
      />
      <span className="text-muted" style={{ fontSize: '0.65rem', lineHeight: 1 }}>{t('filter.until')}</span>
      <input
        type="date"
        className="form-control form-control-sm"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        style={{ width: '6.5rem', fontSize: '0.65rem', height: '1.25rem', lineHeight: 1, boxSizing: 'border-box' }}
      />
    </div>
  );
};

export default DateRangeFilter;
