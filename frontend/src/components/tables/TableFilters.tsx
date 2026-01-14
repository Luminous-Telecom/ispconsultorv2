import React, { useState } from 'react';
import { TableFilter } from './types';
import { FilterValue } from '@/types/common';
import { useI18n } from '@/contexts/I18nContext';
import FormField from '../ui/FormField';
import Button from '../ui/Button';

interface TableFiltersProps {
  filters: TableFilter[];
  values: Record<string, FilterValue>;
  onFilterChange: (key: string, value: FilterValue) => void;
  onFiltersChange: (filters: Record<string, FilterValue>) => void;
  onClearFilters: () => void;
  className?: string;
  collapsible?: boolean;
  showClearButton?: boolean;
  showApplyButton?: boolean;
}

const TableFilters: React.FC<TableFiltersProps> = ({
  filters,
  values,
  onFilterChange,
  onFiltersChange,
  onClearFilters,
  className = '',
  collapsible = true,
  showClearButton = true,
  showApplyButton = false,
}) => {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(!collapsible);
  const [pendingFilters, setPendingFilters] = useState<Record<string, FilterValue>>(values);

  // Se não há filtros, não renderizar nada
  if (filters.length === 0) return null;

  // Verificar se há filtros ativos
  const hasActiveFilters = Object.values(values).some(value => 
    value !== null && value !== undefined && value !== ''
  );

  // Aplicar filtros pendentes
  const applyFilters = () => {
    onFiltersChange(pendingFilters);
  };

  // Limpar filtros
  const clearFilters = () => {
    setPendingFilters({});
    onClearFilters();
  };

  // Renderizar campo de filtro
  const renderFilterField = (filter: TableFilter) => {
    const value = pendingFilters[filter.key] || '';

    switch (filter.type) {
      case 'text':
        return (
          <FormField
            key={filter.key}
            type="text"
            label={filter.label}
            name={filter.key}
            value={value}
            onChange={(val) => {
              setPendingFilters(prev => ({ ...prev, [filter.key]: val }));
              if (!showApplyButton) {
                onFilterChange(filter.key, val);
              }
            }}
            placeholder={filter.placeholder}
            size="sm"
          />
        );

      case 'select':
        return (
          <FormField
            key={filter.key}
            type="select"
            label={filter.label}
            name={filter.key}
            value={value}
            onChange={(val) => {
              setPendingFilters(prev => ({ ...prev, [filter.key]: val }));
              if (!showApplyButton) {
                onFilterChange(filter.key, val);
              }
            }}
            options={filter.options || []}
            placeholder={filter.placeholder}
            clearable
            size="sm"
          />
        );

      case 'number':
        return (
          <FormField
            key={filter.key}
            type="number"
            label={filter.label}
            name={filter.key}
            value={value}
            onChange={(val) => {
              setPendingFilters(prev => ({ ...prev, [filter.key]: val }));
              if (!showApplyButton) {
                onFilterChange(filter.key, val);
              }
            }}
            placeholder={filter.placeholder}
            size="sm"
          />
        );

      case 'date':
        return (
          <FormField
            key={filter.key}
            type="date"
            label={filter.label}
            name={filter.key}
            value={value}
            onChange={(val) => {
              setPendingFilters(prev => ({ ...prev, [filter.key]: val }));
              if (!showApplyButton) {
                onFilterChange(filter.key, val);
              }
            }}
            size="sm"
          />
        );

      case 'boolean':
        return (
          <FormField
            key={filter.key}
            type="checkbox"
            label={filter.label}
            name={filter.key}
            value={value}
            onChange={(val) => {
              setPendingFilters(prev => ({ ...prev, [filter.key]: val }));
              if (!showApplyButton) {
                onFilterChange(filter.key, val);
              }
            }}
            switch
            size="sm"
          />
        );

      default:
        return null;
    }
  };

  // Renderizar botões de ação
  const renderActionButtons = () => {
    if (!showClearButton && !showApplyButton) return null;

    return (
      <div className="filter-actions d-flex gap-2">
        {showApplyButton && (
          <Button
            variant="primary"
            size="sm"
            onClick={applyFilters}
            icon="check"
          >
            Aplicar
          </Button>
        )}
        
        {showClearButton && (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            icon="x"
          >
            Limpar
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className={`table-filters ${className}`}>
      {/* Cabeçalho dos filtros */}
      <div className="filter-header d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <h6 className="mb-0">Filtros</h6>
          {hasActiveFilters && (
            <span className="badge bg-primary">
              {Object.values(values).filter(v => v !== null && v !== undefined && v !== '').length}
            </span>
          )}
        </div>
        
        {collapsible && (
            <Button
              variant="outline-primary"
              size="sm"
              icon={isExpanded ? 'chevron-up' : 'chevron-down'}
              onClick={() => setIsExpanded(!isExpanded)}
              tooltip={isExpanded ? t('ui.hideFilters') : t('ui.showFilters')}
            >
              {''}
            </Button>
        )}
      </div>

      {/* Campos de filtro */}
      {isExpanded && (
        <div className="filter-content">
          <div className="row g-3">
            {filters.map(filter => (
              <div key={filter.key} className="col-md-4 col-lg-3">
                {renderFilterField(filter)}
              </div>
            ))}
          </div>
          
          {renderActionButtons()}
        </div>
      )}
    </div>
  );
};

export default TableFilters;
