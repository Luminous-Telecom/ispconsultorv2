import type { PlanoModuloId } from 'services/planoModulosService';

/** Chaves antigas (limites IXC em Cadastros) → chaves atuais do módulo IXC Provedor */
export const IXC_PROVEDOR_LIMITE_LEGACY_KEYS: Record<string, string> = {
  ixc_provedor_limite_integracoes: 'cadastros_limite_ixc_provedor',
  ixc_provedor_limite_ordens_servico: 'cadastros_limite_ordens_servico',
};

/** formKey legado no estado do formulário */
export const IXC_PROVEDOR_LIMITE_LEGACY_FORM_KEYS: Record<string, string> = {
  limite_integracoes: 'limite_ixc_provedor',
};

export function readLimiteFromRecursosObj(
  recursos: Record<string, unknown> | null,
  recursosKey: string,
  fallback = 0
): number {
  if (!recursos) return fallback;
  if (recursos[recursosKey] !== undefined && recursos[recursosKey] !== null) {
    return parseLimiteNumber(recursos[recursosKey], fallback);
  }
  const legacyKey = IXC_PROVEDOR_LIMITE_LEGACY_KEYS[recursosKey];
  if (legacyKey && recursos[legacyKey] !== undefined && recursos[legacyKey] !== null) {
    return parseLimiteNumber(recursos[legacyKey], fallback);
  }
  return fallback;
}

function parseLimiteNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && Number.isFinite(val) && val >= 0) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return fallback;
}

export function appendLegacyIxcProvedorModulo(
  modulos: PlanoModuloId[],
  recursos: Record<string, unknown> | null
): PlanoModuloId[] {
  if (modulos.includes('ixc_provedor') || !recursos) return modulos;

  const hasIxcData =
    Object.keys(IXC_PROVEDOR_LIMITE_LEGACY_KEYS).some(
      (key) => recursos[key] !== undefined && recursos[key] !== null
    ) ||
    Object.values(IXC_PROVEDOR_LIMITE_LEGACY_KEYS).some(
      (key) => recursos[key] !== undefined && recursos[key] !== null
    );

  return hasIxcData ? [...modulos, 'ixc_provedor'] : modulos;
}

export function stripLegacyIxcLimiteKeys(recursos: Record<string, unknown>): void {
  for (const legacyKey of Object.values(IXC_PROVEDOR_LIMITE_LEGACY_KEYS)) {
    delete recursos[legacyKey];
  }
}
