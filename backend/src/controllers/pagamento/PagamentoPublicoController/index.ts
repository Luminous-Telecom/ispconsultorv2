import { Request, Response as ExpressResponse } from 'express';
import { TituloService } from '../../../services/financeiro/TituloService';
import { TituloPDFController } from '../../titulos/TituloPDFController';
import { TituloComRelacoes } from '../../titulos/TituloHelpers/types';
import crypto from 'crypto';
import { sendSuccess, sendError, sendValidationError, sendForbidden, sendNotFound } from '../../../utils/responseUtils';
import { isProduction } from '../../../utils/envUtils';

const PAYMENT_SESSION_COOKIE = 'payment_session';
const PAYMENT_SESSION_MAX_AGE = 15 * 60; // 15 minutos

function validarTokenPagamento(token: string, tituloId: number): boolean {
  const secret = process.env.JWT_SECRET || 'default-secret';
  const expectedHash = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
  return token === expectedHash;
}

function criarCookieSessaoPagamento(tituloId: number): string {
  const secret = process.env.JWT_SECRET || 'default-secret';
  const expiry = Math.floor(Date.now() / 1000) + PAYMENT_SESSION_MAX_AGE;
  const payload = Buffer.from(`${tituloId}:${expiry}`, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex').substring(0, 16);
  return `${payload}.${signature}`;
}

function validarCookieSessaoPagamento(cookieValue: string): number | null {
  if (!cookieValue || !cookieValue.includes('.')) return null;
  const [payloadB64, sig] = cookieValue.split('.');
  if (!payloadB64 || !sig) return null;
  const secret = process.env.JWT_SECRET || 'default-secret';
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex').substring(0, 16);
  if (expectedSig !== sig) return null;
  const decoded = Buffer.from(payloadB64, 'base64url').toString('utf8');
  const [tid, exp] = decoded.split(':');
  const tituloId = parseInt(tid || '', 10);
  const expiry = parseInt(exp || '0', 10);
  if (isNaN(tituloId) || isNaN(expiry) || expiry < Math.floor(Date.now() / 1000)) return null;
  return tituloId;
}

export class PagamentoPublicoController {
  /**
   * POST /api/pagamento/session — Troca token (body) por cookie httpOnly.
   * Evita token na URL, logs e Referer. Links antigos (/pagamento/:id/:token) continuam funcionando.
   */
  static async initSession(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id, token } = req.body as { id?: string; token?: string };
      if (!id || !token) {
        sendValidationError(res, 'ID e token são obrigatórios');
        return;
      }
      const tituloId = parseInt(id, 10);
      if (isNaN(tituloId)) {
        sendValidationError(res, 'ID inválido');
        return;
      }
      if (!validarTokenPagamento(token, tituloId)) {
        sendForbidden(res, 'Token inválido ou expirado');
        return;
      }
      const titulo = await TituloService.getById(tituloId);
      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }
      const cookieValue = criarCookieSessaoPagamento(tituloId);
      res.cookie(PAYMENT_SESSION_COOKIE, cookieValue, {
        httpOnly: true,
        secure: isProduction(),
        sameSite: 'lax',
        maxAge: PAYMENT_SESSION_MAX_AGE * 1000,
        path: '/'
      });
      sendSuccess(res, { success: true });
    } catch (error) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'PagamentoPublicoController',
        action: 'initSession'
      });
    }
  }

  /**
   * GET /api/pagamento/:id — Busca título via cookie de sessão (sem token na URL)
   */
  static async getTituloPorSessao(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const id = req.params.id;
      const tituloId = parseInt(id, 10);
      if (isNaN(tituloId)) {
        sendValidationError(res, 'ID inválido');
        return;
      }
      const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
      const cookieValue = cookies?.[PAYMENT_SESSION_COOKIE];
      const sessionTituloId = validarCookieSessaoPagamento(cookieValue || '');
      if (sessionTituloId === null || sessionTituloId !== tituloId) {
        sendForbidden(res, 'Sessão inválida ou expirada. Acesse novamente pelo link de pagamento.');
        return;
      }
      const titulo = await TituloService.getById(tituloId) as TituloComRelacoes | null;
      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }
      sendSuccess(res, titulo);
    } catch (error) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'PagamentoPublicoController',
        action: 'getTituloPorSessao'
      });
    }
  }

  /**
   * GET /api/pagamento/:id/pdf — Download PDF via cookie de sessão
   */
  static async downloadPdfPorSessao(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const id = req.params.id;
      const tituloId = parseInt(id, 10);
      if (isNaN(tituloId)) {
        sendValidationError(res, 'ID inválido');
        return;
      }
      const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
      const cookieValue = cookies?.[PAYMENT_SESSION_COOKIE];
      const sessionTituloId = validarCookieSessaoPagamento(cookieValue || '');
      if (sessionTituloId === null || sessionTituloId !== tituloId) {
        sendForbidden(res, 'Sessão inválida ou expirada. Acesse novamente pelo link de pagamento.');
        return;
      }
      const titulo = await TituloService.getById(tituloId) as TituloComRelacoes | null;
      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }
      const pdfBase64 = await TituloPDFController.gerarPdfBase64(titulo);
      if (!pdfBase64) {
        sendError(res, new Error('Erro ao gerar PDF do boleto'), 'Erro ao gerar PDF do boleto', 500, true, {
          context: 'PagamentoPublicoController',
          action: 'downloadPdfPorSessao',
          tituloId
        });
        return;
      }
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      const filename = `boleto-${titulo.numero_titulo || titulo.id}.pdf`;
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      });
      res.end(pdfBuffer);
    } catch (error) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'PagamentoPublicoController',
        action: 'downloadPdfPorSessao'
      });
    }
  }

  /**
   * API para buscar dados do título (legacy: token na URL — mantido para links já enviados)
   */
  static async getTituloPublico(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id, token } = req.params;

      if (!id || !token) {
        sendValidationError(res, 'ID e token são obrigatórios');
        return;
      }

      const tituloId = parseInt(id, 10);
      if (isNaN(tituloId)) {
        sendValidationError(res, 'ID inválido');
        return;
      }

      if (!validarTokenPagamento(token, tituloId)) {
        sendForbidden(res, 'Token inválido ou expirado');
        return;
      }

      const titulo = await TituloService.getById(tituloId) as TituloComRelacoes | null;

      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      sendSuccess(res, titulo);
    } catch (error) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'PagamentoPublicoController',
        action: 'getTituloPublico'
      });
    }
  }

  /**
   * Gerar e servir PDF do boleto
   */
  static async downloadPdf(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id, token } = req.params;

      if (!id || !token) {
        sendValidationError(res, 'ID e token são obrigatórios');
        return;
      }

      const tituloId = parseInt(id, 10);
      if (isNaN(tituloId)) {
        sendValidationError(res, 'ID inválido');
        return;
      }

      if (!validarTokenPagamento(token, tituloId)) {
        sendForbidden(res, 'Token inválido');
        return;
      }

      // Buscar título
      const titulo = await TituloService.getById(tituloId) as TituloComRelacoes | null;

      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      // Gerar PDF - titulo já tem os relacionamentos incluídos
      const pdfBase64 = await TituloPDFController.gerarPdfBase64(titulo as TituloComRelacoes);
      
      if (!pdfBase64) {
        sendError(res, new Error('Erro ao gerar PDF do boleto'), 'Erro ao gerar PDF do boleto', 500, true, {
          context: 'PagamentoPublicoController',
          action: 'downloadPdf',
          tituloId
        });
        return;
      }

      // Converter base64 para Buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // Configurar headers para download de PDF
      const filename = `boleto-${(titulo as TituloComRelacoes).numero_titulo || (titulo as TituloComRelacoes).id}.pdf`;
      
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      });

      res.end(pdfBuffer);
    } catch (error) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'PagamentoPublicoController',
        action: 'downloadPdf'
      });
    }
  }
}

