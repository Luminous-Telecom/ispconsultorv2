import type { OssChamadoAcao } from './types';

export const IXC_RESOURCE = 'su_oss_chamado';
export const IXC_MENSAGEM_RESOURCE = 'su_oss_chamado_mensagem';
export const IXC_ALTERAR_SETOR_RESOURCE = 'su_oss_chamado_alterar_setor';
export const IXC_EVENTO_ABERTURA = '1';
export const IXC_EVENTO_OBSERVACAO = '12';
export const IXC_EVENTO_FINALIZAR = '6';

export const IXC_ESTRUTURA_RESOURCE = 'estrutura';
export const IXC_FUNCIONARIOS_RESOURCE = 'funcionarios';
export const IXC_ASSUNTO_RESOURCE = 'su_oss_assunto';
export const IXC_SETOR_RESOURCE = 'empresa_setor';
export const IXC_FILIAL_RESOURCE = 'filial';
export const IXC_CIDADE_RESOURCE = 'cidade';
export const IXC_USUARIOS_RESOURCE = 'usuarios';

/** Labels dos eventos de mensagem da OS (parâmetros gerais IXC). */
export const OSS_EVENTO_LABELS: Record<string, string> = {
  '1': 'Abertura',
  '2': 'Mensagem',
  '3': 'Reabrir',
  '4': 'Alterar setor',
  '5': 'Reagendar',
  '6': 'Finalizar',
  '7': 'Em análise',
  '8': 'Assumido',
  '9': 'Em execução',
  '12': 'Observação',
  '13': 'Reagendamento',
};

export const OSS_CHAMADO_ACOES: OssChamadoAcao[] = [
  'agendar',
  'encaminhar',
  'executar',
  'finalizar',
  'reabrir',
  'registrar_mensagem',
];

export const CAMPOS_BACKNET = ['cliente_id'];

export const CAMPOS_ENRIQUECIDOS = [
  'estrutura_nome',
  'tecnico_nome',
  'assunto_nome',
  'setor_nome',
  'filial_nome',
  'cliente_id',
  'cliente_nome',
  'cidade_nome',
];

export const CAMPOS_AUTOGERADOS_CRIACAO = ['protocolo', 'data_abertura', 'ultima_atualizacao'];

/** Valores padrão ao criar OS no IXC (tipo E — estrutura própria). */
export const OSS_DEFAULTS: Record<string, string> = {
  tipo: 'E',
  origem_endereco: 'M',
  origem_endereco_estrutura: 'E',
  prioridade: 'N',
  melhor_horario_agenda: 'Q',
  status: 'A',
  status_assinatura: 'A',
  gera_comissao: 'S',
  liberado: '1',
  impresso: 'N',
  origem_cadastro: 'P',
  origem_change_endereco: 'default',
  valor_unit_comissao: '0,00',
  valor_total_comissao: '0,00',
};
