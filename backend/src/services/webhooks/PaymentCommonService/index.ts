import { Request } from 'express';
import { Banco } from '../../../models/cadastros/Banco';
import type { WebhookEmpresaScope } from '../TituloWebhookResolver';

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
   * Payload EFI: priorizar data efetiva de pagamento; created_at costuma ser cobrança/evento.
   */
  static pickEfiWebhookPaymentDateRaw(item: {
    paid_at?: string;
    payment_date?: string;
    confirmed_at?: string;
    created_at?: string;
  }): string | undefined {
    return item.paid_at || item.payment_date || item.confirmed_at || item.created_at;
  }

  /**
   * Webhook Asaas: `dateCreated` do envelope é data do evento (ex.: cancelamento de boleto em 2026),
   * não a data do recebimento. Preferir campos do objeto `payment`.
   */
  static pickAsaasWebhookPaymentDateRaw(
    payment: {
      paymentDate?: string;
      customerPaymentDate?: string;
      creditDate?: string;
      confirmedDate?: string;
      effectiveDate?: string;
      dateCreated?: string;
    },
    rootWebhookDateCreated?: string
  ): string | undefined {
    const pick = (s?: string) => (typeof s === 'string' && s.trim() ? s : undefined);
    return (
      pick(payment.paymentDate) ||
      pick(payment.customerPaymentDate) ||
      pick(payment.creditDate) ||
      pick(payment.confirmedDate) ||
      pick(payment.effectiveDate) ||
      pick(payment.dateCreated) ||
      pick(rootWebhookDateCreated)
    );
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
   * Valida secret/token do webhook contra o banco
   * @param banco Banco ou objeto com webhook_secret/configuracoes (opcional)
   * @param receivedSecret Secret/token recebido no webhook
   * @returns true se secret válido, false caso contrário
   */
  static validateWebhookSecret(banco: Banco | { webhook_secret?: string | null; configuracoes?: { webhook_token?: string } } | null | undefined, receivedSecret?: string): boolean {
    if (!receivedSecret) {
      return false;
    }
    const expectedToken = banco ? PaymentCommonService.getWebhookToken(banco) : undefined;
    return !!expectedToken && expectedToken.trim() === receivedSecret.trim();
  }

  /**
   * Extrai o ID do banco na URL do webhook
   */
  static getWebhookScope(req?: Request): WebhookEmpresaScope | undefined {
    const id = (req as { webhookEmpresaIdentifier?: string })?.webhookEmpresaIdentifier;
    if (!id || typeof id !== 'string' || !id.trim()) return undefined;
    return { empresaIdentifier: id.trim() };
  }

  /**
   * Busca webhook_secret do banco
   */
  static getWebhookToken(banco: Banco | { webhook_secret?: string | null; configuracoes?: { webhook_token?: string } }): string | undefined {
    const secret = (banco as { webhook_secret?: string | null }).webhook_secret;
    if (secret && typeof secret === 'string' && secret.trim()) {
      return secret;
    }
    const config = (banco as Banco).configuracoes;
    if (config?.webhook_token && typeof config.webhook_token === 'string') {
      return config.webhook_token.trim() || undefined;
    }
    return undefined;
  }
}

