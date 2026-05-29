import type { TranslationKeys } from 'contexts/I18nContext';

export const TIPO_COBRANCA_PERIODICITY_VALUES = [
  'mensal',
  'bimestral',
  'trimestral',
  'semestral',
  'anual',
  'quinzenal',
  'semanal',
] as const;

export type TipoCobrancaPeriodicity = (typeof TIPO_COBRANCA_PERIODICITY_VALUES)[number];

export const TIPO_COBRANCA_PERIODICITY_I18N_KEYS: Record<
  TipoCobrancaPeriodicity,
  keyof TranslationKeys
> = {
  mensal: 'form.periodicityMonthly',
  bimestral: 'form.periodicityBimonthly',
  trimestral: 'form.periodicityQuarterly',
  semestral: 'form.periodicitySemiannual',
  anual: 'form.periodicityAnnual',
  quinzenal: 'form.periodicityBiweekly',
  semanal: 'form.periodicityWeekly',
};

type TranslateFn = (key: keyof TranslationKeys) => string;

export function getTipoCobrancaPeriodicityOptions(t: TranslateFn) {
  return TIPO_COBRANCA_PERIODICITY_VALUES.map((value) => ({
    value,
    label: t(TIPO_COBRANCA_PERIODICITY_I18N_KEYS[value]),
  }));
}

export function formatTipoCobrancaPeriodicity(
  periodicidade: string,
  t: TranslateFn
): string {
  const key = TIPO_COBRANCA_PERIODICITY_I18N_KEYS[periodicidade as TipoCobrancaPeriodicity];
  return key ? t(key) : periodicidade;
}
