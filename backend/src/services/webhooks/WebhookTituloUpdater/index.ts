import { PaymentCommonService } from '../PaymentCommonService';
import { ReciboPagamentoService } from '../../comunicacao/ReciboPagamentoService';
import { logger } from '../../../utils/logger';
import { registrarAtualizacaoElasticsearch } from '../../elasticsearch/ElasticsearchAuditService';
import type { Request } from 'express';
import type { ResolvedTitulo } from '../TituloWebhookResolver';

type TituloLike = { id: number; valor: number; pago: boolean; status: string; update: (data: Record<string, unknown>) => Promise<unknown>; reload: () => Promise<unknown>; toJSON: () => Record<string, unknown>; marcarComoPago?: (valor: number, data?: Date, skipLiquidacao?: boolean) => Promise<void> };

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
    await t.update({
      pago: true,
      data_pagamento: dataPagamento,
      valor_pago: valorPago,
      status: 'pago'
    });
  } else if (typeof t.marcarComoPago === 'function') {
    await t.marcarComoPago(valorPago, dataPagamento, true);
  }
}

/**
 * Aplica atualização de status (não pago) em título
 */
export async function applyStatusWebhook(
  resolved: ResolvedTitulo,
  updates: { status: string; pago: boolean; data_pagamento?: null; valor_pago?: null }
): Promise<void> {
  const { titulo } = resolved;
  const t = titulo as TituloLike;
  await t.update(updates);
}

/**
 * Envia recibo de pagamento apenas para títulos admin (não SaaS)
 */
export function enviarReciboSeAdmin(resolved: ResolvedTitulo): void {
  if (!resolved.saas && resolved.titulo.pago) {
    ReciboPagamentoService.enviarRecibo((resolved.titulo as { id: number }).id);
  }
}

/**
 * Registra auditoria no Elasticsearch
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
  try {
    await registrarAtualizacaoElasticsearch(
      req,
      nomeEntidade,
      (resolved.titulo as { id: number }).id,
      dadosAnteriores,
      dadosNovos,
      mensagem
    );
  } catch (auditError) {
    logger.warn(`Erro ao registrar auditoria de webhook ${nomeEntidade}`, {
      titulo_id: (resolved.titulo as { id: number }).id,
      error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
    });
  }
}
