import type { TranslationKeys } from 'contexts/I18nContext';

export type MensagemCobrancaType =
  | '10_dias_antes_vencimento'
  | '05_dias_antes_vencimento'
  | 'mesmo_dia_vencimento'
  | '05_dias_depois_vencimento'
  | '10_dias_depois_vencimento'
  | '15_dias_depois_vencimento'
  | 'corte_cliente'
  | 'envio_manual'
  | 'recibo_pagamento';

export type MensagemTipoEnvio = 'desativado' | 'pdf';

type TranslateFn = (key: keyof TranslationKeys) => string;

export function getMensagemCobrancaTypeOptions(t: TranslateFn) {
  return [
    { value: '10_dias_antes_vencimento', label: t('messages.types.10daysBefore') },
    { value: '05_dias_antes_vencimento', label: t('messages.types.05daysBefore') },
    { value: 'mesmo_dia_vencimento', label: t('messages.types.sameDay') },
    { value: '05_dias_depois_vencimento', label: t('messages.types.05daysAfter') },
    { value: '10_dias_depois_vencimento', label: t('messages.types.10daysAfter') },
    { value: '15_dias_depois_vencimento', label: t('messages.types.15daysAfter') },
    { value: 'corte_cliente', label: t('messages.types.clientCut') },
    { value: 'envio_manual', label: t('messages.types.manualSend') },
    { value: 'recibo_pagamento', label: t('messages.types.paymentReceipt') },
  ];
}
