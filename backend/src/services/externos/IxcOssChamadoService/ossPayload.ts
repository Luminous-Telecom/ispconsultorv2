import {
  CAMPOS_AUTOGERADOS_CRIACAO,
  CAMPOS_ISPCONSULTOR,
  CAMPOS_ENRIQUECIDOS,
  OSS_DEFAULTS,
} from './constants';
import { resolveOperadorId, sanitizeInput } from './ixcHttp';
import type { IxcOssChamado, OssChamadoAcao, OssChamadoInput } from './types';

export function parseClienteId(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function stripCamposEnriquecidos(registro: IxcOssChamado): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(registro)) {
    if (CAMPOS_ENRIQUECIDOS.includes(key)) continue;
    result[key] = String(value ?? '');
  }
  return result;
}

export function applyIspconsultorCliente(payload: OssChamadoInput, body: Record<string, string>): void {
  for (const campo of CAMPOS_ISPCONSULTOR) {
    delete body[campo];
  }

  const rawClienteId = payload.cliente_id;
  const clienteId =
    rawClienteId !== undefined &&
    rawClienteId !== null &&
    String(rawClienteId).trim() !== '' &&
    String(rawClienteId) !== '0'
      ? String(rawClienteId).trim()
      : '';

  body.id_cliente = '0';
  body.idx = clienteId;
}

export function prepareCreateBody(payload: OssChamadoInput): Record<string, string> {
  const body = { ...OSS_DEFAULTS, ...sanitizeInput(payload) };
  delete body.id;
  for (const campo of CAMPOS_AUTOGERADOS_CRIACAO) {
    delete body[campo];
  }
  applyIspconsultorCliente(payload, body);

  const idTicket = String(payload.id_ticket ?? body.id_ticket ?? '').trim();
  if (idTicket) {
    body.id_ticket = idTicket;
  }

  return body;
}

export function applyIspconsultorProtocoloAbertura(body: Record<string, string>, protocolo: string): void {
  const normalized = protocolo.trim();
  if (normalized) {
    body.protocolo = normalized;
  }
}

export function applyApiOperadorAbertura(body: Record<string, string>): void {
  const operadorId = resolveOperadorId();
  if (operadorId) {
    body.id_operador = operadorId;
  }
}

export function buildActionBody(
  acao: OssChamadoAcao,
  atual: IxcOssChamado,
  payload: OssChamadoInput
): Record<string, string> {
  const sanitized = sanitizeInput(payload);
  const body: Record<string, string> = { ...stripCamposEnriquecidos(atual) };

  const mensagemAcao = sanitized.mensagem;
  delete sanitized.mensagem;

  if (acao !== 'finalizar') {
    delete sanitized.mensagem_resposta;
  }

  Object.assign(body, sanitized);

  if (acao === 'agendar') {
    const dataAgenda = sanitized.data_agenda ?? body.data_agenda;
    if (dataAgenda) {
      body.data_agenda = dataAgenda;
      body.data_inicio = dataAgenda;
    }
    if (sanitized.data_agenda_final) {
      body.data_agenda_final = sanitized.data_agenda_final;
    }
    if (sanitized.id_tecnico) {
      body.id_tecnico = sanitized.id_tecnico;
    }
    body.status = 'AG';
  }

  if (acao === 'finalizar' && sanitized.mensagem_resposta) {
    body.mensagem_resposta = sanitized.mensagem_resposta;
  }

  if (acao === 'reabrir') {
    body.status = 'A';
  }

  if (mensagemAcao && acao !== 'registrar_mensagem') {
    body.mensagem = String(atual.mensagem ?? '');
  }

  return body;
}
