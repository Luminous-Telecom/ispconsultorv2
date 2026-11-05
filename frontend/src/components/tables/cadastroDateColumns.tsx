import type { TableColumn } from './types';
import { formatDateTime } from 'utils/formatters';

type DateRow = {
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
  created_at_formatada?: string | null;
};

function formatCadastroDate(item: DateRow, key: 'created_at' | 'updated_at'): string {
  if (key === 'created_at' && item.created_at_formatada) return item.created_at_formatada;
  const value = item[key];
  if (value == null || value === '') return '-';
  return formatDateTime(value) || '-';
}

/** Inclui criação e última modificação quando a listagem de cadastro ainda não tem a coluna. */
export function withCadastroDateColumns<T extends { id: number | string }>(
  columns: Array<TableColumn<T>>,
  t: (key: 'table.createdAt' | 'table.updatedAt') => string,
): Array<TableColumn<T>> {
  const keys = new Set(columns.map((column) => column.key));
  const extra: Array<TableColumn<T>> = [];
  if (!keys.has('created_at')) {
    extra.push({
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      width: '145px',
      filterType: 'date',
      render: (item) => formatCadastroDate(item as DateRow, 'created_at'),
    });
  }
  if (!keys.has('updated_at')) {
    extra.push({
      key: 'updated_at',
      label: t('table.updatedAt'),
      sortable: true,
      width: '160px',
      filterType: 'date',
      render: (item) => formatCadastroDate(item as DateRow, 'updated_at'),
    });
  }
  return extra.length === 0 ? columns : [...columns, ...extra];
}
