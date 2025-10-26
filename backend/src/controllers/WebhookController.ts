import { Request, Response } from 'express';
import { Banco } from '../models/Banco';
import { BancoApiService } from '../services/BancoApiService';
import { logger } from '../utils/logger';

export class WebhookController {
  /**
   * Webhook unificado para receber notificações da Efí sobre todos os tipos de operações
   * (PIX, Bolix, carnês, boletos individuais, etc.)
   */
  static async efiWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;
      
      // Verificar se é um token de notificação (form-urlencoded)
      if (req.get('Content-Type') === 'application/x-www-form-urlencoded' && 
          payload.notification && 
          typeof payload.notification === 'string' && 
          !Array.isArray(payload.notification)) {
        
        const notificationToken = payload.notification;
        logger.info(`Token de notificação recebido: ${notificationToken}`);
        
        // Processar token de notificação - consultar API do EFI
        const result = await WebhookController.processarTokenNotificacao(notificationToken);
        res.status(result.status || 200).json(result);
        return;
      }
      
      // Verificar se é uma notificação válida da Efí
      if (!payload.notification && !payload.charge && !payload.pix) {
        logger.warn('Payload não contém campos esperados da Efí');
        res.status(400).json({
          success: false,
          message: 'Payload inválido'
        });
        return;
      }

      // Determinar tipo de notificação
      let notificationType = '';
      let notification = null;

      if (payload.notification) {
        notification = payload.notification;
        notificationType = notification.type || '';
      } else if (payload.charge) {
        notification = payload.charge;
        notificationType = 'charge_' + (notification.status || 'unknown');
      } else if (payload.pix) {
        notification = payload.pix;
        notificationType = 'pix_' + (notification.status || 'unknown');
      }

      logger.info(`Tipo de notificação identificado: ${notificationType}`);

      // Processar diferentes tipos de notificação
      switch (notificationType) {
        case 'charge_paid':
        case 'charge_settled':
        case 'charge_canceled':
        case 'charge_expired':
        case 'charge_waiting':
        case 'charge_pending':
          const chargeResult = await WebhookController.processarNotificacaoCharge(notification);
          res.status(chargeResult.status || 200).json(chargeResult);
          break;
        
        
        case 'pix_paid':
        case 'pix_settled':
        case 'pix_canceled':
        case 'pix_expired':
        case 'pix_waiting':
        case 'pix_pending':
          const pixResult = await WebhookController.processarNotificacaoPix(notification);
          res.status(pixResult.status || 200).json(pixResult);
          break;
        
        // Processar notificações genéricas
        case 'payment':
        case 'paid':
        case 'settled':
        case 'canceled':
        case 'expired':
          logger.info(`Processando notificação genérica: ${notificationType}`);
          const genericResult = await WebhookController.processarNotificacaoGenerica(notification);
          res.status(genericResult.status || 200).json(genericResult);
          break;
        
        default:
          logger.warn(`Tipo de notificação não reconhecido: ${notificationType}`);
          logger.warn('Payload completo:', JSON.stringify(payload, null, 2));
          res.status(200).json({ message: 'Tipo de notificação não processado' });
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao processar webhook Efí unificado', {
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Processar token de notificação
   */
  private static async processarTokenNotificacao(notificationToken: string): Promise<any> {
    try {
      logger.info(`Iniciando processamento de token de notificação: ${notificationToken}`);
      
      // Buscar bancos ativos para processar notificação
      const bancosAtivos = await Banco.findAll({
        where: { 
          tipo_banco: 'efi',
          ativo: true
        },
        order: [['created_at', 'DESC']]
      });

      // Tentar cada banco ativo para encontrar o token correto
      for (const banco of bancosAtivos) {
        logger.info(`Tentando consultar token no banco ${banco.id}`, {
          banco_id: banco.id,
          banco_nome: banco.nome,
          sandbox: banco.sandbox
        });
        
        const resultado = await BancoApiService.consultarNotificacaoPorToken(banco, notificationToken);
        
        if (resultado.success) {
          logger.info('Token encontrado no banco correto!', {
            banco_id: banco.id,
            data_count: resultado.data?.data?.length || 0
          });
          
          return await WebhookController.processarDadosNotificacao(resultado.data, banco);
        }
      }
      
      // Fallback: Buscar todos os bancos EFI ativos
      const bancosEfi = await Banco.findAll({
        where: { tipo_banco: 'efi', ativo: true }
      });
      
      if (bancosEfi.length === 0) {
        logger.error('Nenhum banco EFI ativo encontrado para processar notificação');
        return {
          success: false,
          message: 'Nenhum banco EFI ativo encontrado',
          status: 400
        };
      }
      
      // Tentar consultar a notificação em cada banco EFI
      for (const banco of bancosEfi) {
        logger.info(`Consultando notificação no banco EFI: ${banco.id}`);
        
        const resultado = await BancoApiService.consultarNotificacaoPorToken(banco, notificationToken);
        
        if (resultado.success) {
          logger.info('Notificação consultada com sucesso', {
            banco_id: banco.id,
            data: resultado.data
          });
          
          // Processar os dados da notificação
          return await WebhookController.processarDadosNotificacao(resultado.data, banco);
        } else {
          // Se o token não foi encontrado, expirou ou não existe, não tentar outros bancos
          if (resultado.message?.includes('não encontrado') || 
              resultado.message?.includes('expirado') ||
              resultado.message?.includes('property_does_not_exists')) {
            logger.warn('Token de notificação inválido - parando tentativas', {
              banco_id: banco.id,
              token: notificationToken,
              message: resultado.message
            });
            break; // Não tentar outros bancos se o token é inválido
          }
          
          logger.warn(`Falha ao consultar notificação no banco ${banco.id}`, {
            message: resultado.message
          });
        }
      }
      
      logger.warn('Webhook: Token de notificação não processado (normal para tokens expirados)');
      return {
        success: false,
        message: 'Não foi possível consultar a notificação',
        status: 400 // Retornar 400 como no PHP
      };
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar token de notificação', {
        token: notificationToken,
        error: errorMessage
      });
      return {
        success: false,
        message: 'Erro ao processar token de notificação',
        status: 500
      };
    }
  }

  /**
   * Processar dados da notificação
   */
  private static async processarDadosNotificacao(dados: any, banco: Banco): Promise<any> {
    try {
      logger.info('Processando dados da notificação', {
        banco_id: banco.id,
        dados
      });

      // Nova estrutura da EFI: array de notificações
      if (dados.code && dados.data && Array.isArray(dados.data)) {
        logger.info('Processando notificações em lote', {
          count: dados.data.length
        });
        
        let processadas = 0;
        for (const notificacao of dados.data) {
          if (notificacao.type && notificacao.identifiers) {
            processadas += await WebhookController.processarNotificacaoIndividual(notificacao, banco);
          }
        }
        
        return {
          success: true,
          message: `${processadas} notificações processadas`,
          data: { total_processadas: processadas }
        };
      }

      // Verificar se é uma notificação de charge (boleto individual) - estrutura antiga
      if (dados.charge) {
        const charge = dados.charge;
        const chargeId = charge.charge_id || null;
        const status = charge.status || 'unknown';
        
        if (chargeId) {
          logger.info('Processando notificação de charge', {
            charge_id: chargeId,
            status
          });
          
          // Buscar título pelo charge_id
          const { Titulo } = await import('../models/Titulo');
          const titulo = await Titulo.findOne({
            where: { charge_id: chargeId }
          });
          
          if (titulo) {
            const statusLocal = WebhookController.mapearStatusEfi(status) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
            const oldStatus = titulo.status;
            const oldPago = titulo.pago;
            
            await titulo.update({
              status: statusLocal,
              pago: ['pago', 'liquidado'].includes(statusLocal)
            });
            
            logger.info('Título atualizado via webhook', {
              titulo_id: titulo.id,
              charge_id: chargeId,
              status_anterior: oldStatus,
              status_novo: statusLocal,
              pago_anterior: oldPago,
              pago_novo: titulo.pago
            });
            
            return {
              success: true,
              message: 'Título atualizado com sucesso',
              data: { titulo_id: titulo.id }
            };
          } else {
            logger.warn('Título não encontrado para charge', { charge_id: chargeId });
            return {
              success: false,
              message: 'Título não encontrado',
              status: 404
            };
          }
        }
      }


      // Verificar se é uma notificação individual ou múltipla (estrutura direta)
      if (Array.isArray(dados)) {
        // Notificação múltipla
        let totalProcessadas = 0;
        for (const notificacao of dados) {
          const processadas = await WebhookController.processarNotificacaoIndividual(notificacao, banco);
          totalProcessadas += processadas;
        }
        
        return {
          success: true,
          message: `${totalProcessadas} notificações processadas`,
          data: { total_processadas: totalProcessadas }
        };
      } else {
        // Notificação individual
        const processadas = await WebhookController.processarNotificacaoIndividual(dados, banco);
        
        return {
          success: true,
          message: 'Notificação processada',
          data: { processadas }
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar dados da notificação', {
        banco_id: banco.id,
        error: errorMessage
      });
      return {
        success: false,
        message: 'Erro ao processar dados da notificação',
        status: 500
      };
    }
  }

  /**
   * Processar notificação individual
   */
  private static async processarNotificacaoIndividual(notificacao: any, _banco: Banco): Promise<number> {
    try {
      const type = notificacao.type || '';
      const identifiers = notificacao.identifiers || {};
      const status = notificacao.status?.current || null;
      const customId = notificacao.custom_id || null;
      
      logger.info('Processando notificação individual', {
        type,
        custom_id: customId,
        status,
        identifiers
      });
      
      switch (type) {
        case 'charge':
          return await WebhookController.processarNotificacaoTitulo(identifiers, status, customId, notificacao);
          
        default:
          logger.warn('Tipo de notificação não suportado', { type });
          return 0;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação individual', {
        notificacao,
        error: errorMessage
      });
      return 0;
    }
  }

  /**
   * Processar notificação de título (charge)
   */
  private static async processarNotificacaoTitulo(identifiers: any, status: string, customId: string, dadosCompletos?: any): Promise<number> {
    const chargeId = identifiers.charge_id || null;
    
    if (!chargeId) {
      logger.warn('Charge ID não encontrado na notificação de título');
      return 0;
    }

    try {
      // Buscar título pelo charge_id
      const { Titulo } = await import('../models/Titulo');
      const { Banco } = await import('../models/Banco');
      const titulo = await Titulo.findOne({
        where: { charge_id: chargeId },
        include: [
          {
            model: Banco,
            as: 'banco',
            attributes: ['id', 'nome', 'tipo_banco', 'codigo']
          }
        ]
      });

      if (!titulo) {
        logger.warn('Título não encontrado', { charge_id: chargeId });
        return 0;
      }

      // Atualizar status do título
      const novoStatus = WebhookController.mapearStatusEfi(status) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
      const isPago = ['pago', 'liquidado'].includes(novoStatus);
      
      const updateData: any = { 
        status: novoStatus,
        pago: isPago
      };

      // Consultar dados atualizados da EFI para obter código de barras, linha digitável, PIX, etc.
      try {
        const dadosAtualizados = await WebhookController.consultarDadosAtualizadosTitulo(titulo);
        if (dadosAtualizados.success && dadosAtualizados.data) {
          const dados = dadosAtualizados.data;
          
          // Atualizar dados específicos se disponíveis (usar dados reais da EFI)
          if (dados.codigo_barras) updateData.codigo_barras = dados.codigo_barras;
          if (dados.linha_digitavel) updateData.linha_digitavel = dados.linha_digitavel;
          if (dados.url_boleto) updateData.url_boleto = dados.url_boleto;
          if (dados.qrcode) updateData.qrcode = dados.qrcode;
          if (dados.qrcode_image) updateData.qrcode_image = dados.qrcode_image;
          
        } else {
          // Se não conseguir consultar da EFI, gerar dados válidos como fallback
          const codigoBarras = await titulo.gerarCodigoBarras();
          const linhaDigitavel = await titulo.gerarLinhaDigitavel();
          
          updateData.codigo_barras = codigoBarras;
          updateData.linha_digitavel = linhaDigitavel;
          
          logger.warn('Usando dados gerados como fallback', {
            titulo_id: titulo.id,
            charge_id: chargeId,
            codigo_barras: codigoBarras,
            linha_digitavel: linhaDigitavel,
            motivo: dadosAtualizados.message || 'Erro ao consultar EFI'
          });
        }
      } catch (error) {
        // Em caso de erro, gerar dados válidos como fallback
        try {
          const codigoBarras = await titulo.gerarCodigoBarras();
          const linhaDigitavel = await titulo.gerarLinhaDigitavel();
          
          updateData.codigo_barras = codigoBarras;
          updateData.linha_digitavel = linhaDigitavel;
          
          logger.warn('Erro ao consultar dados da EFI, usando fallback', {
            titulo_id: titulo.id,
            charge_id: chargeId,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            codigo_barras: codigoBarras,
            linha_digitavel: linhaDigitavel
          });
        } catch (fallbackError) {
          logger.error('Erro crítico ao gerar dados de fallback', {
            titulo_id: titulo.id,
            charge_id: chargeId,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            fallback_error: fallbackError instanceof Error ? fallbackError.message : 'Erro de fallback'
          });
        }
      }
      
      // Se está sendo marcada como paga via webhook, atualizar data_pagamento
      if (isPago && !titulo.pago) {
        // Usar data do webhook se disponível, senão usar data atual
        let dataPagamento = new Date().toISOString().split('T')[0]; // Default: hoje
        
        if (dadosCompletos?.created_at) {
          // Converter data do webhook (formato: "2025-09-23 23:11:17" ou "2025-09-23")
          try {
            const dataWebhook = dadosCompletos.created_at.includes(' ') 
              ? dadosCompletos.created_at.split(' ')[0] // Pegar apenas a data
              : dadosCompletos.created_at;
            
            if (/^\d{4}-\d{2}-\d{2}$/.test(dataWebhook)) {
              dataPagamento = dataWebhook;
            }
          } catch {
            // Manter data atual se houver erro na conversão
          }
        }
        
        updateData.data_pagamento = dataPagamento;
        updateData.valor_pago = titulo.valor; // Assumir valor total pago
      }
      
      // Se está sendo desmarcada como paga, limpar data_pagamento
      if (!isPago && titulo.pago) {
        updateData.data_pagamento = null;
        updateData.valor_pago = null;
      }
      
      // Atualizar data de vencimento se fornecida no webhook
      if (dadosCompletos?.expire_at) {
        const novaDataVencimento = dadosCompletos.expire_at;
        // Validar formato de data (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(novaDataVencimento)) {
          updateData.data_vencimento = novaDataVencimento;
        }
      } else if (dadosCompletos?.due_date) {
        const novaDataVencimento = dadosCompletos.due_date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(novaDataVencimento)) {
          updateData.data_vencimento = novaDataVencimento;
        }
      }
      
      await titulo.update(updateData);

      logger.info('Status do título atualizado via webhook', {
        titulo_id: titulo.id,
        charge_id: chargeId,
        status_anterior: titulo.status,
        status_novo: novoStatus,
        pago_anterior: titulo.pago,
        pago_novo: isPago,
        data_pagamento: updateData.data_pagamento || 'não alterada',
        data_vencimento: updateData.data_vencimento || 'não alterada',
        valor_pago: updateData.valor_pago || 'não alterado'
      });

      return 1;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação de título', {
        charge_id: chargeId,
        error: errorMessage
      });
      return 0;
    }
  }


  /**
   * Processar notificação de charge
   */
  private static async processarNotificacaoCharge(notification: any): Promise<any> {
    try {
      const chargeId = notification.charge_id || notification.id;
      const status = notification.status;
      const customId = notification.custom_id;

      logger.info('Processando notificação de charge', {
        charge_id: chargeId,
        status,
        custom_id: customId
      });

      if (!chargeId) {
        return {
          success: false,
          message: 'Charge ID não encontrado',
          status: 400
        };
      }

      // Buscar título pelo charge_id
      const { Titulo } = await import('../models/Titulo');
      const titulo = await Titulo.findOne({
        where: { charge_id: chargeId }
      });

      if (!titulo) {
        logger.warn('Título não encontrado para charge', { charge_id: chargeId });
        return {
          success: false,
          message: 'Título não encontrado',
          status: 404
        };
      }

      // Atualizar status do título
      const novoStatus = WebhookController.mapearStatusEfi(status) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
      await titulo.update({ status: novoStatus });

      logger.info('Status do título atualizado via charge', {
        titulo_id: titulo.id,
        charge_id: chargeId,
        status_anterior: titulo.status,
        status_novo: novoStatus
      });

      return {
        success: true,
        message: 'Status do título atualizado',
        data: {
          titulo_id: titulo.id,
          status: novoStatus
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação de charge', {
        notification,
        error: errorMessage
      });
      return {
        success: false,
        message: 'Erro ao processar notificação de charge',
        status: 500
      };
    }
  }


  /**
   * Processar notificação de PIX
   */
  private static async processarNotificacaoPix(notification: any): Promise<any> {
    try {
      logger.info('Processando notificação de PIX', { notification });

      // Implementar lógica específica para PIX se necessário
      // Por enquanto, tratar como notificação genérica
      return await WebhookController.processarNotificacaoGenerica(notification);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação de PIX', {
        notification,
        error: errorMessage
      });
      return {
        success: false,
        message: 'Erro ao processar notificação de PIX',
        status: 500
      };
    }
  }

  /**
   * Processar notificação genérica
   */
  private static async processarNotificacaoGenerica(notification: any): Promise<any> {
    try {
      logger.info('Processando notificação genérica', { notification });

      // Tentar identificar o tipo de notificação pelos campos disponíveis
      const chargeId = notification.charge_id || notification.id;
      const customId = notification.custom_id;

      if (chargeId) {
        return await WebhookController.processarNotificacaoCharge(notification);
      } else if (customId) {
        // Tentar buscar por custom_id
        const { Titulo } = await import('../models/Titulo');
        const titulo = await Titulo.findByPk(customId);
        if (titulo) {
          const novoStatus = WebhookController.mapearStatusEfi(notification.status) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
          await titulo.update({ status: novoStatus });
          
          return {
            success: true,
            message: 'Status atualizado via custom_id',
            data: {
              titulo_id: titulo.id,
              status: novoStatus
            }
          };
        }
      }

      logger.warn('Não foi possível processar notificação genérica', { notification });
      return {
        success: false,
        message: 'Não foi possível processar notificação genérica',
        status: 400
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar notificação genérica', {
        notification,
        error: errorMessage
      });
      return {
        success: false,
        message: 'Erro ao processar notificação genérica',
        status: 500
      };
    }
  }

  /**
   * Consultar dados atualizados do título na EFI
   */
  private static async consultarDadosAtualizadosTitulo(titulo: any): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      if (!titulo.charge_id) {
        return { success: false, message: 'Charge ID não disponível' };
      }

      // Acessar o banco do título (já incluído no findOne)
      const banco = titulo.banco;
      
      if (!banco || banco.tipo_banco !== 'efi') {
        return { success: false, message: 'Banco EFI não encontrado' };
      }

      // Usar o BancoApiService para consultar dados atualizados
      const resultado = await BancoApiService.consultarStatus(titulo);
      
      if (resultado.success && resultado.data) {
        const dados = resultado.data;
        
        
        // Extrair dados específicos baseado na estrutura real da EFI
        const dadosAtualizados: any = {};
        
        // Código de barras (linha digitável) - está em payment.banking_billet.barcode
        if (dados.payment?.banking_billet?.barcode) {
          dadosAtualizados.linha_digitavel = dados.payment.banking_billet.barcode;
        }
        
        // URL do boleto - está em payment.banking_billet.url
        if (dados.payment?.banking_billet?.url) {
          dadosAtualizados.url_boleto = dados.payment.banking_billet.url;
        }
        
        // PDF do boleto - está em payment.banking_billet.pdf.charge
        if (dados.payment?.banking_billet?.pdf?.charge) {
          dadosAtualizados.pdf_url = dados.payment.banking_billet.pdf.charge;
        }
        
        // Para títulos, usar dados da EFI (reais ou zeros)
        if (dados.payment?.banking_billet?.barcode) {
          // Usar linha digitável da EFI (pode ser real ou zeros)
          dadosAtualizados.linha_digitavel = dados.payment.banking_billet.barcode;
          // Converter linha digitável para código de barras (remover pontos e espaços)
          dadosAtualizados.codigo_barras = dados.payment.banking_billet.barcode.replace(/[.\s]/g, '');
        }
        
        // Para títulos, verificar se há dados PIX disponíveis
        // Nota: No sandbox da EFI, dados PIX podem não estar disponíveis para títulos
        if (dados.payment?.banking_billet?.pix) {
          logger.info('Dados PIX encontrados em payment.banking_billet.pix', {
            titulo_id: titulo.id,
            charge_id: titulo.charge_id,
            pix_data: dados.payment.banking_billet.pix
          });
          
          if (dados.payment.banking_billet.pix.qrcode) {
            dadosAtualizados.qrcode = dados.payment.banking_billet.pix.qrcode;
          }
          if (dados.payment.banking_billet.pix.qrcode_image) {
            dadosAtualizados.qrcode_image = dados.payment.banking_billet.pix.qrcode_image;
          }
        } else {
          logger.info('Dados PIX não disponíveis para título (normal no sandbox)', {
            titulo_id: titulo.id,
            charge_id: titulo.charge_id,
            tem_payment_banking_billet: !!dados.payment?.banking_billet,
            chaves_banking_billet: dados.payment?.banking_billet ? Object.keys(dados.payment.banking_billet) : []
          });
        }
        
        
        return { 
          success: true, 
          data: dadosAtualizados 
        };
      }
      
      return { 
        success: false, 
        message: resultado.message || 'Erro ao consultar dados' 
      };
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao consultar dados atualizados do título', {
        titulo_id: titulo.id,
        charge_id: titulo.charge_id,
        error: errorMessage
      });
      
      return { 
        success: false, 
        message: 'Erro interno ao consultar dados' 
      };
    }
  }

  /**
   * Mapear status da Efí para status interno
   */
  private static mapearStatusEfi(statusEfi: string): string {
    const statusMap: Record<string, string> = {
      'paid': 'pago',
      'settled': 'pago',
      'canceled': 'cancelado',
      'expired': 'vencido',
      'waiting': 'pendente',
      'pending': 'pendente',
      'active': 'ativo',
      'inactive': 'inativo'
    };

    return statusMap[statusEfi?.toLowerCase()] || 'pendente';
  }
}
