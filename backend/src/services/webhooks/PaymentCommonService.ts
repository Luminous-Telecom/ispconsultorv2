import { Banco } from '../../models/Banco';
import { Usuario } from '../../models/Usuario';
import { logger } from '../../utils/logger';

/**
 * Serviço com utilitários compartilhados para processamento de webhooks de pagamento
 */
export class PaymentCommonService {
  /**
   * Normaliza data removendo hora (apenas para data de vencimento)
   */
  static normalizeDueDate(value: string | Date | null | undefined): Date | null {
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
   * Normaliza data de pagamento preservando hora exatamente como vem do banco
   * Sempre interpreta como hora local, ignorando qualquer timezone na string
   */
  static normalizePaymentDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    
    if (typeof value === 'string') {
      // Parsear manualmente para sempre usar componentes locais, ignorando timezone
      // Formato: "2025-11-28T14:30:00" ou "2025-11-28T14:30:00Z" ou "2025-11-28T14:30:00-03:00" ou "2025-11-28 14:30:00"
      const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(?:Z|([+-]\d{2}):(\d{2}))?$/);
      
      if (isoMatch) {
        // Ignorar timezone completamente - sempre usar como hora local
        const [, year, month, day, hour, minute, second, millisecond] = isoMatch;
        
        const yearNum = parseInt(year, 10);
        const monthNum = parseInt(month, 10) - 1; // JavaScript months são 0-indexed
        const dayNum = parseInt(day, 10);
        const hourNum = parseInt(hour, 10);
        const minuteNum = parseInt(minute, 10);
        const secondNum = parseInt(second, 10);
        const millisecondNum = millisecond ? parseInt(millisecond, 10) : 0;
        
        // Criar Date usando componentes locais diretamente (ignora timezone)
        return new Date(yearNum, monthNum, dayNum, hourNum, minuteNum, secondNum, millisecondNum);
      }
      
      // Se não é formato ISO conhecido, tentar parsear como data simples
      const simpleDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (simpleDateMatch) {
        const [, year, month, day] = simpleDateMatch;
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      }
      
      // Fallback: tentar parsear normalmente (mas pode ter problemas de timezone)
      const date = new Date(value);
      return !isNaN(date.getTime()) ? date : null;
    }
    
    return value instanceof Date ? value : null;
  }

  /**
   * Valida secret/token do webhook contra banco ou usuário
   * @param banco Banco relacionado (opcional)
   * @param receivedSecret Secret/token recebido no webhook
   * @returns true se secret válido, false caso contrário
   */
  static async validateWebhookSecret(banco: Banco | null | undefined, receivedSecret?: string): Promise<boolean> {
    if (!receivedSecret) {
      return false;
    }

    // Primeiro tentar validar com webhook_secret do banco (se existir)
    if (banco?.webhook_secret && banco.webhook_secret === receivedSecret) {
      return true;
    }

    // Buscar usuário pelo webhook_secret
    try {
      const usuario = await Usuario.findOne({
        where: {
          webhook_secret: receivedSecret
        }
      });

      if (usuario && usuario.webhook_secret === receivedSecret) {
        return true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar usuário para validação de webhook secret', {
        error: errorMessage
      });
    }

    // Se não encontrou usuário nem banco, rejeitar
    return false;
  }

  /**
   * Busca banco pelo webhook_secret ou configurações
   * Útil para Asaas que pode ter token em configurações
   */
  static getWebhookToken(banco: Banco): string | undefined {
    if (banco.webhook_secret && typeof banco.webhook_secret === 'string' && banco.webhook_secret.trim()) {
      return banco.webhook_secret;
    }
    
    if (banco.configuracoes?.webhook_token && typeof banco.configuracoes.webhook_token === 'string') {
      return banco.configuracoes.webhook_token.trim() || undefined;
    }
    
    return undefined;
  }
}

