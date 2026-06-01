import { renderStatusBadge } from 'components/ui/StatusBadge';
import { SaasTitulo } from 'services/saas/saasCrudService';
import { getContasReceberStatusBadgeConfig } from 'utils/tableStatusBadges';
import { ContasReceberTranslateFn } from './contasReceberListTypes';

export const canGerarBoletoSaas = (t: SaasTitulo) =>
  t.status === 'pendente' && t.banco && ['efi', 'asaas'].includes(t.banco.tipo_banco?.toLowerCase() || '');

export const formatContasReceberCurrency = (value: number | string | null | undefined): string => {
  if (!value) return 'R$ 0,00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `R$ ${numValue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

export const createGetStatusBadge = (t: ContasReceberTranslateFn) => {
  return (status: string) => renderStatusBadge(getContasReceberStatusBadgeConfig(status, t));
};
