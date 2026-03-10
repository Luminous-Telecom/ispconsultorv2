import { Response } from 'express';
import type { AuthenticatedRequest } from '../../../types/auth';
import { getBloqueioAtrasoInfo } from '../../../services/saas/BloqueioAtrasoService';
import { SaasTituloBoletoService } from '../../../services/saas/SaasTituloBoletoService';
import { TituloPDFService } from '../../../services/titulos/TituloPDFService';
import { SaasTitulo } from '../../../models/saas/SaasTitulo';
import { SaasDadosEmpresa } from '../../../models/saas/SaasDadosEmpresa';
import { SaasPlano } from '../../../models/saas/SaasPlano';
import { SaasBanco } from '../../../models/saas/SaasBanco';
import { saasTituloToTituloComRelacoes } from '../../titulos/TituloHelpers/saasTituloToTituloComRelacoes';
import { sendSuccess, sendError, sendNotFound } from '../../../utils/responseUtils';

const tituloIncludes = [
  { model: SaasDadosEmpresa, as: 'empresa', attributes: ['id', 'razao_social', 'nome_empresa', 'nome_fantasia', 'cnpj', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'] },
  { model: SaasPlano, as: 'plano', attributes: ['id', 'nome', 'valor_mensal'] },
  { model: SaasBanco, as: 'banco', attributes: ['id', 'nome', 'banco', 'tipo_banco', 'codigo', 'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 'instrucao_linha_3', 'instrucao_linha_4', 'instrucao_linha_5'] },
];

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

      const resultado = await SaasTituloBoletoService.gerarBoleto(bloqueio.titulo_id);
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

      const st = await SaasTitulo.findByPk(bloqueio.titulo_id, { include: tituloIncludes });
      if (!st) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      const stTyped = st as SaasTitulo & { banco?: SaasBanco | null; empresa?: SaasDadosEmpresa | null; plano?: SaasPlano | null };
      if (stTyped.empresa_id !== empresaId) {
        res.status(403).json({ success: false, message: 'Título não pertence a esta empresa' });
        return;
      }

      if (stTyped.status === 'cancelado' || stTyped.pago) {
        res.status(400).json({ success: false, message: 'Esta fatura já foi paga ou cancelada.' });
        return;
      }

      if (!stTyped.charge_id) {
        const resultado = await SaasTituloBoletoService.gerarBoleto(stTyped.id);
        if (!resultado.success) {
          res.status(400).json({ success: false, message: resultado.message ?? 'Não foi possível gerar o boleto.' });
          return;
        }
      }
      const tituloAtualizado = await SaasTitulo.findByPk(stTyped.id, { include: tituloIncludes });
      if (!tituloAtualizado) {
        sendError(res, new Error('Erro ao carregar título'), 'Erro ao gerar PDF', 500, true);
        return;
      }
      const tituloComRelacoes = saasTituloToTituloComRelacoes(tituloAtualizado);
      const pdfBuffer = await TituloPDFService.gerarPdfDeMultiplosBoletos([tituloComRelacoes]);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="boleto-atraso.pdf"');
      res.setHeader('Content-Length', String(pdfBuffer.length));
      res.send(pdfBuffer);
    } catch (err) {
      sendError(res, err, 'Erro ao gerar PDF do boleto', 500, true);
    }
  }
}
