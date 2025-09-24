import { Request, Response } from 'express';
import { Banco } from '../models/Banco';
import { CarneParcela } from '../models/CarneParcela';
import { Carne } from '../models/Carne';
import { BancoApiService } from '../services/BancoApiService';
import { logger } from '../utils/logger';

export class WebhookController {
  /**
   * Webhook unificado para receber notificações da Efí sobre todos os tipos de operações
   * (PIX, Bolix, carnês, boletos individuais, etc.)
   */
  static async efiWebhook(req: Request, res: Response): Promise<void> {
      logger.info('=== WEBHOOK EFÍ UNIFICADO RECEBIDO ===');
      logger.info('Headers:', req.headers);
      logger.info('Body:', req.body);
      logger.info('Content-Type:', req.get('Content-Type'));
      
      const payload = req.body;
      logger.info('Payload decodificado:', JSON.stringify(payload, null, 2));
    
    try {
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
      if (!payload.notification && !payload.charge && !payload.carnet && !payload.pix) {
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
      } else if (payload.carnet) {
        notification = payload.carnet;
        notificationType = 'carnet_' + (notification.status || 'unknown');
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
        
        case 'carnet_paid':
        case 'carnet_settled':
        case 'carnet_canceled':
        case 'carnet_expired':
        case 'carnet_waiting':
        case 'carnet_pending':
          const carnetResult = await WebhookController.processarNotificacaoCarnet(notification);
          res.status(carnetResult.status || 200).json(carnetResult);
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

    } catch (error: any) {
      logger.error('Erro ao processar webhook Efí unificado', {
        error: error.message,
        stack: error.stack
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
      
      // Primeiro, tentar consultar usando custom_id para identificar o banco correto
      // Buscar carnês recentes que possam ter esse token
      const carnesRecentes = await Carne.findAll({
        where: { 
          status: ['ativo', 'pendente'],
          created_at: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24h
          }
        },
        include: [{ association: 'banco', where: { tipo_banco: 'efi', ativo: true } }],
        order: [['created_at', 'DESC']]
      });

      // Tentar cada carnê recente para encontrar o banco correto
      for (const carne of carnesRecentes) {
        const banco = await carne.getBanco();
        logger.info(`Tentando consultar token no banco do carnê ${carne.id}`, {
          banco_id: banco.id,
          banco_nome: banco.nome,
          sandbox: banco.sandbox
        });
        
        const resultado = await BancoApiService.consultarNotificacaoPorToken(banco, notificationToken);
        
        if (resultado.success) {
          logger.info('Token encontrado no banco correto!', {
            banco_id: banco.id,
            carne_id: carne.id,
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
      
    } catch (error: any) {
      logger.error('Erro ao processar token de notificação', {
        token: notificationToken,
        error: error.message
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
          
          // Buscar parcela pelo charge_id
          const parcela = await CarneParcela.findOne({
            where: { charge_id: chargeId }
          });
          
          if (parcela) {
            const statusLocal = WebhookController.mapearStatusEfi(status) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
            const oldStatus = parcela.status;
            const oldPago = parcela.pago;
            
            await parcela.update({
              status: statusLocal,
              pago: ['pago', 'liquidado'].includes(statusLocal)
            });
            
            // Verificar e atualizar status do carnê
            const carne = await parcela.getCarne();
            await carne.verificarEAtualizarStatus();
            
            logger.info('Parcela atualizada via webhook', {
              parcela_id: parcela.id,
              charge_id: chargeId,
              status_anterior: oldStatus,
              status_novo: statusLocal,
              pago_anterior: oldPago,
              pago_novo: parcela.pago
            });
            
            return {
              success: true,
              message: 'Parcela atualizada com sucesso',
              data: { parcela_id: parcela.id }
            };
          } else {
            logger.warn('Parcela não encontrada para charge', { charge_id: chargeId });
            return {
              success: false,
              message: 'Parcela não encontrada',
              status: 404
            };
          }
        }
      }

      // Verificar se é uma notificação de carnê - estrutura antiga
      if (dados.carnet) {
        const carnet = dados.carnet;
        const carnetId = carnet.carnet_id || null;
        const status = carnet.status || 'unknown';
        
        if (carnetId) {
          logger.info('Processando notificação de carnê', {
            carnet_id: carnetId,
            status
          });
          
          // Buscar carnê pelo carnet_id
          const carne = await Carne.findOne({
            where: { carnet_id: carnetId }
          });
          
          if (carne) {
            const statusLocal = WebhookController.mapearStatusEfi(status) as 'ativo' | 'pago' | 'cancelado' | 'parcial' | 'pendente' | 'registrado';
            const oldStatus = carne.status;
            
            await carne.update({ status: statusLocal });
            
            logger.info('Carnê atualizado via webhook', {
              carne_id: carne.id,
              carnet_id: carnetId,
              status_anterior: oldStatus,
              status_novo: statusLocal
            });
            
            return {
              success: true,
              message: 'Carnê atualizado com sucesso',
              data: { carne_id: carne.id }
            };
          } else {
            logger.warn('Carnê não encontrado para carnet', { carnet_id: carnetId });
            return {
              success: false,
              message: 'Carnê não encontrado',
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
    } catch (error: any) {
      logger.error('Erro ao processar dados da notificação', {
        banco_id: banco.id,
        error: error.message
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
  private static async processarNotificacaoIndividual(notificacao: any, banco: Banco): Promise<number> {
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
        case 'carnet_charge':
          return await WebhookController.processarNotificacaoParcela(identifiers, status, customId, notificacao);
          
        case 'carnet':
          return await WebhookController.processarNotificacaoCarne(identifiers, status, customId);
          
        default:
          logger.warn('Tipo de notificação não suportado', { type });
          return 0;
      }
    } catch (error: any) {
      logger.error('Erro ao processar notificação individual', {
        notificacao,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Processar notificação de parcela (carnet_charge)
   */
  private static async processarNotificacaoParcela(identifiers: any, status: string, customId: string, dadosCompletos?: any): Promise<number> {
    const chargeId = identifiers.charge_id || null;
    
    if (!chargeId) {
      logger.warn('Charge ID não encontrado na notificação de parcela');
      return 0;
    }

    try {
      // Buscar parcela pelo charge_id
      const parcela = await CarneParcela.findOne({
        where: { charge_id: chargeId }
      });

      if (!parcela) {
        logger.warn('Parcela não encontrada', { charge_id: chargeId });
        return 0;
      }

      // Atualizar status da parcela
      const novoStatus = WebhookController.mapearStatusEfi(status) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
      const isPago = ['pago', 'liquidado'].includes(novoStatus);
      
      const updateData: any = { 
        status: novoStatus,
        pago: isPago
      };

      // Consultar dados atualizados da EFI para obter código de barras, linha digitável, PIX, etc.
      try {
        const dadosAtualizados = await WebhookController.consultarDadosAtualizadosParcela(parcela);
        if (dadosAtualizados.success && dadosAtualizados.data) {
          const dados = dadosAtualizados.data;
          
          // Atualizar dados específicos se disponíveis
          if (dados.codigo_barras) updateData.codigo_barras = dados.codigo_barras;
          if (dados.linha_digitavel) updateData.linha_digitavel = dados.linha_digitavel;
          if (dados.url_boleto) updateData.url_boleto = dados.url_boleto;
          if (dados.qrcode) updateData.qrcode = dados.qrcode;
          if (dados.qrcode_image) updateData.qrcode_image = dados.qrcode_image;
          
          logger.info('Dados atualizados da parcela obtidos da EFI', {
            parcela_id: parcela.id,
            charge_id: chargeId,
            dados_atualizados: {
              codigo_barras: !!dados.codigo_barras,
              linha_digitavel: !!dados.linha_digitavel,
              url_boleto: !!dados.url_boleto,
              qrcode: !!dados.qrcode,
              qrcode_image: !!dados.qrcode_image
            }
          });
        }
      } catch (error) {
        logger.warn('Erro ao consultar dados atualizados da parcela', {
          parcela_id: parcela.id,
          charge_id: chargeId,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
      
      // Se está sendo marcada como paga via webhook, atualizar data_pagamento
      if (isPago && !parcela.pago) {
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
          } catch (error) {
            // Manter data atual se houver erro na conversão
          }
        }
        
        updateData.data_pagamento = dataPagamento;
        updateData.valor_pago = parcela.valor_parcela; // Assumir valor total pago
      }
      
      // Se está sendo desmarcada como paga, limpar data_pagamento
      if (!isPago && parcela.pago) {
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
      
      await parcela.update(updateData);

      // Verificar e atualizar status do carnê
      const carne = await parcela.getCarne();
      await carne.verificarEAtualizarStatus();

      logger.info('Status da parcela atualizado via webhook', {
        parcela_id: parcela.id,
        charge_id: chargeId,
        status_anterior: parcela.status,
        status_novo: novoStatus,
        pago_anterior: parcela.pago,
        pago_novo: isPago,
        data_pagamento: updateData.data_pagamento || 'não alterada',
        data_vencimento: updateData.data_vencimento || 'não alterada',
        valor_pago: updateData.valor_pago || 'não alterado'
      });

      return 1;
    } catch (error: any) {
      logger.error('Erro ao processar notificação de parcela', {
        charge_id: chargeId,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Processar notificação de carnê
   */
  private static async processarNotificacaoCarne(identifiers: any, status: string, customId: string): Promise<number> {
    const carnetId = identifiers.carnet_id || null;
    
    if (!carnetId) {
      logger.warn('Carnet ID não encontrado na notificação de carnê');
      return 0;
    }

    try {
      // Buscar carnê pelo carnet_id
      const carne = await Carne.findOne({
        where: { carnet_id: carnetId }
      });

      if (!carne) {
        logger.warn('Carnê não encontrado', { carnet_id: carnetId });
        return 0;
      }

      // Atualizar status do carnê
      const novoStatus = WebhookController.mapearStatusEfi(status) as 'ativo' | 'pago' | 'cancelado' | 'parcial' | 'pendente' | 'registrado';
      await carne.update({ status: novoStatus });

      logger.info('Status do carnê atualizado', {
        carne_id: carne.id,
        carnet_id: carnetId,
        status_anterior: carne.status,
        status_novo: novoStatus
      });

      return 1;
    } catch (error: any) {
      logger.error('Erro ao processar notificação de carnê', {
        carnet_id: carnetId,
        error: error.message
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

      // Buscar parcela pelo charge_id
      const parcela = await CarneParcela.findOne({
        where: { charge_id: chargeId }
      });

      if (!parcela) {
        logger.warn('Parcela não encontrada para charge', { charge_id: chargeId });
        return {
          success: false,
          message: 'Parcela não encontrada',
          status: 404
        };
      }

      // Atualizar status da parcela
      const novoStatus = WebhookController.mapearStatusEfi(status) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
      await parcela.update({ status: novoStatus });

      logger.info('Status da parcela atualizado via charge', {
        parcela_id: parcela.id,
        charge_id: chargeId,
        status_anterior: parcela.status,
        status_novo: novoStatus
      });

      return {
        success: true,
        message: 'Status da parcela atualizado',
        data: {
          parcela_id: parcela.id,
          status: novoStatus
        }
      };
    } catch (error: any) {
      logger.error('Erro ao processar notificação de charge', {
        notification,
        error: error.message
      });
      return {
        success: false,
        message: 'Erro ao processar notificação de charge',
        status: 500
      };
    }
  }

  /**
   * Processar notificação de carnê
   */
  private static async processarNotificacaoCarnet(notification: any): Promise<any> {
    try {
      const carnetId = notification.carnet_id || notification.id;
      const status = notification.status;
      const customId = notification.custom_id;

      logger.info('Processando notificação de carnê', {
        carnet_id: carnetId,
        status,
        custom_id: customId
      });

      if (!carnetId) {
        return {
          success: false,
          message: 'Carnet ID não encontrado',
          status: 400
        };
      }

      // Buscar carnê pelo carnet_id
      const carne = await Carne.findOne({
        where: { carnet_id: carnetId }
      });

      if (!carne) {
        logger.warn('Carnê não encontrado para carnet', { carnet_id: carnetId });
        return {
          success: false,
          message: 'Carnê não encontrado',
          status: 404
        };
      }

      // Atualizar status do carnê
      const novoStatus = WebhookController.mapearStatusEfi(status) as 'ativo' | 'pago' | 'cancelado' | 'parcial' | 'pendente' | 'registrado';
      await carne.update({ status: novoStatus });

      logger.info('Status do carnê atualizado via carnet', {
        carne_id: carne.id,
        carnet_id: carnetId,
        status_anterior: carne.status,
        status_novo: novoStatus
      });

      return {
        success: true,
        message: 'Status do carnê atualizado',
        data: {
          carne_id: carne.id,
          status: novoStatus
        }
      };
    } catch (error: any) {
      logger.error('Erro ao processar notificação de carnê', {
        notification,
        error: error.message
      });
      return {
        success: false,
        message: 'Erro ao processar notificação de carnê',
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
    } catch (error: any) {
      logger.error('Erro ao processar notificação de PIX', {
        notification,
        error: error.message
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
      const carnetId = notification.carnet_id;
      const customId = notification.custom_id;

      if (chargeId) {
        return await WebhookController.processarNotificacaoCharge(notification);
      } else if (carnetId) {
        return await WebhookController.processarNotificacaoCarnet(notification);
      } else if (customId) {
        // Tentar buscar por custom_id
        const parcela = await CarneParcela.findByPk(customId);
        if (parcela) {
          const novoStatus = WebhookController.mapearStatusEfi(notification.status) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
          await parcela.update({ status: novoStatus });
          
          return {
            success: true,
            message: 'Status atualizado via custom_id',
            data: {
              parcela_id: parcela.id,
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
    } catch (error: any) {
      logger.error('Erro ao processar notificação genérica', {
        notification,
        error: error.message
      });
      return {
        success: false,
        message: 'Erro ao processar notificação genérica',
        status: 500
      };
    }
  }

  /**
   * Consultar dados atualizados da parcela na EFI
   */
  private static async consultarDadosAtualizadosParcela(parcela: CarneParcela): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      if (!parcela.charge_id) {
        return { success: false, message: 'Charge ID não disponível' };
      }

      // Buscar o banco da parcela
      const carne = await parcela.getCarne();
      const banco = await carne.getBanco();
      
      if (!banco || banco.tipo_banco !== 'efi') {
        return { success: false, message: 'Banco EFI não encontrado' };
      }

      // Usar o BancoApiService para consultar dados atualizados
      const resultado = await BancoApiService.consultarStatus(parcela);
      
      if (resultado.success && resultado.data) {
        const dados = resultado.data;
        
        // Extrair dados específicos baseado na estrutura da EFI
        const dadosAtualizados: any = {};
        
        // Código de barras
        if (dados.barcode) {
          dadosAtualizados.codigo_barras = dados.barcode;
        }
        
        // Linha digitável
        if (dados.line) {
          dadosAtualizados.linha_digitavel = dados.line;
        }
        
        // URL do boleto
        if (dados.payment_url || dados.link) {
          dadosAtualizados.url_boleto = dados.payment_url || dados.link;
        }
        
        // Dados PIX
        if (dados.pix) {
          if (dados.pix.qrcode) {
            dadosAtualizados.qrcode = dados.pix.qrcode;
          }
          if (dados.pix.qrcode_image) {
            dadosAtualizados.qrcode_image = dados.pix.qrcode_image;
          }
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
      
    } catch (error: any) {
      logger.error('Erro ao consultar dados atualizados da parcela', {
        parcela_id: parcela.id,
        charge_id: parcela.charge_id,
        error: error.message
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
