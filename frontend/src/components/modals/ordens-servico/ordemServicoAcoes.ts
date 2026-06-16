export type OrdemServicoAcao =
  | 'agendar'
  | 'encaminhar'
  | 'assumir'
  | 'executar'
  | 'reagendar'
  | 'finalizar'
  | 'analisar'
  | 'reabrir'
  | 'registrar_mensagem';

export interface OrdemServicoAcaoConfig {
  key: OrdemServicoAcao;
  label: string;
  needsForm: boolean;
  confirmOnly?: boolean;
}

export const ORDEM_SERVICO_ACOES: OrdemServicoAcaoConfig[] = [
  { key: 'agendar', label: 'Agendar', needsForm: true },
  { key: 'encaminhar', label: 'Encaminhar', needsForm: true },
  { key: 'assumir', label: 'Assumir', needsForm: false, confirmOnly: true },
  { key: 'executar', label: 'Executar', needsForm: true },
  { key: 'reagendar', label: 'Necessário reagendar', needsForm: true },
  { key: 'finalizar', label: 'Finalizar', needsForm: true },
  { key: 'analisar', label: 'Analisar', needsForm: true },
  { key: 'reabrir', label: 'Reabrir', needsForm: true },
  { key: 'registrar_mensagem', label: 'Registrar mensagem', needsForm: true },
];

export const labelAcaoOrdemServico = (acao: OrdemServicoAcao): string =>
  ORDEM_SERVICO_ACOES.find((a) => a.key === acao)?.label ?? acao;
