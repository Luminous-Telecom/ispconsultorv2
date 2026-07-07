import type { PlanoModuloId } from 'services/planoModulosService';

export const SAAS_PLANO_LIMITE_LEGACY_CHAINS: Record<string, string[]> = {
  ixc_provedor_limite_integracoes: ['cadastros_limite_ixc_provedor'],
  ordens_servico_limite_ordens_servico: ['ixc_provedor_limite_ordens_servico', 'cadastros_limite_ordens_servico'],
};

export const SAAS_PLANO_LIMITE_LEGACY_KEYS_TO_STRIP = [
  'cadastros_limite_ixc_provedor',
  'cadastros_limite_ordens_servico',
  'ixc_provedor_limite_ordens_servico',
];

/** formKey legado no estado do formulário */
export const SAAS_PLANO_LIMITE_LEGACY_FORM_KEYS: Record<string, string> = {
  limite_integracoes: 'limite_ixc_provedor',
};

const IXC_INTEGRACOES_KEYS = [
  'ixc_provedor_limite_integracoes',
  'cadastros_limite_ixc_provedor',
];

const ORDENS_SERVICO_KEYS = [
  'ordens_servico_limite_ordens_servico',
  'ixc_provedor_limite_ordens_servico',
  'cadastros_limite_ordens_servico',
];

function parseLimiteNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && Number.isFinite(val) && val >= 0) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return fallback;
}

export function readLimiteFromRecursosObj(
  recursos: Record<string, unknown> | null,
  recursosKey: string,
  fallback = 0
): number {
  if (!recursos) return fallback;
  if (recursos[recursosKey] !== undefined && recursos[recursosKey] !== null) {
    return parseLimiteNumber(recursos[recursosKey], fallback);
  }
  for (const legacyKey of SAAS_PLANO_LIMITE_LEGACY_CHAINS[recursosKey] ?? []) {
    if (recursos[legacyKey] !== undefined && recursos[legacyKey] !== null) {
      return parseLimiteNumber(recursos[legacyKey], fallback);
    }
  }
  return fallback;
}

export function appendLegacyIxcProvedorModulo(
  modulos: PlanoModuloId[],
  recursos: Record<string, unknown> | null
): PlanoModuloId[] {
  if (modulos.includes('ixc_provedor') || !recursos) return modulos;
  const hasIxcData = IXC_INTEGRACOES_KEYS.some(
    (key) => recursos[key] !== undefined && recursos[key] !== null
  );
  return hasIxcData ? [...modulos, 'ixc_provedor'] : modulos;
}

export function appendLegacyOrdensServicoModulo(
  modulos: PlanoModuloId[],
  recursos: Record<string, unknown> | null
): PlanoModuloId[] {
  if (modulos.includes('ordens_servico') || !recursos) return modulos;
  const hasOrdensData = ORDENS_SERVICO_KEYS.some(
    (key) => recursos[key] !== undefined && recursos[key] !== null
  );
  return hasOrdensData ? [...modulos, 'ordens_servico'] : modulos;
}

export function appendLegacyModulosFromRecursos(
  modulos: PlanoModuloId[],
  recursos: Record<string, unknown> | null
): PlanoModuloId[] {
  return appendLegacyOrdensServicoModulo(appendLegacyIxcProvedorModulo(modulos, recursos), recursos);
}

export function stripLegacyLimiteKeys(recursos: Record<string, unknown>): void {
  for (const legacyKey of SAAS_PLANO_LIMITE_LEGACY_KEYS_TO_STRIP) {
    delete recursos[legacyKey];
  }
}

/** @deprecated use stripLegacyLimiteKeys */
export function stripLegacyIxcLimiteKeys(recursos: Record<string, unknown>): void {
  stripLegacyLimiteKeys(recursos);
}
