import React from 'react';
import { useI18n } from 'contexts/I18nContext';

export type DateRangeFilterVariant = 'compact' | 'table';

export interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  className?: string;
  variant?: DateRangeFilterVariant;
  idPrefix?: string;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = '',
  variant = 'compact',
  idPrefix = 'date-range',
}) => {
  const { t } = useI18n();

  if (variant === 'table') {
    const startId = `${idPrefix}-start`;
    const endId = `${idPrefix}-end`;
    return (
      <div className={`d-flex align-items-center gap-2 ${className}`}>
        <label htmlFor={startId} className="form-label mb-0 small">
          {t('filter.startDate')}
        </label>
        <input
          type="date"
          id={startId}
          className="form-control form-control-sm table-pagination-filter"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
        <label htmlFor={endId} className="form-label mb-0 small">
          {t('filter.endDate')}
        </label>
        <input
          type="date"
          id={endId}
          className="form-control form-control-sm table-pagination-filter"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className={`d-flex align-items-center filter-compact gap-2px ${className}`}>
      <span className="text-muted filter-date-label" >{t('filter.date')}:</span>
      <input
        type="date"
        className="form-control form-control-sm filter-date-input"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
      />
      <span className="text-muted filter-date-label">{t('filter.until')}</span>
      <input
        type="date"
        className="form-control form-control-sm filter-date-input"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
      />
    </div>
  );
};

export default DateRangeFilter;
