import { prisma } from '../../../db/prisma';
import { BancoApiService } from '../../bancos/BancoApiService';
import { AsaasWebhookService } from '../../webhooks/AsaasWebhookService';
import { EfiWebhookProcessorService } from '../../webhooks/EfiWebhookProcessorService';
import { EfiHelpers } from '../../bancos/EfiService/EfiHelpers';
import { logger } from '../../../utils/logger';
import type { ApiResponse } from '../../bancos/types';
import type { AsaasPaymentPayload } from '../../../types/webhooks';
import type { JsonValue } from '../../../types/index';

export interface TituloSyncResult {
  success: boolean;
  message: string;
  total: number;
  consultados: number;
  atualizados: number;
  erros: number;
  sem_alteracao: number;
}

interface BancoSync {
  id: number;
  nome: string;
  tipo_banco: string;
  api_key: string | null;
  client_id_producao: string | null;
  client_secret_producao: string | null;
  identificador_conta: string | null;
  sandbox: boolean;
  url_retorno: string | null;
  webhook_secret: string | null;
  ativo: boolean;
}

interface TituloSync {
  id: number;
  status: string;
  pago: boolean;
  charge_id: string | null;
  banco_id: number;
  [key: string]: unknown;
}

interface TituloSyncItem {
  titulo: TituloSync;
  banco: BancoSync;
}

const BANCO_SELECT = {
  id: true,
  nome: true,
  tipo_banco: true,
  api_key: true,
  client_id_producao: true,
  client_secret_producao: true,
  identificador_conta: true,
  sandbox: true,
  url_retorno: true,
  webhook_secret: true,
  ativo: true,
} as const;

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function shapeBanco(row: Record<string, unknown>): BancoSync {
  return {
    id: Number(row.id),
    nome: String(row.nome ?? ''),
    tipo_banco: String(row.tipo_banco ?? ''),
    api_key: (row.api_key as string | null) ?? null,
    client_id_producao: (row.client_id_producao as string | null) ?? null,
    client_secret_producao: (row.client_secret_producao as string | null) ?? null,
    identificador_conta: (row.identificador_conta as string | null) ?? null,
    sandbox: asBool(row.sandbox),
    url_retorno: (row.url_retorno as string | null) ?? null,
    webhook_secret: (row.webhook_secret as string | null) ?? null,
    ativo: asBool(row.ativo),
  };
}

export class TituloStatusSyncService {
  private static runningAsaas = false;
  private static runningEfi = false;

  static async syncAsaas(): Promise<TituloSyncResult> {
    if (this.runningAsaas) {
      return { success: true, message: 'Consulta Asaas já em execução', total: 0, consultados: 0, atualizados: 0, erros: 0, sem_alteracao: 0 };
    }
    this.runningAsaas = true;
    try {
      return await this.syncByTipoBanco('asaas');
    } finally {
      this.runningAsaas = false;
    }
  }

  static async syncEfi(): Promise<TituloSyncResult> {
    if (this.runningEfi) {
      return { success: true, message: 'Consulta Efi já em execução', total: 0, consultados: 0, atualizados: 0, erros: 0, sem_alteracao: 0 };
    }
    this.runningEfi = true;
    try {
      return await this.syncByTipoBanco('efi');
    } finally {
      this.runningEfi = false;
    }
  }

  private static async syncByTipoBanco(tipoBanco: 'asaas' | 'efi'): Promise<TituloSyncResult> {
    const titulos = await this.findTitulosPendentes(tipoBanco);
    let consultados = 0;
    let atualizados = 0;
    let erros = 0;
    let semAlteracao = 0;

    for (const item of titulos) {
      try {
        const statusAntes = item.titulo.status;
        const pagoAntes = item.titulo.pago;
        const resultado = tipoBanco === 'asaas' ? await this.syncTituloAsaas(item) : await this.syncTituloEfi(item);
        consultados++;
        if (resultado === 'erro') {
          erros++;
          continue;
        }
        const fresh = await this.reloadTitulo(item);
        if (fresh) {
          item.titulo.status = fresh.status;
          item.titulo.pago = fresh.pago;
        }
        if (item.titulo.status !== statusAntes || item.titulo.pago !== pagoAntes) atualizados++;
        else semAlteracao++;
      } catch (error) {
        erros++;
        logger.error('TituloStatusSyncService - Erro ao sincronizar título', {
          tipo_banco: tipoBanco,
          titulo_id: item.titulo.id,
          saas: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    const message = `Consulta ${tipoBanco}: ${consultados} título(s), ${atualizados} atualizado(s), ${semAlteracao} sem alteração, ${erros} erro(s)`;
    return {
      success: erros === 0 || consultados > erros,
      message,
      total: titulos.length,
      consultados,
      atualizados,
      erros,
      sem_alteracao: semAlteracao,
    };
  }

  private static async findTitulosPendentes(tipoBanco: 'asaas' | 'efi'): Promise<TituloSyncItem[]> {
    const erp = await prisma.financeiro_titulos.findMany({
      where: {
        pago: false,
        charge_id: { not: null },
        status: { in: ['pendente', 'vencido'] },
        cadastros_bancos: { tipo_banco: tipoBanco, ativo: true },
      },
      include: { cadastros_bancos: { select: BANCO_SELECT } },
    });

    const items: TituloSyncItem[] = [];
    for (const titulo of erp) {
      if (!titulo.cadastros_bancos) continue;
      items.push({
        titulo: {
          ...titulo,
          pago: titulo.pago,
          charge_id: titulo.charge_id,
        },
        banco: shapeBanco(titulo.cadastros_bancos as unknown as Record<string, unknown>),
      });
    }
    return items;
  }

  private static async reloadTitulo(item: TituloSyncItem): Promise<{ status: string; pago: boolean } | null> {
    const row = await prisma.financeiro_titulos.findUnique({
      where: { id: item.titulo.id },
      select: { status: true, pago: true },
    });
    return row ? { status: row.status, pago: row.pago } : null;
  }

  private static async syncTituloAsaas(item: TituloSyncItem): Promise<'atualizado' | 'sem_alteracao' | 'erro'> {
    const resultado = await this.consultarTitulo(item, 'asaas');
    if (!resultado.success || !resultado.data) return 'erro';
    const payment = resultado.data as AsaasPaymentPayload['payment'];
    if (!payment?.id) {
      logger.warn('TituloStatusSyncService - Resposta Asaas sem payment.id', {
        titulo_id: item.titulo.id,
        charge_id: item.titulo.charge_id,
      });
      return 'erro';
    }
    await AsaasWebhookService.processWebhook(payment);
    return 'sem_alteracao';
  }

  private static async syncTituloEfi(item: TituloSyncItem): Promise<'atualizado' | 'sem_alteracao' | 'erro'> {
    const resultado = await this.consultarTitulo(item, 'efi');
    if (!resultado.success || !resultado.data) return 'erro';
    const dados = resultado.data as Record<string, JsonValue>;
    const chargeData = (EfiHelpers.getNestedValue(dados, 'data') ?? dados) as Record<string, JsonValue>;
    const status = typeof chargeData.status === 'string' ? chargeData.status : resultado.status;
    if (!status) {
      logger.warn('TituloStatusSyncService - Resposta Efi sem status', {
        titulo_id: item.titulo.id,
        charge_id: item.titulo.charge_id,
      });
      return 'erro';
    }
    const chargeId = chargeData.charge_id ?? item.titulo.charge_id;
    await EfiWebhookProcessorService.processChargeNotification({
      id: chargeId != null ? String(chargeId) : undefined,
      charge_id: chargeId != null ? String(chargeId) : undefined,
      status,
      paid_at: typeof chargeData.paid_at === 'string' ? chargeData.paid_at : undefined,
      payment_date: typeof chargeData.payment_date === 'string' ? chargeData.payment_date : undefined,
      confirmed_at: typeof chargeData.confirmed_at === 'string' ? chargeData.confirmed_at : undefined,
      created_at: typeof chargeData.created_at === 'string' ? chargeData.created_at : undefined,
    });
    return 'sem_alteracao';
  }

  private static async consultarTitulo(item: TituloSyncItem, _tipoBanco: 'asaas' | 'efi'): Promise<ApiResponse> {
    const tituloComRelacoes = { ...item.titulo, banco: item.banco };
    return BancoApiService.consultarStatus(tituloComRelacoes as Parameters<typeof BancoApiService.consultarStatus>[0]);
  }
}

export default TituloStatusSyncService;
