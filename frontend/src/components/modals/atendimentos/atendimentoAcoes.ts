export type AtendimentoAcao = 'interagir' | 'abrir_os';

export interface AtendimentoAcaoConfig {
  key: AtendimentoAcao;
  label: string;
}

export const ATENDIMENTO_ACOES: AtendimentoAcaoConfig[] = [
  { key: 'interagir', label: 'Interagir' },
  { key: 'abrir_os', label: 'Abrir OS' },
];

export function isAtendimentoInteracaoBloqueada(suStatus?: string): boolean {
  const status = String(suStatus ?? '').trim();
  return status === 'S' || status === 'C';
}

export function resolveAtendimentoId(item: {
  id_local?: string | number;
  id?: string | number;
}): number | string {
  const idLocal = item.id_local;
  if (idLocal != null && String(idLocal).trim() !== '') return idLocal;
  return item.id as number | string;
}
