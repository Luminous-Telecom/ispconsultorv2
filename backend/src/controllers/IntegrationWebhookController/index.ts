import { Request, Response } from 'express';
import { getCurrentTimestamp } from '../../utils/timezoneUtils';
import { sendSuccess, sendError, sendValidationError, sendUnauthorized, sendNotFound } from '../../utils/responseUtils';
import { IntegrationWebhookService } from '../../services/integration/IntegrationWebhookService';
import { IntegrationClientsSyncService } from '../../services/integration/IntegrationClientsSyncService';
import { IntegrationTituloGetService, pdfCache } from '../../services/integration/IntegrationTituloGetService';

// Limpar PDFs expirados a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of pdfCache.entries()) {
    if (entry.expiresAt < now) {
      pdfCache.delete(token);
    }
  }
}, 5 * 60 * 1000);

type IntegrationEvent = 'ping' | 'clients.sync' | 'titulo.get';

interface IntegrationWebhookRequestBody {
  secret?: string;
  event?: IntegrationEvent;
  payload?: IntegrationClientsPayload | IntegrationTituloPayload;
}

interface IntegrationClientsPayload {
  cnpj?: string;
  includeInactive?: boolean;
  clienteStatus?: 'ativo' | 'inativo' | 'all';
  tituloStatus?: string[];
  contratoStatus?: string[];
  limit?: number;
  offset?: number;
  updatedAfter?: string;
}

interface IntegrationTituloPayload {
  tituloId?: number;
  numeroTitulo?: string;
  fields?: string[];
  format?: 'json' | 'pdf';
}

export class IntegrationWebhookController {
  /**
   * Servir PDF temporário por token
   */
  static async servePdf(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        sendValidationError(res, 'Token não fornecido');
        return;
      }

      const entry = pdfCache.get(token);

      if (!entry) {
        sendNotFound(res, 'PDF não encontrado ou expirado');
        return;
      }

      // Verificar se expirou
      if (entry.expiresAt < Date.now()) {
        pdfCache.delete(token);
        sendNotFound(res, 'PDF expirado');
        return;
      }

      // Servir o PDF (inline para abrir no navegador)
      // Remover TODOS os headers de proteção que bloqueiam a exibição do PDF
      const headers = res.getHeaders();
      const headersToRemove = Object.keys(headers).filter(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('frame') || 
               lowerKey.includes('csp') ||
               lowerKey.includes('content-security') ||
               lowerKey.includes('cross-origin-embedder') ||
               lowerKey.includes('cross-origin-opener') ||
               lowerKey.includes('cross-origin-resource');
      });
      
      // Remover headers restritivos
      headersToRemove.forEach(header => {
        try {
          res.removeHeader(header);
        } catch (e) {
          // Ignorar se header não existir
        }
      });
      
      // Limpar headers específicos conhecidos (case-insensitive)
      const knownRestrictiveHeaders = [
        'X-Frame-Options', 'x-frame-options',
        'Content-Security-Policy', 'content-security-policy',
        'Cross-Origin-Embedder-Policy', 'cross-origin-embedder-policy',
        'Cross-Origin-Opener-Policy', 'cross-origin-opener-policy',
        'Cross-Origin-Resource-Policy', 'cross-origin-resource-policy'
      ];
      
      knownRestrictiveHeaders.forEach(header => {
        try {
          res.removeHeader(header);
        } catch (e) {
          // Ignorar
        }
      });
      
      // Definir headers permitindo exibição do PDF
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${entry.filename}"`,
        'Content-Length': entry.buffer.length.toString(),
        'X-Content-Type-Options': 'nosniff'
      });
      
      res.end(entry.buffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      sendError(res, error, 'Erro interno ao servir PDF', 500, true, {
        context: 'IntegrationWebhookController',
        action: 'servePdf'
      });
    }
  }

  static async handleIntegration(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as IntegrationWebhookRequestBody;
      const secret = body.secret;

      if (!(await IntegrationWebhookService.isSecretValid(secret))) {
        sendUnauthorized(res, 'Credenciais inválidas para o webhook de integração');
        return;
      }

      const event: IntegrationEvent = body.event ?? 'clients.sync';

      if (event === 'ping') {
        sendSuccess(res, { timestamp: getCurrentTimestamp() }, 'Integração ativa');
        return;
      }

      if (event === 'clients.sync') {
        const result = await IntegrationClientsSyncService.processSync(body.payload as IntegrationClientsPayload);
        sendSuccess(res, result, 'Dados de clientes sincronizados com sucesso');
        return;
      }

      if (event === 'titulo.get') {
        try {
          const result = await IntegrationTituloGetService.processGet(body.payload as IntegrationTituloPayload);
          sendSuccess(res, result, 'Título encontrado');
        } catch (error) {
          if (error instanceof Error && error.message === 'Título não encontrado') {
            sendNotFound(res, error.message);
          } else {
            throw error;
          }
        }
        return;
      }

      sendValidationError(res, `Evento '${event}' não suportado`);
    } catch (error) {
      sendError(res, error, 'Erro interno ao processar o webhook de integração', 500, true, {
        context: 'IntegrationWebhookController',
        action: 'handleIntegration'
      });
    }
  }
}
