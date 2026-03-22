import { SaasContrato } from '../../../models/saas/SaasContrato';
import { SaasPlano } from '../../../models/saas/SaasPlano';
import type { PlanoModuloId } from '../../../constants/planoModulos';

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
    return modulos.filter((m): m is PlanoModuloId => typeof m === 'string');
  }

  const validos: PlanoModuloId[] = ['cadastros'];
  if (recursos.financeiro === true) validos.push('financeiro');
  if (recursos.blockdomi === true) validos.push('blockdomi');
  if (recursos.equipamentos === true) validos.push('equipamentos');
  if (recursos.whatsapp === true) validos.push('envio_notificacoes');
  if (recursos.nfse === true) validos.push('nfse');
  validos.push('assinatura_digital');
  return [...new Set(validos)];
}
