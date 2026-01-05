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
        status: novoStatus,
        final_titulo_status: titulo.status,
        final_titulo_pago: titulo.pago
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
    titulo: (Titulo & { banco?: Banco | null }) | null
  ): Promise<string | undefined> {
    // Se temos título com banco Asaas, usar token dele
    if (titulo?.banco?.tipo_banco === 'asaas') {
      const token = PaymentCommonService.getWebhookToken(titulo.banco);
      if (token) {
        return token;
      }
    }

    // Buscar em todos os bancos Asaas ativos e retornar o primeiro token encontrado
    const bancosAsaas = await Banco.findAll({
      where: { tipo_banco: 'asaas', ativo: true }
    });

    for (const banco of bancosAsaas) {
      const token = PaymentCommonService.getWebhookToken(banco);
      if (token) {
        return token; // Retorna o primeiro token encontrado
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

  /**
   * Processa webhook de invoice (NFS-e) do Asaas
   * @param invoice Objeto invoice do payload
   */
  static async processInvoiceWebhook(
    invoice: AsaasPaymentPayload['invoice']
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Webhook invoice Asaas recebido', {
        invoice_id: invoice?.id,
        status: invoice?.status,
        validation_code: !!invoice?.validationCode,
        pdf_url: !!invoice?.pdfUrl,
        xml_url: !!invoice?.xmlUrl
      });

      if (!invoice || !invoice.id) {
        return {
          success: true,
          message: 'Webhook recebido sem invoice.id'
        };
      }

      const invoiceId = String(invoice.id);
      const invoiceNumber = invoice.number ? String(invoice.number) : null;
      const invoiceStatusOriginal = invoice.status !== undefined && invoice.status !== null
        ? String(invoice.status)
        : null;
      const invoiceStatus = invoiceStatusOriginal ? invoiceStatusOriginal.toLowerCase().trim() : null;

      logger.info('Processando invoice webhook', {
        invoice_id: invoiceId,
        status_processado: invoiceStatus,
        numero: invoiceNumber
      });

      // Mapear status do Asaas para nosso status (case-insensitive)
      const statusMap: Record<string, 'agendado' | 'emitida' | 'cancelada' | 'rejeitada' | 'erro'> = {
        'scheduled': 'agendado',
        'SCHEDULED': 'agendado',
        'authorized': 'emitida',
        'AUTHORIZED': 'emitida',
        'synchronized': 'emitida', // SYNCHRONIZED significa que foi sincronizada/emitida
        'SYNCHRONIZED': 'emitida',
        'cancelled': 'cancelada',
        'CANCELLED': 'cancelada',
        'canceled': 'cancelada', // variação sem 'l'
        'rejected': 'rejeitada',
        'REJECTED': 'rejeitada',
        'error': 'erro',
        'ERROR': 'erro',
        'failed': 'erro',
        'pending': 'agendado',
        'processing': 'agendado'
      };

      // Se não tem status, assumir que está agendado (status inicial)

      const nfseStatus = invoiceStatus && statusMap[invoiceStatus] 
        ? statusMap[invoiceStatus] 
        : (!invoiceStatus ? 'agendado' : null);

      if (!nfseStatus) {
        logger.warn('Status de NFS-e não reconhecido', {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber,
          status_original: invoiceStatusOriginal,
          status_lowercase: invoiceStatus,
          status_tipo: typeof invoice.status,
          status_map_keys: Object.keys(statusMap)
        });
        return {
          success: true,
          message: 'Status de NFS-e não reconhecido'
        };
      }

      // Buscar título através da nota fiscal vinculada
      // A nota fiscal tem titulo_id, então buscamos a nota fiscal pelo invoice_id
      // e depois buscamos o título através do titulo_id
      const { Op } = await import('sequelize');
      const { NotaFiscal } = await import('../../models/NotaFiscal');
      
      let titulo = null;
      
      // Buscar nota fiscal pelo asaas_invoice_id ou pelo número
      let notaFiscal = null;
      
      if (invoiceNumber) {
        notaFiscal = await NotaFiscal.findOne({
          where: { 
            numero: invoiceNumber,
            titulo_id: { [Op.ne]: null }
          },
          order: [['created_at', 'DESC']]
        });
      }
      
      if (!notaFiscal) {
        notaFiscal = await NotaFiscal.findOne({
          where: { 
            asaas_invoice_id: invoiceId,
            titulo_id: { [Op.ne]: null }
          },
          order: [['created_at', 'DESC']] // Buscar a mais recente
        });
      }
      
      if (notaFiscal && notaFiscal.titulo_id) {
        titulo = await Titulo.findByPk(notaFiscal.titulo_id);
      }

      if (!titulo) {
        logger.warn('Título não encontrado para NFS-e', {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber
        });
        return {
          success: true,
          message: 'Título não encontrado para esta NFS-e'
        };
      }

      // Buscar nota fiscal vinculada para atualizar status
      const notaFiscalVinculada = await NotaFiscal.findOne({
        where: { titulo_id: titulo.id },
        order: [['created_at', 'DESC']]
      });

        // Atualizar nota fiscal (status, número, série, chave de acesso, PDF e XML)
        if (notaFiscalVinculada) {
          const pdfUrl = invoice.pdfUrl || invoice.invoiceUrl || invoice.url || null;
          const xmlUrl = invoice.xmlUrl || null;
          const rpsSerie = invoice.rpsSerie || null;
          const chaveAcesso = invoice.validationCode || notaFiscalVinculada.chave_acesso;

          let pdfData = null;
          let xmlData = null;

          // Baixar PDF se URL estiver disponível
          if (pdfUrl && !notaFiscalVinculada.pdf_base64) {
            try {
              const axios = await import('axios');
              const response = await axios.default.get(pdfUrl, { responseType: 'arraybuffer' });
              pdfData = Buffer.from(response.data).toString('base64');
              logger.info('PDF baixado e convertido para base64', { invoice_id: invoiceId });
            } catch (error) {
              logger.warn('Erro ao baixar PDF', { invoice_id: invoiceId, error: error instanceof Error ? error.message : String(error) });
            }
          }

          // Baixar XML se URL estiver disponível
          if (xmlUrl && !notaFiscalVinculada.xml) {
            try {
              const axios = await import('axios');
              const response = await axios.default.get(xmlUrl, { responseType: 'text' });
              xmlData = response.data;
              logger.info('XML baixado', { invoice_id: invoiceId });
            } catch (error) {
              logger.warn('Erro ao baixar XML', { invoice_id: invoiceId, error: error instanceof Error ? error.message : String(error) });
            }
          }

          await notaFiscalVinculada.update({
            nfse_status: nfseStatus,
            numero: invoiceNumber || invoice.number || notaFiscalVinculada.numero,
            serie: rpsSerie || notaFiscalVinculada.serie,
            chave_acesso: chaveAcesso,
            pdf_url: pdfUrl || notaFiscalVinculada.pdf_url,
            pdf_base64: pdfData || notaFiscalVinculada.pdf_base64,
            xml: xmlData || notaFiscalVinculada.xml
          });

          logger.info('Nota fiscal atualizada via webhook', {
            nota_fiscal_id: notaFiscalVinculada.id,
            invoice_id: invoiceId,
            status: nfseStatus,
            chave_acesso: !!chaveAcesso,
            pdf_baixado: !!pdfData,
            xml_baixado: !!xmlData
          });
        }

      return {
        success: true,
        message: 'NFS-e atualizada via webhook Asaas'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar webhook de invoice Asaas', {
        invoice_id: invoice?.id,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}

