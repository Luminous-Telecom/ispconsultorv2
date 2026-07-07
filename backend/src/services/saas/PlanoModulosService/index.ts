import { SaasContrato } from '../../../models/saas/SaasContrato';
import { SaasPlano } from '../../../models/saas/SaasPlano';
import type { PlanoModuloId } from '../../../constants/planoModulos';
import { appendLegacyIxcProvedorModulo } from '../../../utils/saasPlanoLimiteRecursosUtils';

/**
 * Retorna os IDs dos módulos habilitados no plano do tenant.
 * Se empresa_id não tiver contrato SaaS ativo, retorna null (sem restrição de módulos).
 */
export async function getModulosDoPlano(empresaId: number): Promise<PlanoModuloId[] | null> {
  // Buscar contrato SaaS ativo da empresa
  const contrato = await SaasContrato.findOne({
    where: { empresa_id: empresaId, status: 'ativo' },
    include: [{ model: SaasPlano, as: 'plano', required: true }],
    order: [['data_inicio', 'DESC']],
  }) as (SaasContrato & { plano?: SaasPlano }) | null;

  if (contrato?.plano) {
    return extrairModulosDoPlano(contrato.plano);
  }

  return null;
}

/**
 * Retorna true se o tenant tem acesso ao módulo.
 * Se modulos for null (sem restrição), retorna true.
 */
export function tenantTemModulo(modulos: PlanoModuloId[] | null, moduloId: PlanoModuloId): boolean {
  if (modulos === null) return true;
  return modulos.includes(moduloId);
}

function extrairModulosDoPlano(plano: SaasPlano): PlanoModuloId[] {
  let recursos = plano.recursos as Record<string, unknown> | string | null | undefined;
  if (typeof recursos === 'string') {
    try {
      recursos = JSON.parse(recursos) as Record<string, unknown>;
    } catch {
      return [];
    }
  }
  if (!recursos || typeof recursos !== 'object') return [];

  const modulos = recursos.modulos;
  if (Array.isArray(modulos)) {
    return appendLegacyIxcProvedorModulo(
      modulos.filter((m): m is PlanoModuloId => typeof m === 'string'),
      recursos
    );
  }

  const validos: PlanoModuloId[] = ['cadastros'];
  if (recursos.financeiro === true) validos.push('financeiro');
  if (recursos.blockdomi === true) validos.push('blockdomi');
  if (recursos.equipamentos === true) validos.push('equipamentos');
  if (recursos.rpki === true) validos.push('rpki');
  if (recursos.whatsapp === true) validos.push('envio_notificacoes');
  if (recursos.nfse === true) validos.push('nfse');
  validos.push('assinatura_digital');
  return appendLegacyIxcProvedorModulo([...new Set(validos)], recursos);
}

export interface EquipamentosLimites {
  temModulo: boolean;
  limite_equipamentos: number;
  limite_tuneis: number;
  limite_backups: number;
}

const DEFAULTS = { limite_equipamentos: 0, limite_tuneis: 0, limite_backups: 0 };

function extrairNumero(recursos: Record<string, unknown> | null, key: string, fallback: number): number {
  const raw = recursos?.[key];
  return typeof raw === 'number' && !Number.isNaN(raw) && raw >= 0 ? raw : fallback;
}

/**
 * Retorna os limites de equipamentos do plano do tenant.
 * null = sem contrato SaaS ativo (sem restrição).
 * temModulo=false = tem contrato mas plano sem módulo equipamentos (bloqueia).
 * temModulo=true = tem contrato com equipamentos (valida limites).
 */
export async function getEquipamentosLimites(empresaId: number): Promise<EquipamentosLimites | null> {
  const contrato = await SaasContrato.findOne({
    where: { empresa_id: empresaId, status: 'ativo' },
    include: [{ model: SaasPlano, as: 'plano', required: true }],
    order: [['data_inicio', 'DESC']],
  }) as (SaasContrato & { plano?: SaasPlano }) | null;

  if (!contrato?.plano) {
    return null;
  }

  const modulos = extrairModulosDoPlano(contrato.plano);
  if (!modulos.includes('equipamentos' as PlanoModuloId)) {
    return { temModulo: false, limite_equipamentos: 0, limite_tuneis: 0, limite_backups: 0 };
  }

  let recursos = contrato.plano.recursos as Record<string, unknown> | string | null | undefined;
  if (typeof recursos === 'string') {
    try {
      recursos = JSON.parse(recursos) as Record<string, unknown>;
    } catch {
      return { temModulo: true, limite_equipamentos: DEFAULTS.limite_equipamentos, limite_tuneis: DEFAULTS.limite_tuneis, limite_backups: DEFAULTS.limite_backups };
    }
  }
  const obj = recursos && typeof recursos === 'object' ? recursos : null;
  return {
    temModulo: true,
    limite_equipamentos: extrairNumero(obj as Record<string, unknown>, 'equipamentos_limite_equipamentos', DEFAULTS.limite_equipamentos),
    limite_tuneis: extrairNumero(obj as Record<string, unknown>, 'equipamentos_limite_tuneis', DEFAULTS.limite_tuneis),
    limite_backups: extrairNumero(obj as Record<string, unknown>, 'equipamentos_limite_backups', DEFAULTS.limite_backups),
  };
}
