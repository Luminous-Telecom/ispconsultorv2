import type { StatusBadgeConfig } from 'components/ui/StatusBadge';
import type { TranslationKeys } from 'contexts/I18nContext';
import type { ContaPagar } from 'types';
import type { ContasPagarTranslateFn } from 'components/modals/contas-pagar/contasPagarList/contasPagarListTypes';
import type { ContasReceberTranslateFn } from 'components/modals/contas-receber/contasReceberListTypes';
import { getTituloStatusEfetivo, type TituloComVencimento } from 'utils/tituloStatus';

export function getContaPagarStatusBadgeConfig(
  status: ContaPagar['status'],
  t: ContasPagarTranslateFn
): StatusBadgeConfig {
  const map: Record<ContaPagar['status'], StatusBadgeConfig> = {
    A_PAGAR: { label: t('financial.toPay'), className: 'bg-warning' },
    PAGO: { label: t('financial.paid'), className: 'bg-success' },
    PARCIAL: { label: t('status.pending'), className: 'bg-info' },
    CANCELADO: { label: t('status.rejected'), className: 'bg-secondary' },
  };
  return map[status] ?? { label: status, variant: 'secondary' };
}

export function getContaPagarTipoPagamentoLabel(
  tipo: ContaPagar['tipo_pagamento'],
  t: ContasPagarTranslateFn
): string {
  const tipoMap: Record<string, string> = {
    DINHEIRO: t('form.paymentTypeCash'),
    BOLETO: t('form.paymentTypeBoleto'),
    CARTAO: t('form.paymentTypeCard'),
    DEPOSITO: t('form.paymentTypeDeposit'),
    DEBITO_CONTA: t('form.paymentTypeDebit'),
    TRANSFERENCIA: t('form.paymentTypeTransfer'),
    PIX: t('form.paymentTypePix'),
  };
  return tipoMap[tipo] || tipo;
}

export function getContasReceberStatusBadgeConfig(
  status: string,
  t: ContasReceberTranslateFn
): StatusBadgeConfig {
  const map: Record<string, StatusBadgeConfig> = {
    pendente: { label: t('status.pending'), className: 'bg-warning' },
    pago: { label: t('status.paid'), className: 'bg-success' },
    vencido: { label: t('status.overdue'), className: 'bg-danger' },
    cancelado: { label: t('status.cancelled'), className: 'bg-secondary' },
    parcial: { label: t('status.partial'), className: 'bg-info' },
    pago_atraso: { label: t('status.paidLate'), className: 'bg-primary' },
  };
  return map[status] ?? { label: status, variant: 'secondary' };
}

export function getContasReceberStatusBadgeConfigForTitulo(
  titulo: TituloComVencimento,
  t: ContasReceberTranslateFn
): StatusBadgeConfig {
  return getContasReceberStatusBadgeConfig(getTituloStatusEfetivo(titulo), t);
}

export function getPlanoStatusBadgeClass(status: string): string {
  switch (status) {
    case 'ativo':
      return 'bg-success';
    case 'inativo':
      return 'bg-warning';
    default:
      return 'bg-secondary';
  }
}

export function getAtivoBadgeConfig(
  ativo: boolean,
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string
): StatusBadgeConfig {
  return ativo
    ? { label: t('status.active'), className: 'bg-success' }
    : { label: t('status.inactive'), className: 'bg-secondary' };
}

export function getRpkiCaStatusBadgeConfig(status: string): StatusBadgeConfig {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    active: 'Ativo',
    error: 'Erro',
    disabled: 'Desabilitado',
  };
  const className =
    status === 'active' ? 'bg-success' : status === 'error' ? 'bg-danger' : 'bg-secondary';
  return { label: labels[status] ?? status, className };
}

export function getRpkiAspaStatusBadgeConfig(status: string): StatusBadgeConfig {
  const labels: Record<string, string> = {
    active: 'Ativo',
    revoked: 'Revogado',
    expired: 'Expirado',
  };
  const className =
    status === 'active' ? 'bg-success' : status === 'revoked' ? 'bg-warning' : 'bg-secondary';
  return { label: labels[status] ?? status, className };
}

export function getRpkiRoaStatusBadgeConfig(status: string): StatusBadgeConfig {
  return getRpkiAspaStatusBadgeConfig(status);
}
