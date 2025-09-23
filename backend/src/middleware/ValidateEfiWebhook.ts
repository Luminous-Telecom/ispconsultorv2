import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class ValidateEfiWebhook {
  /**
   * Middleware para validar webhooks da Efí
   */
  static validate(req: Request, res: Response, next: NextFunction): void {
    // Por enquanto, apenas logar que o webhook foi recebido
    // A Efí pode implementar validação de assinatura no futuro
    logger.info('Webhook Efí recebido - Validação de middleware', {
      ip: req.ip,
      user_agent: req.get('User-Agent'),
      content_type: req.get('Content-Type'),
      has_authorization: !!req.get('Authorization'),
      method: req.method,
      url: req.url
    });

    // TODO: Implementar validação de assinatura quando a Efí disponibilizar
    // Por enquanto, aceitar todos os webhooks
    
    next();
  }
}
