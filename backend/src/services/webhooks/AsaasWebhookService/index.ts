import { Request } from 'express';
import { Banco } from '../../../models/cadastros/Banco';
import { Titulo } from '../../../models/financeiro/Titulo';
import { BarcodeService } from '../../bancos/BarcodeService';
import { PaymentCommonService } from '../PaymentCommonService';
import { logger } from '../../../utils/logger';
import { JsonValue } from '../../../types/index';
import { AsaasPaymentPayload } from '../../../types/webhooks';
import { registrarAtualizacaoElasticsearch } from '../../elasticsearch/ElasticsearchAuditService';

/**
 * Serviço para processamento de webhooks do Asaas
 */
export class AsaasWebhookService {
  /**
   * Processa webhook do Asaas
   * @param payment Objeto payment do payload
   * @param req Objeto Request para auditoria
   * @returns WebhookResponse com resultado do processamento
   */
  static async processWebhook(
    payment: AsaasPaymentPayload['payment'],
    req?: Request,
    rootPayload?: Pick<AsaasPaymentPayload, 'dateCreated'>
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!payment || !payment.id) {
        return {
          success: true,
          message: 'Webhook recebido sem payment.id'
        };
      }

      // Buscar título pelo charge_id (responsabilidade do service)
      const chargeId = String(payment.id);
      const titulo = await Titulo.findOne({
        where: { charge_id: chargeId },
        include: [{ model: Banco, as: 'banco' }]
      }) as (Titulo & { banco?: Banco | null }) | null;

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

      // Verificar se o payment tem campo deleted (pode vir como propriedade dinâmica)
      const paymentDeleted = (payment as any).deleted === true;

      // Se o payment está marcado como deleted, tratar como cancelado
      let novoStatus: Titulo['status'] | null | undefined = null;
      if (paymentDeleted) {
        novoStatus = 'cancelado';
      } else {
        novoStatus = AsaasWebhookService.mapAsaasStatus(paymentStatus);
      }

      if (novoStatus) {
        // Não atualizar status se o título já está cancelado
        // Isso evita que webhooks antigos ou duplicados sobrescrevam o cancelamento
        if (titulo.status !== 'cancelado' && novoStatus !== titulo.status && novoStatus) {
          // Só atualizar se o status for diferente do atual e não for undefined
          updates.status = novoStatus as Titulo['status'];
        }
      }

      // Usar apenas dateCreated da raiz do payload (evento) - representa quando o pagamento foi recebido.
      // payment.dateCreated = data de criação da cobrança (errada para data de pagamento)
      const paymentDate = typeof rootPayload?.dateCreated === 'string'
        ? rootPayload.dateCreated
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

      // Capturar dados anteriores antes de atualizar
      const dadosAnteriores = titulo.toJSON() as Record<string, unknown>;
      
      // Garantir que status não seja alterado se título está cancelado
      if (titulo.status === 'cancelado' && updates.status) {
        delete updates.status;
      }
      
      if (Object.keys(updates).length > 0) {
        await titulo.update(updates);
      }
      
      // Recarregar título para obter dados atualizados
      await titulo.reload();
      
      // Capturar dados novos após atualização
      const dadosNovos = titulo.toJSON() as Record<string, unknown>;
      
      // Registrar auditoria no Elasticsearch se req foi fornecido
      if (req) {
        try {
          await registrarAtualizacaoElasticsearch(
            req,
            'Titulo',
            titulo.id,
            dadosAnteriores,
            dadosNovos,
            `Atualização via webhook Asaas - Status: ${paymentStatus}`
          );
        } catch (auditError) {
          // Não bloquear processamento se auditoria falhar
          logger.warn('Erro ao registrar auditoria de webhook Asaas', {
            titulo_id: titulo.id,
            error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
          });
        }
      }

      return {
        success: true,
        message: 'Título atualizado via webhook Asaas'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar webhook Asaas', {
        payment_id: payment?.id,
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
   * @param event Tipo de evento do webhook (opcional)
   * @param req Objeto Request para auditoria
   */
  static async processInvoiceWebhook(
    invoice: AsaasPaymentPayload['invoice'],
    event?: string,
    req?: Request
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info(`Webhook Asaas: ${invoice?.id}${event ? ` - Evento: ${event}` : ''}`);

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

      logger.info(`Processando: ${invoiceId}${event ? ` (${event})` : ''}`);

      // Se está processando cancelamento, não atualizar status ainda (aguardar cancelamento completo)
      if (event === 'INVOICE_PROCESSING_CANCELLATION' || invoiceStatus === 'processing_cancellation') {
        logger.info('Cancelamento em processamento, aguardando confirmação', {
          invoice_id: invoiceId,
          event: event
        });
        return {
          success: true,
          message: 'Cancelamento em processamento, aguardando confirmação'
        };
      }

      // Mapear status do Asaas para nosso status (case-insensitive)
      const statusMap: Record<string, 'agendado' | 'emitida' | 'cancelada' | 'rejeitada' | 'erro'> = {
        'scheduled': 'agendado',
        'SCHEDULED': 'agendado',
        'authorized': 'emitida',
        'AUTHORIZED': 'emitida',
        'synchronized': 'emitida',
        'SYNCHRONIZED': 'emitida',
        'cancelled': 'cancelada',
        'CANCELLED': 'cancelada',
        'canceled': 'cancelada',
        'rejected': 'rejeitada',
        'REJECTED': 'rejeitada',
        'error': 'erro',
        'ERROR': 'erro',
        'failed': 'erro',
        'pending': 'agendado',
        'processing': 'agendado'
      };

      // Mapear evento para status quando o status do invoice não estiver disponível
      const eventStatusMap: Record<string, 'agendado' | 'emitida' | 'cancelada' | 'rejeitada' | 'erro'> = {
        'INVOICE_CREATED': 'agendado',
        'INVOICE_AUTHORIZED': 'emitida',
        'INVOICE_SYNCHRONIZED': 'emitida',
        'INVOICE_CANCELED': 'cancelada'
      };

      // Determinar nfseStatus: priorizar invoice.status, depois evento
      let nfseStatus: 'agendado' | 'emitida' | 'cancelada' | 'rejeitada' | 'erro' | null = null;
      
      if (invoiceStatus && statusMap[invoiceStatus]) {
        nfseStatus = statusMap[invoiceStatus];
      } else if (event && eventStatusMap[event]) {
        nfseStatus = eventStatusMap[event];
      } else if (!invoiceStatus) {
        nfseStatus = 'agendado'; // Status inicial padrão
      }

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

      // Buscar nota fiscal diretamente pelo asaas_invoice_id (identificador único do Asaas)
      const { Op } = await import('sequelize');
      const { NotaFiscal } = await import('../../../models/nfse/NotaFiscal');
      
      // Priorizar busca pelo asaas_invoice_id (identificador único)
      let notaFiscalVinculada = await NotaFiscal.findOne({
        where: { 
          asaas_invoice_id: invoiceId
        }
      });
      
      // Se não encontrou pelo asaas_invoice_id, tentar pelo número (caso o asaas_invoice_id não tenha sido salvo)
      if (!notaFiscalVinculada && invoiceNumber) {
        notaFiscalVinculada = await NotaFiscal.findOne({
          where: { 
            numero: invoiceNumber
          },
          order: [['created_at', 'DESC']]
        });
      }

      if (!notaFiscalVinculada) {
        logger.warn('Nota fiscal não encontrada para webhook', {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber
        });
        return {
          success: true,
          message: 'Nota fiscal não encontrada para este invoice'
        };
      }

      // Atualizar nota fiscal
      if (notaFiscalVinculada) {
          try {
            const pdfUrl = invoice.pdfUrl || invoice.invoiceUrl || invoice.url;
            const xmlUrl = invoice.xmlUrl;
            const chaveAcesso = invoice.validationCode || notaFiscalVinculada.chave_acesso;

            logger.info(`Atualizando NF ${notaFiscalVinculada.id} - Chave: ${chaveAcesso ? 'SIM' : 'NAO'}`);

            // Baixar arquivos se necessário
            let pdfData = null;
            let xmlData = null;

            const axios = await import('axios');

            if (pdfUrl && !notaFiscalVinculada.pdf_base64) {
              try {
                const response = await axios.default.get(pdfUrl, { responseType: 'arraybuffer' });
                pdfData = Buffer.from(response.data).toString('base64');
              } catch (error) {
                logger.warn(`Erro ao baixar PDF: ${error instanceof Error ? error.message : String(error)}`);
              }
            }

            if (xmlUrl && !notaFiscalVinculada.xml) {
              try {
                const response = await axios.default.get(xmlUrl, { responseType: 'text' });
                xmlData = response.data;

                // Parsear XML e extrair dados automaticamente
                if (xmlData) {
                  const { NFSeXmlParserService } = await import('../../nfse/NFSeXmlParserService');
                  await NFSeXmlParserService.atualizarNotaFiscalComXml(notaFiscalVinculada.id, xmlData);
                }
              } catch (error) {
                logger.warn(`Erro ao baixar XML: ${error instanceof Error ? error.message : String(error)}`);
              }
            }

            // Preparar dados para atualização
            const updateData: any = {};
            
            // Sempre atualizar nfse_status
            updateData.nfse_status = nfseStatus;
            
            // Atualizar número se fornecido
            const novoNumero = invoiceNumber || invoice.number;
            if (novoNumero) {
              updateData.numero = novoNumero;
            }
            
            // Atualizar série se fornecido
            if (invoice.rpsSerie) {
              updateData.serie = invoice.rpsSerie;
            }
            
            // Atualizar chave de acesso se fornecido
            if (chaveAcesso) {
              updateData.chave_acesso = chaveAcesso;
            }
            
            // Atualizar PDF URL se fornecido
            if (pdfUrl) {
              updateData.pdf_url = pdfUrl;
            }
            
            // Atualizar PDF base64 se baixado
            if (pdfData) {
              updateData.pdf_base64 = pdfData;
            }
            
            // Atualizar XML se baixado
            if (xmlData) {
              updateData.xml = xmlData;
            }

            // Atualizar status principal conforme nfse_status
            if (nfseStatus === 'emitida') {
              updateData.status = 'AUTORIZADA';
            } else if (nfseStatus === 'cancelada') {
              updateData.status = 'CANCELADA';
            } else if (nfseStatus === 'rejeitada') {
              updateData.status = 'REJEITADA';
            } else if (nfseStatus === 'erro') {
              updateData.status = 'ERRO';
            }

            // Capturar dados anteriores antes de atualizar
            let dadosAnteriores: Record<string, unknown> | null = null;
            try {
              dadosAnteriores = notaFiscalVinculada.toJSON() as Record<string, unknown>;
            } catch (error) {
              logger.warn('Erro ao capturar dados anteriores para auditoria', {
                nota_fiscal_id: notaFiscalVinculada.id,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
              });
            }
            
            // Atualizar nota fiscal
            if (Object.keys(updateData).length > 0) {
              notaFiscalVinculada.set(updateData);
              await notaFiscalVinculada.save({ fields: Object.keys(updateData) as any });
              await notaFiscalVinculada.reload();
            }
            
            // Capturar dados novos após atualização
            let dadosNovos: Record<string, unknown> | null = null;
            try {
              dadosNovos = notaFiscalVinculada.toJSON() as Record<string, unknown>;
            } catch (error) {
              logger.warn('Erro ao capturar dados novos para auditoria', {
                nota_fiscal_id: notaFiscalVinculada.id,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
              });
            }
            
            // Registrar auditoria no Elasticsearch se req foi fornecido
            if (req && dadosAnteriores && dadosNovos) {
              try {
                await registrarAtualizacaoElasticsearch(
                  req,
                  'NotaFiscal',
                  notaFiscalVinculada.id,
                  dadosAnteriores,
                  dadosNovos,
                  `Atualização via webhook Asaas (NFS-e) - Status: ${nfseStatus}`
                );
              } catch (auditError) {
                // Não bloquear processamento se auditoria falhar
                logger.warn('Erro ao registrar auditoria de webhook Asaas (NFS-e)', {
                  nota_fiscal_id: notaFiscalVinculada.id,
                  error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
                });
              }
            }

            logger.info(`NF ${notaFiscalVinculada.id} atualizada com sucesso`);
          } catch (updateError) {
            logger.error(`Erro ao atualizar NF: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
            throw updateError;
          }
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

