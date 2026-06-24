export type OrdemServicoAcao =
  | 'agendar'
  | 'encaminhar'
  | 'executar'
  | 'finalizar'
  | 'reabrir'
  | 'registrar_mensagem';

export interface OrdemServicoAcaoConfig {
  key: OrdemServicoAcao;
  label: string;
  needsForm: boolean;
}

export const ORDEM_SERVICO_ACOES: OrdemServicoAcaoConfig[] = [
  { key: 'agendar', label: 'Agendar', needsForm: true },
  { key: 'encaminhar', label: 'Encaminhar', needsForm: true },
  { key: 'executar', label: 'Executar', needsForm: true },
  { key: 'finalizar', label: 'Finalizar', needsForm: true },
  { key: 'reabrir', label: 'Reabrir', needsForm: true },
  { key: 'registrar_mensagem', label: 'Registrar mensagem', needsForm: true },
];

export const isOrdemServicoLocal = (ordem?: { origem?: string; id_local?: string | number } | null): boolean =>
  ordem?.origem === 'backnet' || Boolean(ordem?.id_local);

export const labelAcaoOrdemServico = (acao: OrdemServicoAcao): string =>
  ORDEM_SERVICO_ACOES.find((a) => a.key === acao)?.label ?? acao;
