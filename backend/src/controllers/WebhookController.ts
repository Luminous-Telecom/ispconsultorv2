import { Request, Response } from 'express';
import { Banco } from '../models/Banco';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Titulo } from '../models/Titulo';
import { Usuario } from '../models/Usuario';
import { BancoApiService } from '../services/BancoApiService';
import { logger } from '../utils/logger';
import { JsonValue } from '../types';
import { BarcodeService } from '../services/BarcodeService';

interface WebhookResponse {
  success: boolean;
  message: string;
  status?: number;
  data?: Record<string, JsonValue>;
}

interface NotificationData {
  code?: string;
  data?: NotificationItem[];
  charge?: ChargeNotification;
}

interface NotificationItem {
  id?: string;
  type?: string;
  identifiers?: NotificationIdentifiers;
  status?: string | {
    current?: string;
  };
  custom_id?: string | null;
  created_at?: string;
  expire_at?: string;
  due_date?: string;
}

interface NotificationIdentifiers {
  charge_id?: string | null;
  [key: string]: JsonValue | undefined;
}

interface ChargeNotification {
  id?: string;
  charge_id?: string | null;
  status?: string;
  custom_id?: string;
}

interface TituloUpdateData {
  status?: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  pago?: boolean;
  codigo_barras?: string;
  linha_digitavel?: string;
  url_boleto?: string;
  qrcode?: string;
  qrcode_image?: string;
  data_pagamento?: string | null;
  valor_pago?: number | null;
  data_vencimento?: string | Date;
}

interface EfiPaymentData {
  payment?: {
    banking_billet?: {
      barcode?: string;
      url?: string;
      pdf?: {
        charge?: string;
      };
      pix?: {
        qrcode?: string;
        qrcode_image?: string;
      };
    };
  };
}

interface EfiDadosAtualizados {
  codigo_barras?: string;
  linha_digitavel?: string;
  url_boleto?: string;
  qrcode?: string;
  qrcode_image?: string;
  pdf_url?: string;
}

interface TituloWithBanco {
  id: number;
  charge_id: string | null;
  banco?: Banco | null;
}

export class WebhookController {
  private static normalizeDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    
    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    
    return null;
  }

  /**
   * Webhook unificado para receber notificações da Efí sobre todos os tipos de operações
   * (PIX, Bolix, carnês, boletos individuais, etc.)
   */
  static async efiWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;

      const receivedSecret =
        req.get('asaas-access-token') ||
        req.get('efi-access-token') ||
        req.get('x-internal-webhook-secret') ||
        (typeof payload?.secret === 'string' ? payload.secret : undefined) ||
        (typeof payload?.token === 'string' ? payload.token : undefined);
      
      // Verificar se é um token de notificação (form-urlencoded)
      if (req.get('Content-Type') === 'application/x-www-form-urlencoded' && 
          payload.notification && 
          typeof payload.notification === 'string' && 
          !Array.isArray(payload.notification)) {
        
        const notificationToken = payload.notification;
        logger.info(`Token de notificação recebido: ${notificationToken}`);
        
        // Processar token de notificação - consultar API do EFI
        const result = await WebhookController.processarTokenNotificacao(notificationToken, receivedSecret);
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
          const chargeResult = await WebhookController.processarNotificacaoCharge(notification, receivedSecret);
          res.status(chargeResult.status || 200).json(chargeResult);
          break;
        
        
        case 'pix_paid':
        case 'pix_settled':
        case 'pix_canceled':
        case 'pix_expired':
        case 'pix_waiting':
        case 'pix_pending':
          const pixResult = await WebhookController.processarNotificacaoPix(notification, receivedSecret);
          res.status(pixResult.status || 200).json(pixResult);
          break;
        
        // Processar notificações genéricas
        case 'payment':
        case 'paid':
        case 'settled':
        case 'canceled':
        case 'expired':
          logger.info(`Processando notificação genérica: ${notificationType}`);
          const genericResult = await WebhookController.processarNotificacaoGenerica(notification, receivedSecret);
          res.status(genericResult.status || 200).json(genericResult);
          break;
        
        default:
          logger.warn(`Tipo de notificação não reconhecido: ${notificationType}`);
          logger.warn('Payload completo:', JSON.stringify(payload, null, 2));
          res.status(200).json({ message: 'Tipo de notificação não processado' });
      }

    } catch (error) {
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
  private static async processarTokenNotificacao(notificationToken: string, receivedSecret?: string): Promise<WebhookResponse> {
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

      let algumBancoAutorizado = false;

      // Tentar cada banco ativo para encontrar o token correto
      for (const banco of bancosAtivos) {
        if (!(await WebhookController.isWebhookSecretValid(banco, receivedSecret))) {
          logger.warn('Secret do webhook inválido para banco ativo', {
            banco_id: banco.id,
            possui_secret: !!banco.webhook_secret
          });
          continue;
        }

        algumBancoAutorizado = true;

        logger.info(`Tentando consultar token no banco ${banco.id}`, {
          banco_id: banco.id,
          banco_nome: banco.nome,
          sandbox: banco.sandbox
        });
        
        const resultado = await BancoApiService.consultarNotificacaoPorToken(banco, notificationToken);
        
        if (resultado.success && resultado.data) {
          logger.info('Token encontrado no banco correto!', {
            banco_id: banco.id,
            data_count: Array.isArray(resultado.data.data) ? resultado.data.data.length : 0
          });
          
          return await WebhookController.processarDadosNotificacao(
            resultado.data as NotificationData | NotificationItem[] | NotificationItem,
            banco,
            receivedSecret
          );
        }
      }
      
      if (!algumBancoAutorizado && receivedSecret) {
        logger.warn('Webhook EFI: nenhum banco autorizou o secret recebido', { receivedSecret });
        return {
          success: false,
          message: 'Token do webhook inválido',
          status: 401
        };
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
        if (!(await WebhookController.isWebhookSecretValid(banco, receivedSecret))) {
          logger.warn('Secret do webhook inválido para banco (fallback)', {
            banco_id: banco.id,
            possui_secret: !!banco.webhook_secret
          });
          continue;
        }

        logger.info(`Consultando notificação no banco EFI: ${banco.id}`);
        
        const resultado = await BancoApiService.consultarNotificacaoPorToken(banco, notificationToken);
        
        if (resultado.success && resultado.data) {
          logger.info('Notificação consultada com sucesso', {
            banco_id: banco.id,
            data: resultado.data
          });
          
          // Processar os dados da notificação
          return await WebhookController.processarDadosNotificacao(
            resultado.data as NotificationData | NotificationItem[] | NotificationItem,
            banco,
            receivedSecret
          );
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
      
    } catch (error) {
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
  private static async processarDadosNotificacao(
    dados: NotificationData | NotificationItem[] | NotificationItem,
    banco: Banco,
    receivedSecret?: string
  ): Promise<WebhookResponse> {
    try {
      logger.info('Processando dados da notificação', {
        banco_id: banco.id,
        dados
      });

      if (!(await WebhookController.isWebhookSecretValid(banco, receivedSecret))) {
        logger.warn('Webhook EFI: secret inválido ao processar dados', {
          banco_id: banco.id,
          possui_secret: !!banco.webhook_secret
        });
        return {
          success: false,
          message: 'Token do webhook inválido',
          status: 401
        };
      }

      // Nova estrutura da EFI: array de notificações
      if (!Array.isArray(dados) && 'code' in dados && dados.code && 'data' in dados && dados.data && Array.isArray(dados.data)) {
        logger.info('Processando notificações em lote', {
          count: dados.data.length
        });
        
        let processadas = 0;
        for (const notificacao of dados.data) {
          if (notificacao.type && notificacao.identifiers) {
            processadas += await WebhookController.processarNotificacaoIndividual(notificacao, banco, receivedSecret);
          }
        }
        
        return {
          success: true,
          message: `${processadas} notificações processadas`,
          data: { total_processadas: processadas }
        };
      }

      // Verificar se é uma notificação de charge (boleto individual) - estrutura antiga
      if (!Array.isArray(dados) && 'charge' in dados && dados.charge) {
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
          const processadas = await WebhookController.processarNotificacaoIndividual(notificacao, banco, receivedSecret);
          totalProcessadas += processadas;
        }
        
        return {
          success: true,
          message: `${totalProcessadas} notificações processadas`,
          data: { total_processadas: totalProcessadas }
        };
      } else if (!Array.isArray(dados) && 'type' in dados) {
        // Notificação individual
        const processadas = await WebhookController.processarNotificacaoIndividual(dados as NotificationItem, banco, receivedSecret);
        
        return {
          success: true,
          message: 'Notificação processada',
          data: { processadas }
        };
      }
      
      // Fallback: retornar erro se não foi possível processar
      return {
        success: false,
        message: 'Formato de notificação não reconhecido',
        status: 400
      };
    } catch (error) {
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
  private static async processarNotificacaoIndividual(
    notificacao: NotificationItem,
    banco: Banco,
    receivedSecret?: string
  ): Promise<number> {
    try {
      const type = notificacao.type || '';
      const identifiers = notificacao.identifiers || {};
      const status = typeof notificacao.status === 'object' && notificacao.status?.current
        ? notificacao.status.current
        : typeof notificacao.status === 'string' ? notificacao.status : null;
      const customId = notificacao.custom_id || null;
      

      if (!(await WebhookController.isWebhookSecretValid(banco, receivedSecret))) {
        logger.warn('Webhook EFI: secret inválido em notificação individual', {
          banco_id: banco.id,
          possui_secret: !!banco.webhook_secret
        });
        return 0;
      }
      
      switch (type) {
        case 'charge':
          return await WebhookController.processarNotificacaoTitulo(identifiers, status, customId, notificacao, banco, receivedSecret);
          
        default:
          logger.warn('Tipo de notificação não suportado', { type });
          return 0;
      }
    } catch (error) {
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
  private static async processarNotificacaoTitulo(
    identifiers: NotificationIdentifiers,
    status: string | null,
    customId: string | null,
    dadosCompletos?: NotificationItem,
    bancoContext?: Banco,
    receivedSecret?: string
  ): Promise<number> {
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
            attributes: ['id', 'nome', 'tipo_banco', 'codigo', 'webhook_secret']
          }
        ]
      });

      if (!titulo) {
        logger.warn('Título não encontrado', { charge_id: chargeId });
        return 0;
      }

      const bancoRelacionado = bancoContext ?? (titulo as Titulo & { banco?: Banco | null }).banco ?? null;
      if (!(await WebhookController.isWebhookSecretValid(bancoRelacionado ?? undefined, receivedSecret))) {
        logger.warn('Webhook EFI: secret inválido ao processar título', {
          charge_id: chargeId,
          banco_id: bancoRelacionado?.id ?? null
        });
        return 0;
      }

      // Atualizar status do título
      const statusString = status || 'pendente';
      const novoStatus = WebhookController.mapearStatusEfi(statusString) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
      const isPago = ['pago', 'liquidado'].includes(novoStatus);
      
      const updateData: TituloUpdateData = { 
        status: novoStatus,
        pago: isPago
      };

      
      if (isPago && !titulo.pago) {
        const dataWebhook = dadosCompletos?.created_at?.split(' ')[0];
        updateData.data_pagamento = dataWebhook && /^\d{4}-\d{2}-\d{2}$/.test(dataWebhook) 
          ? dataWebhook 
          : new Date().toISOString().split('T')[0];
        updateData.valor_pago = titulo.valor;
      }
      
      if (!isPago && titulo.pago) {
        updateData.data_pagamento = null;
        updateData.valor_pago = null;
      }
      
      // Atualizar data de vencimento se fornecida no webhook
      if (dadosCompletos?.expire_at) {
        const normalizedDate = WebhookController.normalizeDate(dadosCompletos.expire_at);
        if (normalizedDate) {
          updateData.data_vencimento = normalizedDate;
        }
      } else if (dadosCompletos?.due_date) {
        const normalizedDate = WebhookController.normalizeDate(dadosCompletos.due_date);
        if (normalizedDate) {
          updateData.data_vencimento = normalizedDate;
        }
      }
      
      await titulo.update(updateData as Partial<typeof titulo>);


      return 1;
    } catch (error) {
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
  private static async processarNotificacaoCharge(
    notification: ChargeNotification | NotificationItem,
    receivedSecret?: string,
    bancoContext?: Banco
  ): Promise<WebhookResponse> {
    try {
      const chargeId = 'charge_id' in notification ? notification.charge_id : notification.id;
      const status = typeof notification.status === 'string' 
        ? notification.status 
        : notification.status?.current;
      const customId = notification.custom_id;


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
        where: { charge_id: chargeId },
        include: [{ model: Banco, as: 'banco', attributes: ['id', 'nome', 'tipo_banco', 'codigo', 'webhook_secret'] }]
      }) as (Titulo & { banco?: Banco | null }) | null;

      const bancoRelacionado = bancoContext ?? titulo?.banco ?? null;

      if (!(await WebhookController.isWebhookSecretValid(bancoRelacionado ?? undefined, receivedSecret))) {
        logger.warn('Webhook EFI: secret inválido ao processar charge', {
          charge_id: chargeId,
          banco_id: bancoRelacionado?.id ?? null
        });
        return {
          success: false,
          message: 'Token do webhook inválido',
          status: 401
        };
      }

      if (!titulo) {
        logger.warn('Título não encontrado para charge', { charge_id: chargeId });
            return {
          success: false,
          message: 'Título não encontrado',
          status: 404
        };
      }

      // Atualizar status do título
      const statusString = status || '';
      const novoStatus = WebhookController.mapearStatusEfi(statusString) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
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
    } catch (error) {
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
  private static async processarNotificacaoPix(notification: NotificationItem, receivedSecret?: string): Promise<WebhookResponse> {
    try {
      logger.info('Processando notificação de PIX', { notification });

      // Implementar lógica específica para PIX se necessário
      // Por enquanto, tratar como notificação genérica
      return await WebhookController.processarNotificacaoGenerica(notification, receivedSecret);
    } catch (error) {
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
  private static async processarNotificacaoGenerica(notification: NotificationItem | ChargeNotification, receivedSecret?: string): Promise<WebhookResponse> {
    try {

      // Tentar identificar o tipo de notificação pelos campos disponíveis
      const chargeId = 'charge_id' in notification ? notification.charge_id : notification.id;
      const customId = notification.custom_id;

      if (chargeId) {
        return await WebhookController.processarNotificacaoCharge(notification, receivedSecret);
      } else if (customId) {
        // Tentar buscar por custom_id
        const { Titulo } = await import('../models/Titulo');
        const titulo = await Titulo.findByPk(String(customId), {
          include: [{ model: Banco, as: 'banco', attributes: ['id', 'nome', 'tipo_banco', 'codigo', 'webhook_secret'] }]
        }) as (Titulo & { banco?: Banco | null }) | null;
        if (titulo) {
          if (!(await WebhookController.isWebhookSecretValid(titulo.banco ?? undefined, receivedSecret))) {
            logger.warn('Webhook EFI: secret inválido ao processar custom_id', {
              titulo_id: titulo.id,
              banco_id: titulo.banco?.id ?? null
            });
            return {
              success: false,
              message: 'Token do webhook inválido',
              status: 401
            };
          }

          const statusString = typeof notification.status === 'string' 
            ? notification.status 
            : notification.status?.current || 'pendente';
          const novoStatus = WebhookController.mapearStatusEfi(statusString) as 'pendente' | 'pago' | 'vencido' | 'cancelado';
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

      return {
        success: false,
        message: 'Não foi possível processar notificação genérica',
        status: 400
      };
    } catch (error) {
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

  private static async isWebhookSecretValid(banco?: Banco | null, receivedSecret?: string): Promise<boolean> {
    if (!receivedSecret) {
      return false;
    }

    // Primeiro tentar validar com webhook_secret do banco (se existir)
    if (banco?.webhook_secret && banco.webhook_secret === receivedSecret) {
      return true;
    }

    // Buscar usuário pelo webhook_secret
    const usuario = await Usuario.findOne({
      where: {
        webhook_secret: receivedSecret
      }
    });

    if (usuario && usuario.webhook_secret === receivedSecret) {
      return true;
    }

    // Se não encontrou usuário nem banco, rejeitar
    return false;
  }

  /**
   * Webhook para notificações do Asaas
   */
  static async asaasWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as Record<string, JsonValue> | undefined;

      if (!payload || typeof payload !== 'object') {
        res.status(400).json({
          success: false,
          message: 'Payload inválido'
        });
        return;
      }

      const receivedSecret =
        req.get('asaas-access-token') ||
        req.get('access_token') ||
        (typeof payload?.token === 'string' ? payload.token : undefined);

      const payment = (payload.payment && typeof payload.payment === 'object' && !Array.isArray(payload.payment))
        ? payload.payment as Record<string, JsonValue>
        : undefined;

      if (!payment || !payment.id) {
        res.status(200).json({
          success: true,
          message: 'Webhook recebido sem payment.id'
        });
        return;
      }

      const chargeId = String(payment.id);

      const titulo = await Titulo.findOne({
        where: { charge_id: chargeId },
        include: [{ model: Banco, as: 'banco' }]
      }) as (Titulo & { banco?: Banco | null }) | null;

      const getWebhookToken = (banco: Banco): string | undefined => {
        if (banco.webhook_secret && typeof banco.webhook_secret === 'string' && banco.webhook_secret.trim()) {
          return banco.webhook_secret;
        }
        if (banco.configuracoes?.webhook_token && typeof banco.configuracoes.webhook_token === 'string') {
          return banco.configuracoes.webhook_token.trim() || undefined;
        }
        return undefined;
      };

      let expectedSecret: string | undefined = undefined;

      if (titulo?.banco?.tipo_banco === 'asaas') {
        expectedSecret = getWebhookToken(titulo.banco);
      }

      if (!expectedSecret) {
        const bancosAsaas = await Banco.findAll({
          where: { tipo_banco: 'asaas', ativo: true }
        });

        for (const banco of bancosAsaas) {
          const token = getWebhookToken(banco);
          if (token && (!receivedSecret || receivedSecret === token)) {
            expectedSecret = token;
            break;
          }
        }
      }

      if (!expectedSecret) {
        res.status(401).json({
          success: false,
          message: 'Token do webhook não configurado'
        });
        return;
      }

      if (!receivedSecret || receivedSecret !== expectedSecret) {
        logger.warn('Webhook Asaas com token inválido');
        res.status(401).json({
          success: false,
          message: 'Token do webhook inválido'
        });
        return;
      }

      if (!titulo) {
        res.status(200).json({
          success: true,
          message: 'Título não encontrado para este charge_id'
        });
        return;
      }

      const updates: Partial<Titulo> & Record<string, JsonValue> = {};
      const pagamentoStatusRaw = payment.status;
      const paymentStatus = typeof pagamentoStatusRaw === 'string'
        ? pagamentoStatusRaw.toUpperCase()
        : '';

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

      const novoStatus = statusMap[paymentStatus];
      if (novoStatus) {
        updates.status = novoStatus;
      }

      const paymentDate = typeof payment.paymentDate === 'string'
        ? payment.paymentDate
        : typeof payment.effectiveDate === 'string'
          ? payment.effectiveDate
          : undefined;

      if (novoStatus === 'pago') {
        updates.data_pagamento = paymentDate ? WebhookController.normalizeDate(paymentDate) || new Date() : new Date();
        updates.valor_pago = typeof payment.value === 'number' ? Number(payment.value) : 
                             typeof payment.netValue === 'number' ? Number(payment.netValue) : undefined;
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
        const normalizedDate = WebhookController.normalizeDate(payment.dueDate);
        if (normalizedDate) {
          updates.data_vencimento = normalizedDate;
        }
      }

      if (Object.keys(updates).length > 0) {
        await titulo.update(updates);
      }

      res.status(200).json({
        success: true,
        message: 'Título atualizado via webhook Asaas'
      });
    } catch (error) {
      logger.error('Erro ao processar webhook Asaas', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      res.status(500).json({
        success: false,
        message: 'Erro interno ao processar webhook Asaas'
      });
    }
  }
}
