import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { IconOnlyButton } from 'components/ui';
import type { TranslationKeys } from 'contexts/I18nContext';
import {
  ColumnFilterOperator,
  ColumnFilterRule,
  FilterableColumn,
  ruleValueLabel,
} from './model';

const OPERATOR_KEYS: Record<ColumnFilterOperator, keyof TranslationKeys> = {
  contains: 'tableView.operator.contains',
  equals: 'tableView.operator.equals',
  startsWith: 'tableView.operator.startsWith',
  gt: 'tableView.operator.gt',
  lt: 'tableView.operator.lt',
  gte: 'tableView.operator.gte',
  lte: 'tableView.operator.lte',
};

interface TableViewFilterChipsProps {
  rules: ColumnFilterRule[];
  columns: FilterableColumn[];
  onRemove: (id: string) => void;
}

const TableViewFilterChips: React.FC<TableViewFilterChipsProps> = ({ rules, columns, onRemove }) => {
  const { t } = useI18n();
  if (rules.length === 0) return null;

  return (
    <div className="table-view-chips">
      {rules.filter((rule) => rule.value.trim() !== '').map((rule) => {
        const column = columns.find((item) => item.key === rule.columnKey);
        const valueLabel = ruleValueLabel(column, rule.value, { yes: t('ui.yes'), no: t('ui.no') });
        const text = `${column?.label ?? rule.columnKey} ${t(OPERATOR_KEYS[rule.operator])} ${valueLabel}`;
        return (
          <span key={rule.id} className="table-view-chip">
            <span>{text}</span>
            <IconOnlyButton label={t('tableView.removeRule')} iconClassName="bi bi-x-lg" onClick={() => onRemove(rule.id)} />
          </span>
        );
      })}
    </div>
  );
};

export default TableViewFilterChips;
