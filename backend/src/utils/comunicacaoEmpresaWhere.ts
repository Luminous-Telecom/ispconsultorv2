import type { WhereOptions } from 'sequelize';

/**
 * Monta filtro WHERE estrito por tenant para servidores/mensagens de comunicação.
 * Não inclui registros legacy com empresa_id NULL — evita vazamento entre tenants.
 * Retorna null quando empresaId é inválido (caller deve abortar o envio).
 */
export function whereComunicacaoEmpresaEstrito(
  empresaId: number | null | undefined,
  base: WhereOptions = {}
): WhereOptions | null {
  if (empresaId == null || empresaId <= 0) {
    return null;
  }
  return { ...base, empresa_id: empresaId };
}

/**
 * Verifica se o registro pertence ao tenant (sem aceitar empresa_id NULL como global).
 */
export function pertenceComunicacaoEmpresa(
  registroEmpresaId: number | null | undefined,
  empresaId: number | null | undefined
): boolean {
  if (empresaId == null || empresaId <= 0) {
    return false;
  }
  return registroEmpresaId === empresaId;
}
