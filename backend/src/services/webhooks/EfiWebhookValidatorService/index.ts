import { Banco } from '../../../models/cadastros/Banco';
import { PaymentCommonService } from '../PaymentCommonService';
import { logger } from '../../../utils/logger';

export class EfiWebhookValidatorService {
  /**
   * Valida secret do webhook (não bloqueia se não fornecido)
   */
  static async validateSecret(
    banco: Banco,
    receivedSecret?: string
  ): Promise<{ valid: boolean; shouldBlock: boolean }> {
    if (!receivedSecret) {
      return { valid: true, shouldBlock: false };
    }

    const isValid = PaymentCommonService.validateWebhookSecret(banco, receivedSecret);
    
    if (!isValid) {
      logger.debug('Webhook EFI: secret não corresponde ao banco', {
        banco_id: banco.id,
        possui_secret: !!banco.webhook_secret
      });
      // Não bloquear - apenas logar
      return { valid: false, shouldBlock: false };
    }

    return { valid: true, shouldBlock: false };
  }

  /**
   * Valida estrutura de dados da notificação
   */
  static validateNotificationStructure(
    dados: unknown
  ): { valid: boolean; isArray: boolean; isNotificationData: boolean; isChargeNotification: boolean } {
    if (Array.isArray(dados)) {
      return { valid: true, isArray: true, isNotificationData: false, isChargeNotification: false };
    }

    if (typeof dados !== 'object' || dados === null) {
      return { valid: false, isArray: false, isNotificationData: false, isChargeNotification: false };
    }

    const dataObj = dados as Record<string, unknown>;
    
    // Verificar se é NotificationData (nova estrutura)
    const isNotificationData = 'code' in dataObj && 'data' in dataObj && Array.isArray(dataObj.data);
    
    // Verificar se é ChargeNotification (estrutura antiga)
    const isChargeNotification = 'charge' in dataObj && dataObj.charge !== null;

    return {
      valid: isNotificationData || isChargeNotification,
      isArray: false,
      isNotificationData,
      isChargeNotification
    };
  }
}
