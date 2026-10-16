export interface ReenvioSelecionavel {
  id: number;
  historico_id_real?: number;
  status?: string;
}

/**
 * Ids das linhas selecionadas que estão com erro.
 * Lista vazia ou só envios ok devolve lista vazia.
 * Sem itens, devolve undefined.
 */
export function idsSelecionadosParaReenvio(items: ReenvioSelecionavel[]): number[] | undefined {
  if (items.length === 0) return undefined;
  return items
    .filter((item) => item.status === 'erro')
    .map((item) => item.historico_id_real ?? item.id);
}
