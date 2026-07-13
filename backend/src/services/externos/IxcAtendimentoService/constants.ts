export const IXC_ATENDIMENTO_RESOURCE = 'su_ticket';
/** Campo do IXC em `su_ticket` (sem "h" — diferente do nome interno do ERP). */
export const IXC_CAMPO_RESPONSAVEL_TECNICO = 'id_responsavel_tecnico';
/** Campo interno ERP / espelho local `atendimentos`. */
export const ERP_CAMPO_RESPONSAVEL_TECHNICO = 'id_responsavel_technico';
/** Transferência/assunção — fallback quando PUT direto em `su_ticket` não aplicar depto/responsável. */
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

export function readResponsavelFromIxcRegistro(registro: Record<string, string>): string {
  return String(
    registro[IXC_CAMPO_RESPONSAVEL_TECNICO] ?? registro[ERP_CAMPO_RESPONSAVEL_TECHNICO] ?? ''
  ).trim();
}

/** Normaliza registro IXC para o nome de campo usado no ERP/espelho local. */
export function normalizeIxcTicketRegistro(registro: Record<string, string>): Record<string, string> {
  const normalized = { ...registro };
  const responsavel = readResponsavelFromIxcRegistro(registro);
  if (responsavel) {
    normalized[ERP_CAMPO_RESPONSAVEL_TECHNICO] = responsavel;
  }
  delete normalized[IXC_CAMPO_RESPONSAVEL_TECNICO];
  return normalized;
}

/** Mapeia campo ERP → nome aceito pela API IXC em listagens/ordenação. */
export function mapErpCampoToIxcQuery(campo: string): string {
  return campo === ERP_CAMPO_RESPONSAVEL_TECHNICO ? IXC_CAMPO_RESPONSAVEL_TECNICO : campo;
}

/** Grava colaborador responsável no body de POST/PUT `su_ticket`. */
export function applyResponsavelToIxcBody(
  body: Record<string, string>,
  responsavelId: string | number | null | undefined
): void {
  delete body[ERP_CAMPO_RESPONSAVEL_TECHNICO];
  const normalized = String(responsavelId ?? '').trim();
  if (normalized && normalized !== '0') {
    body[IXC_CAMPO_RESPONSAVEL_TECNICO] = normalized;
  } else {
    delete body[IXC_CAMPO_RESPONSAVEL_TECNICO];
  }
}
