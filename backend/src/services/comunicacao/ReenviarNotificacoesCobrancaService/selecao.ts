import { Op } from 'sequelize';

export type CanalNotificacao = 'email' | 'whatsapp';
export type OrigemHistorico = 'erp' | 'saas';

export interface HistoricoCobrancaRow {
  id: number;
  tipo: CanalNotificacao;
  status: 'enviada' | 'erro';
  entidade_tipo?: string | null;
  entidade_id?: number | null;
  titulo?: string | null;
  historico_origem: OrigemHistorico;
  created_at: Date | string;
}

export interface TituloCobrancaEstado {
  status: string;
  pago: boolean;
}

const LIMITE_IDS = 100;

export function isReciboHistorico(titulo?: string | null): boolean {
  return (titulo ?? '').toLowerCase().includes('recibo');
}

export function isFalhaCobranca(row: HistoricoCobrancaRow): boolean {
  return row.status === 'erro'
    && row.entidade_tipo === 'titulo'
    && row.entidade_id != null
    && row.entidade_id > 0
    && (row.tipo === 'email' || row.tipo === 'whatsapp')
    && !isReciboHistorico(row.titulo);
}

export function tituloAceitaReenvioCobranca(titulo: TituloCobrancaEstado | null): boolean {
  if (!titulo || titulo.pago) return false;
  return titulo.status === 'pendente' || titulo.status === 'vencido' || titulo.status === 'parcial';
}

export function escolherMensagemCobranca<T extends { tipo: string; tipo_envio: string }>(mensagens: T[]): T | undefined {
  const ativas = mensagens.filter((mensagem) => mensagem.tipo_envio !== 'desativado' && mensagem.tipo !== 'recibo_pagamento');
  return ativas.find((mensagem) => mensagem.tipo === 'mesmo_dia_vencimento')
    ?? ativas.find((mensagem) => mensagem.tipo === 'envio_manual')
    ?? ativas[0];
}

export function textoMensagemCobranca(mensagem: {
  tipo: string;
  mensagem_padrao?: string | null;
  mensagem_manual?: string | null;
}): string {
  if (mensagem.tipo === 'envio_manual') {
    const manual = (mensagem.mensagem_manual ?? '').trim();
    if (manual && manual !== '<p></p>') return mensagem.mensagem_manual ?? '';
  }
  return mensagem.mensagem_padrao ?? '';
}

/**
 * Uma falha continua pendente enquanto não houver envio de cobrança posterior
 * do mesmo título, canal e origem. Várias falhas do mesmo título viram um único reenvio.
 */
export function selecionarFalhasCobrancaPendentes(rows: HistoricoCobrancaRow[]): HistoricoCobrancaRow[] {
  const cobrancas = rows.filter((row) => (
    row.entidade_tipo === 'titulo'
    && row.entidade_id != null
    && !isReciboHistorico(row.titulo)
  ));

  const pendentes = cobrancas.filter((row) => {
    if (!isFalhaCobranca(row)) return false;
    const erroEm = new Date(row.created_at).getTime();
    return !cobrancas.some((outro) => (
      outro.status === 'enviada'
      && outro.entidade_id === row.entidade_id
      && outro.tipo === row.tipo
      && outro.historico_origem === row.historico_origem
      && new Date(outro.created_at).getTime() > erroEm
    ));
  });

  const porTitulo = new Map<string, HistoricoCobrancaRow>();
  for (const row of pendentes) {
    const chave = `${row.historico_origem}:${row.tipo}:${row.entidade_id}`;
    const atual = porTitulo.get(chave);
    if (!atual || new Date(row.created_at).getTime() >= new Date(atual.created_at).getTime()) {
      porTitulo.set(chave, row);
    }
  }
  return [...porTitulo.values()];
}

export function parseReenviarFalhasBody(body: unknown):
  | { ok: true; tipo: CanalNotificacao; ids?: number[]; incluirErp: boolean }
  | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Dados inválidos' };
  }
  const raw = body as Record<string, unknown>;
  if (raw.tipo !== 'email' && raw.tipo !== 'whatsapp') {
    return { ok: false, message: 'Informe o canal: email ou whatsapp' };
  }

  let ids: number[] | undefined;
  if (raw.ids != null) {
    if (!Array.isArray(raw.ids) || raw.ids.length > LIMITE_IDS) {
      return { ok: false, message: 'ids inválidos' };
    }
    ids = [];
    for (const item of raw.ids) {
      const id = Number(item);
      if (!Number.isInteger(id) || id <= 0) {
        return { ok: false, message: 'ids inválidos' };
      }
      ids.push(id);
    }
  }

  return {
    ok: true,
    tipo: raw.tipo,
    ids,
    incluirErp: raw.incluir_erp === true,
  };
}

export function montarWhereFalhasCobranca(input: {
  tipo: CanalNotificacao;
  origens: OrigemHistorico[];
  empresaId: number | null;
  ids?: number[];
}): Record<string, unknown> {
  const where: Record<string, unknown> = {
    status: 'erro',
    tipo: input.tipo,
    entidade_tipo: 'titulo',
    entidade_id: { [Op.ne]: null },
    historico_origem: input.origens.length === 1 ? input.origens[0] : { [Op.in]: input.origens },
    [Op.or]: [
      { titulo: { [Op.is]: null } },
      { titulo: { [Op.notLike]: '%recibo%' } },
    ],
  };
  if (input.empresaId != null) {
    where.empresa_id = input.empresaId;
  }
  if (input.ids && input.ids.length > 0) {
    where.id = { [Op.in]: input.ids };
  }
  return where;
}
