import { Banco } from '../../models/Banco';
import { Titulo } from '../../models/Titulo';
import { BarcodeService } from '../BarcodeService';
import { PaymentCommonService } from './PaymentCommonService';
import { logger } from '../../utils/logger';
import { JsonValue } from '../../types/index';
import { AsaasPaymentPayload } from '../../types/webhooks';

/**
 * Serviço para processamento de webhooks do Asaas
 */
export class AsaasWebhookService {
  /**
   * Processa webhook do Asaas
   * @param payment Objeto payment do payload
   * @param titulo Título encontrado pelo charge_id
   * @returns WebhookResponse com resultado do processamento
   */
  static async processWebhook(
    payment: AsaasPaymentPayload['payment'],
    titulo: Titulo & { banco?: Banco | null }
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!payment || !payment.id) {
        return {
          success: true,
          message: 'Webhook recebido sem payment.id'
        };
      }

      if (!titulo) {
        return {
          success: true,
          message: 'Título não encontrado para este charge_id'
        };
      }

      const updates: Partial<Titulo> & Record<string, JsonValue> = {};
      const pagamentoStatusRaw = payment.status;
      const paymentStatus = typeof pagamentoStatusRaw === 'string'
        ? pagamentoStatusRaw.toUpperCase()
        : '';

      const novoStatus = AsaasWebhookService.mapAsaasStatus(paymentStatus);
      if (novoStatus) {
        updates.status = novoStatus;
      }

      const paymentDate = typeof payment.paymentDate === 'string'
        ? payment.paymentDate
        : typeof payment.effectiveDate === 'string'
          ? payment.effectiveDate
          : undefined;

      if (novoStatus === 'pago') {
        // Normalizar data de pagamento preservando hora
        const dataPagamentoNormalizada = paymentDate 
          ? PaymentCommonService.normalizePaymentDate(paymentDate)
          : new Date();
        
        const valorPago = typeof payment.value === 'number' ? Number(payment.value) : 
                          typeof payment.netValue === 'number' ? Number(payment.netValue) : 
                          titulo.valor;
        
        // Usar método marcarComoPago para garantir lógica consistente
        // skipLiquidacaoBanco = true pois o webhook já indica que o banco sabe do pagamento
        await titulo.marcarComoPago(valorPago, dataPagamentoNormalizada || undefined, true);
        
        // Não adicionar data_pagamento e valor_pago ao updates, pois já foi salvo pelo marcarComoPago
        // Apenas atualizar status se necessário
        delete updates.data_pagamento;
        delete updates.valor_pago;
      }

      if (typeof payment.nossoNumero === 'string') {
        updates.nosso_numero = payment.nossoNumero;
      }

      if (typeof payment.bankSlipUrl === 'string') {
        updates.url_boleto = payment.bankSlipUrl;
      }

      if (typeof payment.bankSlipDigitableLine === 'string') {
        updates.linha_digitavel = BarcodeService.formatarLinhaDigitavel(payment.bankSlipDigitableLine);
      }

      if (typeof payment.bankSlipBarcode === 'string') {
        const codigoLimpo = payment.bankSlipBarcode.replace(/\D/g, '');
        updates.codigo_barras = codigoLimpo.length > 0 ? codigoLimpo : payment.bankSlipBarcode;
      }

      if (typeof payment.pixQrCode === 'string') {
        updates.qrcode = payment.pixQrCode;
      }

      if (typeof payment.pixQrCodeImage === 'string') {
        const imagem = payment.pixQrCodeImage;
        updates.qrcode_image = imagem.startsWith('data:image/')
          ? imagem
          : `data:image/png;base64,${imagem}`;
      } else if (typeof payment.pixQrCodeUrl === 'string') {
        updates.qrcode_image = payment.pixQrCodeUrl;
      }

      if (typeof payment.dueDate === 'string') {
        const normalizedDate = PaymentCommonService.normalizeDueDate(payment.dueDate);
        if (normalizedDate) {
          updates.data_vencimento = normalizedDate;
        }
      }

      if (Object.keys(updates).length > 0) {
        await titulo.update(updates);
      }

      logger.info('Título atualizado via webhook Asaas', {
        titulo_id: titulo.id,
        charge_id: payment.id,
        status: novoStatus
      });

      return {
        success: true,
        message: 'Título atualizado via webhook Asaas'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar webhook Asaas', {
        payment_id: payment?.id,
        titulo_id: titulo?.id,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Busca e valida token do webhook do Asaas
   * @param titulo Título relacionado (opcional)
   * @param receivedSecret Secret recebido no webhook
   * @returns Token esperado ou undefined se não encontrado
   */
  static async findExpectedToken(
    titulo: (Titulo & { banco?: Banco | null }) | null,
    receivedSecret?: string
  ): Promise<string | undefined> {
    // Se temos título com banco Asaas, usar token dele
    if (titulo?.banco?.tipo_banco === 'asaas') {
      const token = PaymentCommonService.getWebhookToken(titulo.banco);
      if (token) {
        return token;
      }
    }

    // Buscar em todos os bancos Asaas ativos
    const bancosAsaas = await Banco.findAll({
      where: { tipo_banco: 'asaas', ativo: true }
    });

    for (const banco of bancosAsaas) {
      const token = PaymentCommonService.getWebhookToken(banco);
      if (token && (!receivedSecret || receivedSecret === token)) {
        return token;
      }
    }

    return undefined;
  }

  /**
   * Mapeia status do Asaas para status interno
   */
  static mapAsaasStatus(asaasStatus: string): Titulo['status'] | undefined {
    const statusMap: Record<string, Titulo['status']> = {
      PENDING: 'pendente',
      AWAITING_APPROVAL: 'pendente',
      RECEIVED: 'pago',
      RECEIVED_IN_CASH: 'pago',
      CONFIRMED: 'pago',
      OVERDUE: 'vencido',
      PAYMENT_DELETED: 'cancelado',
      DELETED: 'cancelado',
      CANCELED: 'cancelado',
      REFUNDED: 'cancelado',
      CHARGEBACK: 'cancelado'
    };

    return statusMap[asaasStatus];
  }
}

