import { Request, Response as ExpressResponse } from 'express';
import { Titulo } from '../../../models/financeiro/Titulo';
import { TituloService } from '../../../services/financeiro/TituloService';
import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { Banco } from '../../../models/cadastros/Banco';
import { TituloPDFController } from '../../titulos/TituloPDFController';
import { TituloComRelacoes } from '../../titulos/TituloHelpers/types';
import { logger } from '../../../utils/logger';
import crypto from 'crypto';
import { sendSuccess, sendError, sendValidationError, sendForbidden, sendNotFound } from '../../../utils/responseUtils';

export class PagamentoPublicoController {
  /**
   * Gerar token de acesso público para um título
   */
  static gerarToken(tituloId: number): string {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const data = `${tituloId}-${Date.now()}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 32);
  }

  /**
   * Validar token e retornar ID do título
   */
  static validarToken(token: string, tituloId: number): boolean {
    // Por enquanto, vamos usar uma validação simples baseada no ID
    // Em produção, você pode implementar um sistema de tokens mais robusto
    // Por segurança, vamos usar um hash do ID + secret
    const secret = process.env.JWT_SECRET || 'default-secret';
    const expectedHash = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
    return token === expectedHash;
  }

  /**
   * API para buscar dados do título para página pública de pagamento
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

      const secret = process.env.JWT_SECRET || 'default-secret';
      const expectedHash = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
      
      if (token !== expectedHash) {
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

      // Validar token
      const secret = process.env.JWT_SECRET || 'default-secret';
      const expectedHash = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
      
      if (token !== expectedHash) {
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

