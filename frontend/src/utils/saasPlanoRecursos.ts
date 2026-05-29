import type { PlanoModuloId } from 'services/planoModulosService';

export type SaasPlanoEquipamentosConfig = {
  limite_equipamentos: number;
  limite_tuneis: number;
  limite_backups: number;
};

export const SAAS_PLANO_EQUIPAMENTOS_INITIAL: SaasPlanoEquipamentosConfig = {
  limite_equipamentos: 0,
  limite_tuneis: 0,
  limite_backups: 0,
};

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
  return Array.isArray(modulos) ? modulos.filter((m): m is PlanoModuloId => typeof m === 'string') : [];
}

export function extractEquipamentosFromSaasPlanoRecursos(recursos: unknown): SaasPlanoEquipamentosConfig {
  const obj = getSaasPlanoRecursosObj(recursos);
  if (!obj) return SAAS_PLANO_EQUIPAMENTOS_INITIAL;
  const def = (key: keyof SaasPlanoEquipamentosConfig, val: unknown) =>
    val != null
      ? typeof val === 'number' && !Number.isNaN(val) && val >= 0
        ? val
        : SAAS_PLANO_EQUIPAMENTOS_INITIAL[key]
      : SAAS_PLANO_EQUIPAMENTOS_INITIAL[key];
  return {
    limite_equipamentos: def('limite_equipamentos', obj.equipamentos_limite_equipamentos),
    limite_tuneis: def('limite_tuneis', obj.equipamentos_limite_tuneis),
    limite_backups: def('limite_backups', obj.equipamentos_limite_backups),
  };
}

export function buildSaasPlanoRecursosPayload(
  modulos: PlanoModuloId[],
  equipamentos: SaasPlanoEquipamentosConfig,
  baseRecursos?: Record<string, unknown>
): Record<string, unknown> {
  const recursos: Record<string, unknown> = { ...(baseRecursos ?? {}), modulos };
  if (modulos.includes('equipamentos')) {
    recursos.equipamentos_limite_equipamentos = equipamentos.limite_equipamentos;
    recursos.equipamentos_limite_tuneis = equipamentos.limite_tuneis;
    recursos.equipamentos_limite_backups = equipamentos.limite_backups;
  } else {
    delete recursos.equipamentos_limite_equipamentos;
    delete recursos.equipamentos_limite_tuneis;
    delete recursos.equipamentos_limite_backups;
  }
  return recursos;
}
