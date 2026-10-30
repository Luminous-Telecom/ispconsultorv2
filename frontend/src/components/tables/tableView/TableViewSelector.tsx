import React, { useMemo, useState } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { AppButton, FormField } from 'components/ui';
import type { TranslationKeys } from 'contexts/I18nContext';
import {
  ColumnFilterOperator,
  FilterableColumn,
  distinctColumnValues,
  filterableColumns,
  operatorsFor,
  resolveFilterKind,
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

interface TableViewSelectorProps {
  columns: FilterableColumn[];
  rows: readonly object[];
  onCommit: (rule: { columnKey: string; operator: ColumnFilterOperator; value: string }) => void;
}

const TableViewSelector: React.FC<TableViewSelectorProps> = ({ columns, rows, onCommit }) => {
  const { t } = useI18n();
  const fields = filterableColumns(columns);
  const [columnKey, setColumnKey] = useState('');
  const [operator, setOperator] = useState<ColumnFilterOperator>('contains');
  const [value, setValue] = useState('');

  const column = fields.find((item) => item.key === columnKey);
  const kind = column ? resolveFilterKind(column) : 'text';
  const operators = operatorsFor(kind);

  const choices = useMemo(() => {
    if (!column) return [];
    if (kind === 'boolean') {
      return [
        { value: 'true', label: t('ui.yes') },
        { value: 'false', label: t('ui.no') },
      ];
    }
    if (kind === 'select') {
      return (column.filterOptions ?? [])
        .filter((option) => option.value != null && String(option.value) !== '')
        .map((option) => ({ value: String(option.value), label: option.label }));
    }
    return distinctColumnValues(column, rows).map((item) => ({ value: item, label: item }));
  }, [column, kind, rows, t]);

  const handleColumn = (nextKey: string) => {
    setColumnKey(nextKey);
    const next = fields.find((item) => item.key === nextKey);
    const nextOperator = operatorsFor(next ? resolveFilterKind(next) : 'text')[0] ?? 'contains';
    setOperator(nextOperator);
    setValue('');
  };

  const handleOk = () => {
    const nextValue = value.trim();
    if (!columnKey || !nextValue) return;
    onCommit({ columnKey, operator, value: nextValue });
    setValue('');
  };

  return (
    <div className="table-view-selector">
      <FormField
        name="table-view-selector-column"
        type="select"
        size="sm"
        label={t('tableView.selector')}
        value={columnKey}
        placeholder={t('tableView.selectField')}
        options={fields.map((item) => ({ value: item.key, label: item.label }))}
        onChange={(next) => handleColumn(String(next || ''))}
      />
      <FormField
        name="table-view-selector-operator"
        type="select"
        size="sm"
        label={t('tableView.operatorLabel')}
        value={operator}
        disabled={!column}
        options={operators.map((item) => ({ value: item, label: t(OPERATOR_KEYS[item]) }))}
        onChange={(next) => setOperator(String(next) as ColumnFilterOperator)}
      />
      {choices.length > 0 ? (
        <FormField
          name="table-view-selector-value"
          type="select"
          size="sm"
          label={t('tableView.value')}
          value={value}
          disabled={!column}
          placeholder={t('tableView.value')}
          options={choices}
          onChange={(next) => setValue(String(next ?? ''))}
        />
      ) : (
        <FormField
          name="table-view-selector-value"
          type={kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text'}
          size="sm"
          label={t('tableView.value')}
          value={value}
          disabled={!column}
          onChange={(next) => setValue(String(next ?? ''))}
        />
      )}
      <AppButton label={t('tableView.ok')} variant="primary" size="sm" disabled={!columnKey || !value.trim()} onClick={handleOk} />
    </div>
  );
};

export default TableViewSelector;
