export type ComunicacaoWhere = { [key: string]: any };

/**
 * Filtro estrito por tenant para servidores e mensagens de comunicação.
 * Não inclui registros com empresa_id nulo.
 * Retorna null quando empresaId é inválido.
 */
export function whereComunicacaoEmpresaEstrito(
  empresaId: number | null | undefined,
  base: ComunicacaoWhere = {}
): ComunicacaoWhere | null {
  if (empresaId == null || empresaId <= 0) {
    return null;
  }
  return { ...base, empresa_id: empresaId };
}

/**
 * Verifica se o registro pertence ao tenant (empresa_id nulo não é global).
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
