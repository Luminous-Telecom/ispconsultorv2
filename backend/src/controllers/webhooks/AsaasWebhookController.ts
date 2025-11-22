import { Request, Response } from 'express';
import { Titulo } from '../../models/Titulo';
import { Banco } from '../../models/Banco';
import { AsaasWebhookService } from '../../services/webhooks/AsaasWebhookService';
import { logger } from '../../utils/logger';
import { JsonValue } from '../../types/index';
import { AsaasPaymentPayload } from '../../types/webhooks';

/**
 * Controller para webhooks do Asaas
 * Responsável por validar requisição (token obrigatório) e delegar processamento ao service
 */
export class AsaasWebhookController {
  /**
   * Processa webhook do Asaas
   * Valida token (obrigatório) e delega processamento ao service
   */
  static async handle(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as AsaasPaymentPayload | Record<string, JsonValue> | undefined;

      // Validar payload básico
      if (!payload || typeof payload !== 'object') {
        res.status(400).json({
          success: false,
          message: 'Payload inválido'
        });
        return;
      }

      // Extrair secret/token de headers ou payload
      const receivedSecret =
        req.get('asaas-access-token') ||
        req.get('access_token') ||
        (typeof payload?.token === 'string' ? payload.token : undefined);

      // Extrair objeto payment
      const payment = (payload.payment && typeof payload.payment === 'object' && !Array.isArray(payload.payment))
        ? payload.payment as AsaasPaymentPayload['payment']
        : undefined;

      // Se não tem payment.id, retornar sucesso (webhook pode vir sem payment)
      if (!payment || !payment.id) {
        res.status(200).json({
          success: true,
          message: 'Webhook recebido sem payment.id'
        });
        return;
      }

      const chargeId = String(payment.id);

      // Buscar título pelo charge_id para validar token
      const titulo = await Titulo.findOne({
        where: { charge_id: chargeId },
        include: [{ model: Banco, as: 'banco' }]
      }) as (Titulo & { banco?: Banco | null }) | null;

      // Buscar token esperado (do banco relacionado ou de todos bancos Asaas)
      const expectedSecret = await AsaasWebhookService.findExpectedToken(titulo, receivedSecret);

      // Validar token (obrigatório para Asaas)
      if (!expectedSecret) {
        res.status(401).json({
          success: false,
          message: 'Token do webhook não configurado'
        });
        return;
      }

      if (!receivedSecret || receivedSecret !== expectedSecret) {
        logger.warn('Webhook Asaas com token inválido', {
          charge_id: chargeId,
          has_received_secret: !!receivedSecret
        });
        res.status(401).json({
          success: false,
          message: 'Token do webhook inválido'
        });
        return;
      }

      // Se título não encontrado, retornar sucesso (não é erro)
      if (!titulo) {
        res.status(200).json({
          success: true,
          message: 'Título não encontrado para este charge_id'
        });
        return;
      }

      // Retornar 200 OK imediatamente (webhook recebido e validado com sucesso)
      res.status(200).json({
        success: true,
        message: 'Webhook recebido'
      });

      // Processar webhook em background (sem await)
      AsaasWebhookService.processWebhook(payment, titulo).catch(error => {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error('Erro ao processar webhook Asaas em background', {
          charge_id: chargeId,
          titulo_id: titulo.id,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao processar webhook Asaas', {
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

