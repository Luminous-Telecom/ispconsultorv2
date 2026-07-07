import { PLANO_MODULOS, type PlanoModuloId } from 'constants/planoModulos';
import { SAAS_PLANO_LIMITE_DEFS } from 'constants/saasPlanoLimites';
import type { HotsitePlanoPublico } from 'services/publicHotsitePlanosService';

export type HotsiteBillingPeriod = 'mensal' | 'anual';

export interface HotsitePlanoCompareLimiteRow {
  chave: string;
  label: string;
  values: (string | null)[];
  numericValues: (number | null)[];
}

export interface HotsitePlanoCompareModuloRow {
  id: PlanoModuloId;
  label: string;
  included: boolean[];
}

const LIMITE_ORDER = ['usuarios', ...SAAS_PLANO_LIMITE_DEFS.map((def) => def.formKey)];

export function formatHotsitePlanoCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function getHotsitePlanoDisplayPrice(
  plano: HotsitePlanoPublico,
  billingPeriod: HotsiteBillingPeriod
): { main: string; detail?: string } {
  const hasAnual = plano.valor_anual != null && plano.valor_anual > 0;
  const useAnual = billingPeriod === 'anual' && hasAnual;
  const finalPrice = useAnual ? plano.valor_anual! : plano.valor_mensal;
  const periodLabel = useAnual ? '/ ano' : '/ mês';
  const main = `${formatHotsitePlanoCurrency(finalPrice)}${periodLabel}`;

  if (useAnual && plano.desconto_percentual > 0) {
    return { main, detail: `${Math.round(plano.desconto_percentual)}% off no anual` };
  }
  if (!useAnual && hasAnual && plano.desconto_percentual > 0) {
    return {
      main,
      detail: `ou ${formatHotsitePlanoCurrency(plano.valor_anual!)}/ano com ${Math.round(plano.desconto_percentual)}% off`,
    };
  }
  if (!useAnual && hasAnual) {
    return { main, detail: `ou ${formatHotsitePlanoCurrency(plano.valor_anual!)}/ano` };
  }
  return { main };
}

function parseLimiteNumeric(valor: string | null): number | null {
  if (valor == null) return null;
  if (valor.toLowerCase() === 'ilimitado') return Number.POSITIVE_INFINITY;
  const n = Number(valor.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function getLimiteLabel(chave: string, planos: HotsitePlanoPublico[]): string {
  if (chave === 'usuarios') return 'Usuários';
  const fromPlano = planos.flatMap((p) => p.limites).find((l) => l.chave === chave);
  if (fromPlano?.label) return fromPlano.label;
  const fromDef = SAAS_PLANO_LIMITE_DEFS.find((d) => d.formKey === chave);
  return fromDef?.label ?? chave;
}

function collectLimiteChaves(planos: HotsitePlanoPublico[]): string[] {
  const present = new Set<string>();
  for (const plano of planos) {
    for (const limite of plano.limites) {
      present.add(limite.chave);
    }
  }
  return LIMITE_ORDER.filter((chave) => present.has(chave));
}

function getPlanoLimiteValue(plano: HotsitePlanoPublico, chave: string): string | null {
  return plano.limites.find((l) => l.chave === chave)?.valor ?? null;
}

function collectModuloIds(planos: HotsitePlanoPublico[]): PlanoModuloId[] {
  const present = new Set<PlanoModuloId>();
  for (const plano of planos) {
    for (const modulo of plano.modulos) {
      present.add(modulo.id);
    }
  }
  return PLANO_MODULOS.map((mod) => mod.id).filter((id) => present.has(id));
}

function getModuloLabel(id: PlanoModuloId, planos: HotsitePlanoPublico[]): string {
  const fromPlano = planos.flatMap((p) => p.modulos).find((m) => m.id === id);
  if (fromPlano?.label) return fromPlano.label;
  return PLANO_MODULOS.find((m) => m.id === id)?.label ?? id;
}

function planoHasModulo(plano: HotsitePlanoPublico, id: PlanoModuloId): boolean {
  return plano.modulos.some((m) => m.id === id);
}

export function buildHotsitePlanosCompareModulos(planos: HotsitePlanoPublico[]): HotsitePlanoCompareModuloRow[] {
  if (planos.length === 0) return [];

  return collectModuloIds(planos).map((id) => ({
    id,
    label: getModuloLabel(id, planos),
    included: planos.map((plano) => planoHasModulo(plano, id)),
  }));
}

export function buildHotsitePlanosCompareLimites(planos: HotsitePlanoPublico[]): HotsitePlanoCompareLimiteRow[] {
  if (planos.length === 0) return [];

  return collectLimiteChaves(planos).map((chave) => {
    const values = planos.map((plano) => getPlanoLimiteValue(plano, chave));
    return {
      chave,
      label: getLimiteLabel(chave, planos),
      values,
      numericValues: values.map(parseLimiteNumeric),
    };
  });
}

/** Índices das colunas com melhor valor na linha de limite (maior = melhor; ilimitado vence). */
export function getBestLimiteColumnIndexes(row: HotsitePlanoCompareLimiteRow): Set<number> {
  const nums = row.numericValues.filter((v): v is number => v != null);
  if (nums.length < 2) return new Set();
  if (new Set(nums).size <= 1) return new Set();

  const max = Math.max(...nums);
  const best = new Set<number>();
  row.numericValues.forEach((value, index) => {
    if (value != null && value === max) best.add(index);
  });
  return best.size > 0 && best.size < row.values.length ? best : new Set();
}
