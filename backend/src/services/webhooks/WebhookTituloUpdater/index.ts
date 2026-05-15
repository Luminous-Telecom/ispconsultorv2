import { ReciboPagamentoService } from '../../comunicacao/ReciboPagamentoService';
import { logger } from '../../../utils/logger';
import { registrarAtualizacaoElasticsearch } from '../../elasticsearch/ElasticsearchAuditService';
import { desbloquearSeSemAtraso } from '../../saas/BloqueioAtrasoService';
import type { Request } from 'express';
import type { ResolvedTitulo } from '../TituloWebhookResolver';
import { TituloService } from '../../financeiro/TituloService';
import { SaasTituloService } from '../../saas/SaasCrudService';

type TituloLike = { id: number; empresa_id?: number; valor: number; pago: boolean; status: string; update: (data: Record<string, unknown>) => Promise<unknown>; reload: () => Promise<unknown>; toJSON: () => Record<string, unknown>; marcarComoPago?: (valor: number, data?: Date, skipLiquidacao?: boolean) => Promise<void> };

/** Recarrega `resolved.titulo` com o mesmo shape de `getById` (antes ou depois das alterações). */
export async function refetchResolvedTitulo(resolved: ResolvedTitulo): Promise<void> {
  const id = (resolved.titulo as { id: number }).id;
  const full = resolved.saas ? await SaasTituloService.getById(id) : await TituloService.getById(id);
  if (full) resolved.titulo = full;
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
    await t.update({
      pago: true,
      data_pagamento: dataPagamento,
      valor_pago: valorPago,
      status: 'pago'
    });
    const empresaId = (t as TituloLike & { empresa_id: number }).empresa_id;
    if (empresaId) {
      await desbloquearSeSemAtraso(empresaId);
      logger.info('Webhook - Empresa desbloqueada após pagamento', { empresa_id: empresaId });
    }
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
    await registrarAtualizacaoElasticsearch(
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
