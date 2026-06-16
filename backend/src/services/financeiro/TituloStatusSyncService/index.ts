import { Op } from 'sequelize';
import { Banco } from '../../../models/cadastros/Banco';
import { Titulo } from '../../../models/financeiro/Titulo';
import SaasTitulo from '../../../models/saas/SaasTitulo';
import SaasBanco from '../../../models/saas/SaasBanco';
import { AsaasService } from '../../bancos/AsaasService';
import { AsaasTituloService } from '../../bancos/AsaasService/AsaasTituloService';
import { EfiService } from '../../bancos/EfiService';
import { EfiTituloService } from '../../bancos/EfiService/EfiTituloService';
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

type BancoLike = Banco | InstanceType<typeof SaasBanco>;

interface TituloSyncItem {
  titulo: InstanceType<typeof Titulo> | InstanceType<typeof SaasTitulo>;
  saas: boolean;
  banco: BancoLike;
}

const BANCO_CREDENCIAIS_ATTRS = [
  'id',
  'nome',
  'tipo_banco',
  'api_key',
  'client_id_producao',
  'client_secret_producao',
  'identificador_conta',
  'sandbox',
  'url_retorno',
  'webhook_secret',
  'ativo',
] as const;

const WHERE_TITULO_PENDENTE = {
  pago: false,
  charge_id: { [Op.ne]: null as unknown as string },
  status: { [Op.in]: ['pendente', 'vencido'] as const },
};

export class TituloStatusSyncService {
  private static runningAsaas = false;
  private static runningEfi = false;

  static async syncAsaas(): Promise<TituloSyncResult> {
    if (this.runningAsaas) {
      return {
        success: true,
        message: 'Consulta Asaas já em execução',
        total: 0,
        consultados: 0,
        atualizados: 0,
        erros: 0,
        sem_alteracao: 0,
      };
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
      return {
        success: true,
        message: 'Consulta Efi já em execução',
        total: 0,
        consultados: 0,
        atualizados: 0,
        erros: 0,
        sem_alteracao: 0,
      };
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
        const resultado =
          tipoBanco === 'asaas'
            ? await this.syncTituloAsaas(item)
            : await this.syncTituloEfi(item);

        consultados++;

        if (resultado === 'erro') {
          erros++;
          continue;
        }

        await item.titulo.reload();
        if (item.titulo.status !== statusAntes || item.titulo.pago !== pagoAntes) {
          atualizados++;
        } else {
          semAlteracao++;
        }
      } catch (error) {
        erros++;
        logger.error('TituloStatusSyncService - Erro ao sincronizar título', {
          tipo_banco: tipoBanco,
          titulo_id: item.titulo.id,
          saas: item.saas,
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
    const [erp, saas] = await Promise.all([
      Titulo.findAll({
        where: WHERE_TITULO_PENDENTE,
        include: [
          {
            model: Banco,
            as: 'banco',
            required: true,
            where: { tipo_banco: tipoBanco, ativo: true },
            attributes: [...BANCO_CREDENCIAIS_ATTRS],
          },
        ],
      }),
      SaasTitulo.findAll({
        where: WHERE_TITULO_PENDENTE,
        include: [
          {
            model: SaasBanco,
            as: 'banco',
            required: true,
            where: { tipo_banco: tipoBanco, ativo: true },
            attributes: [...BANCO_CREDENCIAIS_ATTRS],
          },
        ],
      }),
    ]);

    const items: TituloSyncItem[] = [];

    for (const titulo of erp) {
      const banco = (titulo as InstanceType<typeof Titulo> & { banco?: BancoLike }).banco;
      if (banco) items.push({ titulo, saas: false, banco });
    }

    for (const titulo of saas) {
      const banco = (titulo as InstanceType<typeof SaasTitulo> & { banco?: BancoLike }).banco;
      if (banco) items.push({ titulo, saas: true, banco });
    }

    return items;
  }

  private static async syncTituloAsaas(item: TituloSyncItem): Promise<'atualizado' | 'sem_alteracao' | 'erro'> {
    const resultado = await this.consultarTitulo(item, 'asaas');
    if (!resultado.success || !resultado.data) {
      return 'erro';
    }

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
    if (!resultado.success || !resultado.data) {
      return 'erro';
    }

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

  private static async consultarTitulo(item: TituloSyncItem, tipoBanco: 'asaas' | 'efi'): Promise<ApiResponse> {
    if (!item.saas) {
      const tituloComRelacoes = {
        ...(item.titulo.get({ plain: true }) as Record<string, unknown>),
        banco: item.banco as Banco,
      };
      return BancoApiService.consultarStatus(tituloComRelacoes as Parameters<typeof BancoApiService.consultarStatus>[0]);
    }

    const banco = await this.reloadBanco(item.banco, true);
    if (!banco) {
      return { success: false, message: 'Banco SaaS não encontrado' };
    }

    const titulo = item.titulo as InstanceType<typeof Titulo>;
    const bancoCast = banco as Banco;

    if (tipoBanco === 'asaas') {
      const asaasService = new AsaasService();
      const token = await asaasService.obterToken(bancoCast);
      if (!token) return { success: false, message: 'Falha ao obter token Asaas' };
      return AsaasTituloService.consultarStatus(titulo, bancoCast, token);
    }

    const efiService = new EfiService();
    const token = await efiService.obterToken(bancoCast);
    if (!token) return { success: false, message: 'Falha ao obter token Efi' };
    return EfiTituloService.consultarStatus(titulo, bancoCast, token);
  }

  private static async reloadBanco(banco: BancoLike, saas: boolean): Promise<BancoLike | null> {
    if (saas) {
      const instance = await SaasBanco.findByPk(banco.id, {
        attributes: [...BANCO_CREDENCIAIS_ATTRS],
      });
      return instance;
    }

    const instance = await Banco.findByPk(banco.id, {
      attributes: [...BANCO_CREDENCIAIS_ATTRS],
    });
    return instance;
  }
}

export default TituloStatusSyncService;
