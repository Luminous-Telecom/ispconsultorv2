export const IXC_ATENDIMENTO_RESOURCE = 'su_ticket';
/** Transferência/assunção de colaborador responsável (`id_responsavel_tecnico`). */
export const IXC_TRANSFERENCIA_RESOURCE = 'su_transf_atendimento';
export const IXC_MENSAGEM_RESOURCE = 'su_mensagens';
/** Departamento do atendimento (id_ticket_setor). */
export const IXC_DEPARTAMENTO_RESOURCE = 'su_ticket_setor';
export const IXC_OSS_RESOURCE = 'su_oss_chamado';

export const ATENDIMENTO_DEFAULTS: Record<string, string> = {
  tipo: 'E',
  origem_endereco: 'E',
  origem_endereco_estrutura: 'E',
  prioridade: 'N',
  melhor_horario_reserve: 'Q',
  su_status: 'N',
  origem_cadastro: 'P',
  interacao_pendente: 'N',
};

/** Atendimento no IXC sempre abre por estrutura (tipo E), não por cliente. */
export function applyAtendimentoTipoEstrutura(body: Record<string, string>): void {
  body.tipo = 'E';
  body.id_cliente = '0';
  body.origem_endereco = 'E';
  body.origem_endereco_estrutura = 'E';
}

export const CAMPOS_ENRIQUECIDOS = [
  'cliente_id',
  'cliente_nome',
  'filial_nome',
  'estrutura_nome',
  'assunto_nome',
  'departamento_nome',
  'responsavel_nome',
];

export const CAMPOS_AUTOGERADOS = ['protocolo', 'data_criacao', 'ultima_atualizacao'];
