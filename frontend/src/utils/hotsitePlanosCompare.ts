import { PLANO_MODULOS, type PlanoModuloId } from 'constants/planoModulos';
import { SAAS_PLANO_LIMITE_DEFS } from 'constants/saasPlanoLimites';
import type { HotsitePlanoPublico } from 'services/publicHotsitePlanosService';

export type HotsiteBillingPeriod = 'mensal' | 'anual';

export interface HotsitePlanoCompareLimiteRow {
  chave: string;
  label: string;
  values: (string | null)[];
  numericValues: (number | null)[];
  moduleAvailable: boolean[];
}

export interface HotsitePlanoCompareModuloRow {
  id: PlanoModuloId;
  label: string;
  included: boolean[];
}

function planoHasModulo(plano: HotsitePlanoPublico, id: PlanoModuloId): boolean {
  return plano.modulos.some((m) => m.id === id);
}

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

function getLimiteLabel(chave: string): string {
  if (chave === 'usuarios') return 'Usuários';
  const fromDef = SAAS_PLANO_LIMITE_DEFS.find((d) => d.formKey === chave);
  return fromDef?.hotsiteLabel ?? fromDef?.label ?? chave;
}

function getLimiteModulo(chave: string): PlanoModuloId | null {
  if (chave === 'usuarios') return 'cadastros';
  return SAAS_PLANO_LIMITE_DEFS.find((d) => d.formKey === chave)?.modulo ?? null;
}

function collectLimiteChaves(planos: HotsitePlanoPublico[]): string[] {
  const chaves: string[] = [];
  if (planos.some((plano) => planoHasModulo(plano, 'cadastros'))) {
    chaves.push('usuarios');
  }
  for (const def of SAAS_PLANO_LIMITE_DEFS) {
    if (planos.some((plano) => planoHasModulo(plano, def.modulo))) {
      chaves.push(def.formKey);
    }
  }
  return chaves;
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

function planoHasLimiteModulo(plano: HotsitePlanoPublico, chave: string): boolean {
  const modulo = getLimiteModulo(chave);
  return modulo != null && planoHasModulo(plano, modulo);
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
    const moduleAvailable = planos.map((plano) => planoHasLimiteModulo(plano, chave));
    return {
      chave,
      label: getLimiteLabel(chave),
      values,
      numericValues: moduleAvailable.map((available, index) =>
        available ? parseLimiteNumeric(values[index]) : null
      ),
      moduleAvailable,
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
