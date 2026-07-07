import { SAAS_PLANO_LIMITE_DEFS, type SaasPlanoLimiteGrupo } from 'constants/saasPlanoLimites';
import type { PlanoModuloId } from 'services/planoModulosService';
import {
  appendLegacyModulosFromRecursos,
  readLimiteFromRecursosObj,
  stripLegacyLimiteKeys,
  SAAS_PLANO_LIMITE_LEGACY_FORM_KEYS,
} from './saasPlanoLimiteRecursosUtils';

export type SaasPlanoLimitesConfig = Record<string, number>;

export type SaasPlanoEquipamentosConfig = {
  limite_equipamentos: number;
  limite_tuneis: number;
  limite_backups: number;
};

export const SAAS_PLANO_LIMITES_INITIAL: SaasPlanoLimitesConfig = Object.fromEntries(
  SAAS_PLANO_LIMITE_DEFS.map((def) => [def.formKey, 0])
);

export const SAAS_PLANO_EQUIPAMENTOS_INITIAL: SaasPlanoEquipamentosConfig = {
  limite_equipamentos: 0,
  limite_tuneis: 0,
  limite_backups: 0,
};

function parseNumero(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && Number.isFinite(val) && val >= 0) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return fallback;
}

export function getSaasPlanoRecursosObj(recursos: unknown): Record<string, unknown> | null {
  if (recursos && typeof recursos === 'object' && !Array.isArray(recursos)) {
    return recursos as Record<string, unknown>;
  }
  if (typeof recursos === 'string') {
    try {
      const parsed = JSON.parse(recursos);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function extractModulosFromSaasPlanoRecursos(recursos: unknown): PlanoModuloId[] {
  const obj = getSaasPlanoRecursosObj(recursos);
  const modulos = obj?.modulos;
  const base = Array.isArray(modulos) ? modulos.filter((m): m is PlanoModuloId => typeof m === 'string') : [];
  return appendLegacyModulosFromRecursos(base, obj);
}

export function extractLimitesFromSaasPlanoRecursos(recursos: unknown): SaasPlanoLimitesConfig {
  const obj = getSaasPlanoRecursosObj(recursos);
  const limites: SaasPlanoLimitesConfig = { ...SAAS_PLANO_LIMITES_INITIAL };
  if (!obj) return limites;

  for (const def of SAAS_PLANO_LIMITE_DEFS) {
    limites[def.formKey] = readLimiteFromRecursosObj(obj, def.recursosKey, 0);
    const legacyFormKey = SAAS_PLANO_LIMITE_LEGACY_FORM_KEYS[def.formKey];
    if (legacyFormKey && limites[def.formKey] === 0) {
      limites[def.formKey] = parseNumero(obj[legacyFormKey], 0);
    }
  }
  return limites;
}

export function extractEquipamentosFromSaasPlanoRecursos(recursos: unknown): SaasPlanoEquipamentosConfig {
  const limites = extractLimitesFromSaasPlanoRecursos(recursos);
  return {
    limite_equipamentos: limites.limite_equipamentos ?? 0,
    limite_tuneis: limites.limite_tuneis ?? 0,
    limite_backups: limites.limite_backups ?? 0,
  };
}

export function getLimitesByGrupo(
  limites: SaasPlanoLimitesConfig,
  grupo: SaasPlanoLimiteGrupo
) {
  return SAAS_PLANO_LIMITE_DEFS.filter((def) => def.grupo === grupo);
}

export function getLimiteValorFromRecursos(recursos: unknown, recursosKey: string): number | null {
  const modulos = extractModulosFromSaasPlanoRecursos(recursos);
  const def = SAAS_PLANO_LIMITE_DEFS.find((item) => item.recursosKey === recursosKey);
  if (!def || !modulos.includes(def.modulo)) return null;
  const obj = getSaasPlanoRecursosObj(recursos);
  if (!obj) return null;
  return readLimiteFromRecursosObj(obj, recursosKey, 0);
}

export function buildSaasPlanoRecursosPayload(
  modulos: PlanoModuloId[],
  limites: SaasPlanoLimitesConfig,
  baseRecursos?: Record<string, unknown>
): Record<string, unknown> {
  const recursos: Record<string, unknown> = { ...(baseRecursos ?? {}), modulos };

  for (const def of SAAS_PLANO_LIMITE_DEFS) {
    if (modulos.includes(def.modulo)) {
      recursos[def.recursosKey] = parseNumero(limites[def.formKey], 0);
    } else {
      delete recursos[def.recursosKey];
    }
  }

  stripLegacyLimiteKeys(recursos);

  return recursos;
}

/** @deprecated use buildSaasPlanoRecursosPayload com limites unificados */
export function buildSaasPlanoRecursosPayloadLegacy(
  modulos: PlanoModuloId[],
  equipamentos: SaasPlanoEquipamentosConfig,
  baseRecursos?: Record<string, unknown>
): Record<string, unknown> {
  return buildSaasPlanoRecursosPayload(
    modulos,
    { ...SAAS_PLANO_LIMITES_INITIAL, ...equipamentos },
    baseRecursos
  );
}
