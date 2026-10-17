import { renderStatusBadge } from 'components/ui/StatusBadge';
import { getContasReceberStatusBadgeConfigForTitulo } from 'utils/tableStatusBadges';
import { ContasReceberTranslateFn } from './contasReceberListTypes';

export const formatContasReceberCurrency = (value: number | string | null | undefined): string => {
  if (!value) return 'R$ 0,00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `R$ ${numValue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

export const createGetStatusBadge = (t: ContasReceberTranslateFn) => {
  return (item: { status: string; data_vencimento?: string | null; vencida?: boolean }) =>
    renderStatusBadge(getContasReceberStatusBadgeConfigForTitulo(item, t));
};
