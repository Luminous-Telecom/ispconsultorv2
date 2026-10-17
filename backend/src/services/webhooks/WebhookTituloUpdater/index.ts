import { ReciboPagamentoService } from '../../comunicacao/ReciboPagamentoService';
import { logger } from '../../../utils/logger';
import { registrarAtualizacao } from '../../sistema/AuditoriaRegistroService';
import { desbloquearSeSemAtraso } from '../../saas/BloqueioAtrasoService';
import type { Request } from 'express';
import { buildTituloPagamentoUpdate } from '../../../utils/tituloVencimentoUtils';
import type { ResolvedTitulo } from '../TituloWebhookResolver';
import { TituloService } from '../../financeiro/TituloService';
import { SaasTituloService } from '../../saas/SaasCrudService';

type TituloLike = { id: number; empresa_id?: number; valor: number; data_vencimento: string | Date; pago: boolean; status: string; update: (data: Record<string, unknown>) => Promise<unknown>; reload: () => Promise<unknown>; toJSON: () => Record<string, unknown>; marcarComoPago?: (valor: number, data?: Date, skipLiquidacao?: boolean) => Promise<void> };

/** Recarrega `resolved.titulo` com o mesmo shape de `getById` (antes ou depois das alterações). */
export async function refetchResolvedTitulo(resolved: ResolvedTitulo): Promise<void> {
  const id = (resolved.titulo as { id: number }).id;
  const full = resolved.saas ? await SaasTituloService.getById(id) : await TituloService.getById(id);
  if (full) resolved.titulo = full as unknown as ResolvedTitulo['titulo'];
}

/**
 * Aplica atualização de pagamento via webhook em título (admin ou SaaS)
 */
export async function applyPagoWebhook(
  resolved: ResolvedTitulo,
  valorPago: number,
  dataPagamento: Date
): Promise<void> {
  const { titulo, saas } = resolved;
  const t = titulo as TituloLike;

  if (saas) {
    const pagamentoUpdate = buildTituloPagamentoUpdate({
      dataVencimento: t.data_vencimento,
      dataPagamento,
      valorPago,
      valorTotal: Number(t.valor),
    });
    await t.update(pagamentoUpdate);
    const empresaId = (t as TituloLike & { empresa_id: number }).empresa_id;
    if (empresaId) {
      await desbloquearSeSemAtraso(empresaId);
      logger.info('Webhook - Empresa desbloqueada após pagamento', { empresa_id: empresaId });
    }
  } else if (typeof t.marcarComoPago === 'function') {
    await t.marcarComoPago(valorPago, dataPagamento, true);
  }
}

/** Baixa automática só dispara recibo se o pagamento caiu nesta janela (evita recibo de cobrança antiga). */
const RECIBO_AUTOMATICO_MAX_DIAS = 7;

function diaLocal(value: Date | string): Date | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function pagamentoRecenteParaRecibo(dataPagamento: Date | string | null | undefined): boolean {
  if (dataPagamento == null || dataPagamento === '') return true;
  const pagamentoDia = diaLocal(dataPagamento);
  if (!pagamentoDia) return true;
  const limite = new Date();
  limite.setHours(0, 0, 0, 0);
  limite.setDate(limite.getDate() - RECIBO_AUTOMATICO_MAX_DIAS);
  return pagamentoDia >= limite;
}

/**
 * Envia recibo só na transição para pago (admin).
 * Webhook repetido de título já pago, ou baixa de pagamento com mais de 7 dias, não reenvia.
 */
export function enviarReciboSeAdmin(resolved: ResolvedTitulo, jaEstavaPago: boolean): void {
  if (resolved.saas || jaEstavaPago || !resolved.titulo.pago) return;

  const titulo = resolved.titulo as { id: number; data_pagamento?: Date | string | null };
  if (!pagamentoRecenteParaRecibo(titulo.data_pagamento)) {
    logger.info('[Recibo] Pagamento antigo — recibo automático não enviado', {
      titulo_id: titulo.id,
      data_pagamento: titulo.data_pagamento ?? null,
    });
    return;
  }

  ReciboPagamentoService.enviarRecibo(titulo.id);
}

/**
 * Registra auditoria no Elasticsearch com origem webhook e empresa_id do título.
 * Permite filtrar Logs de Webhook por tenant.
 */
export async function registrarAuditoriaWebhook(
  req: Request | undefined,
  resolved: ResolvedTitulo,
  dadosAnteriores: Record<string, unknown>,
  dadosNovos: Record<string, unknown>,
  mensagem: string
): Promise<void> {
  if (!req) return;
  const nomeEntidade = resolved.saas ? 'SaasTitulo' : 'Titulo';
  const empresaId = (resolved.titulo as { empresa_id?: number | null }).empresa_id ?? null;
  try {
    await registrarAtualizacao(
      req,
      nomeEntidade,
      (resolved.titulo as { id: number }).id,
      dadosAnteriores,
      dadosNovos,
      mensagem,
      empresaId,
      'webhook'
    );
  } catch (auditError) {
    logger.warn(`Erro ao registrar auditoria de webhook ${nomeEntidade}`, {
      titulo_id: (resolved.titulo as { id: number }).id,
      error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
    });
  }
}
