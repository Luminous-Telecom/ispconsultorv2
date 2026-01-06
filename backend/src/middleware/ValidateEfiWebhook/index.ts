import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

export class ValidateEfiWebhook {
  static validate(req: Request, res: Response, next: NextFunction): void {
    logger.info('Webhook Efí recebido', {
      ip: req.ip,
      user_agent: req.get('User-Agent'),
      content_type: req.get('Content-Type'),
      method: req.method,
      url: req.originalUrl
    });

    next();
  }
}
