export interface ReenvioSelecionavel {
  id: number;
  historico_id_real?: number;
  status?: string;
}

/**
 * Sem seleção, reenvia todas as falhas do canal (undefined).
 * Com seleção, só as linhas com status de erro.
 */
export function idsSelecionadosParaReenvio(items: ReenvioSelecionavel[]): number[] | undefined {
  if (items.length === 0) return undefined;
  return items
    .filter((item) => item.status === 'erro')
    .map((item) => item.historico_id_real ?? item.id);
}
