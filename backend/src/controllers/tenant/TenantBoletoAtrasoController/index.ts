import { Response } from 'express';
import type { AuthenticatedRequest } from '../../../types/auth';
import { getBloqueioAtrasoInfo } from '../../../services/saas/BloqueioAtrasoService';
import { SaasTituloBoletoService } from '../../../services/saas/SaasTituloBoletoService';
import { sendSuccess, sendError, sendNotFound } from '../../../utils/responseUtils';

/**
 * Permite que tenant bloqueado por atraso gere/obtenha o boleto da fatura em atraso.
 * Rota permitida mesmo quando empresa está bloqueada (ver authMiddleware).
 */
export class TenantBoletoAtrasoController {
  static async post(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payload = req.user as { empresa_id?: number } | undefined;
      const empresaId = payload?.empresa_id;
      if (!empresaId) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const bloqueio = await getBloqueioAtrasoInfo(empresaId);
      if (!bloqueio.bloqueado || !bloqueio.titulo_id) {
        res.status(400).json({
          success: false,
          message: 'Nenhuma fatura em atraso encontrada para esta empresa.'
        });
        return;
      }

      const resultado = await SaasTituloBoletoService.gerarBoleto(bloqueio.titulo_id) as {
        success: boolean;
        message?: string;
        data?: { url_boleto?: string };
      };
      if (!resultado.success) {
        res.status(400).json({
          success: false,
          message: resultado.message ?? 'Não foi possível gerar o boleto.'
        });
        return;
      }

      const urlBoleto = (resultado.data as { url_boleto?: string })?.url_boleto ?? null;
      if (!urlBoleto) {
        res.status(500).json({
          success: false,
          message: 'Boleto gerado mas URL não disponível.'
        });
        return;
      }

      sendSuccess(res, { url_boleto: urlBoleto });
    } catch (err) {
      sendError(res, err, 'Erro ao obter boleto', 500, true);
    }
  }

  /** Retorna PDF do boleto em atraso para impressão. Permitido quando bloqueado. */
  static async getPdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payload = req.user as { empresa_id?: number } | undefined;
      const empresaId = payload?.empresa_id;
      if (!empresaId) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const bloqueio = await getBloqueioAtrasoInfo(empresaId);
      if (!bloqueio.bloqueado || !bloqueio.titulo_id) {
        sendNotFound(res, 'Nenhuma fatura em atraso encontrada.');
        return;
      }

      sendNotFound(res, 'Título não encontrado');
      return;
    } catch (err) {
      sendError(res, err, 'Erro ao gerar PDF do boleto', 500, true);
    }
  }
}
