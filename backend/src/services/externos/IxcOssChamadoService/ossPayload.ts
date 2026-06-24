import {
  CAMPOS_AUTOGERADOS_CRIACAO,
  CAMPOS_BACKNET,
  CAMPOS_ENRIQUECIDOS,
  IXC_RESOURCE,
  OSS_DEFAULTS,
} from './constants';
import { ixcListar, sanitizeInput } from './ixcHttp';
import { IXC_PROTOCOLO_PATTERN } from '../../ordens/ordemServicoProtocolo';
import type { IxcListResponse, IxcOssChamado, OssChamadoAcao, OssChamadoInput } from './types';

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

export function applyBacknetCliente(payload: OssChamadoInput, body: Record<string, string>): void {
  for (const campo of CAMPOS_BACKNET) {
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

export async function fetchProximoProtocolo(): Promise<string> {
  const year = String(new Date().getFullYear());
  const data = await ixcListar<IxcListResponse>(IXC_RESOURCE, {
    qtype: `${IXC_RESOURCE}.protocolo`,
    query: year,
    oper: 'L',
    page: '1',
    rp: '1',
    sortname: `${IXC_RESOURCE}.protocolo`,
    sortorder: 'desc',
  });

  const ultimo = data.registros?.[0]?.protocolo?.trim();
  if (!ultimo || !IXC_PROTOCOLO_PATTERN.test(ultimo)) {
    return `${year}000001`;
  }
  return String(Number(ultimo) + 1);
}

export function prepareCreateBody(payload: OssChamadoInput): Record<string, string> {
  const body = { ...OSS_DEFAULTS, ...sanitizeInput(payload) };
  delete body.id;
  for (const campo of CAMPOS_AUTOGERADOS_CRIACAO) {
    delete body[campo];
  }
  applyBacknetCliente(payload, body);
  return body;
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

  if (mensagemAcao && acao !== 'registrar_mensagem') {
    body.mensagem = String(atual.mensagem ?? '');
  }

  return body;
}
