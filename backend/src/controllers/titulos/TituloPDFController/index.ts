import { Request, Response } from 'express';
import { Titulo } from '../../../models/financeiro/Titulo';
import { TituloService } from '../../../services/financeiro/TituloService';
import { TituloPDFService, BOLETO_PAGE_STYLES } from '../../../services/titulos/TituloPDFService';
import { logger } from '../../../utils/logger';
import { TituloComRelacoes } from '../TituloHelpers/types';
import { sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { isQueryFlagTrue, parseIdsFromQueryParam } from '../../../utils/listQuery';

export class TituloPDFController {

  public static async gerarPdfBase64(titulo: TituloComRelacoes | Titulo): Promise<string | null> {
    return TituloPDFService.gerarPdfBase64(titulo as TituloComRelacoes);
  }

  public static async imprimirBoleto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      let titulo = await TituloService.getById(id) as TituloComRelacoes | null;

      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      try {
        titulo = await TituloPDFService.registrarTituloNoBancoSeNecessario(titulo, { falharSeErro: true });
      } catch (error: unknown) {
        logger.error('Falha ao registrar título no banco', {
          titulo_id: titulo.id,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
        sendError(
          res,
          error,
          error instanceof Error ? error.message : 'Não foi possível registrar o título no banco',
          500,
          false,
          { error: 'ERRO_REGISTRO_BANCO' },
        );
        return;
      }

      const boletoHtml = await TituloPDFService.processarBoletoHtml(titulo);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Boleto - ${titulo.numero_titulo}</title>
  <style>${BOLETO_PAGE_STYLES}</style>
</head>
<body>
  ${boletoHtml}
</body>
</html>`);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'TituloPDFController',
        action: 'imprimir',
      });
    }
  }

  public static async imprimirBoletosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      const ids = parseIdsFromQueryParam(req.body.ids ?? req.query.ids);
      if (ids.length === 0) {
        sendValidationError(res, 'IDs dos títulos não fornecidos');
        return;
      }

      const titulos = await TituloService.findAllWithFilters(
        { id: ids },
        {
          include: [
            { association: 'cliente' },
            { association: 'plano' },
            { association: 'banco' },
          ],
        },
      );

      if (titulos.length === 0) {
        sendNotFound(res, 'Nenhum título encontrado');
        return;
      }

      const titulosOk = await TituloPDFService.prepararTitulosParaImpressao(
        titulos as unknown as TituloComRelacoes[],
      );

      if (titulosOk.length === 0) {
        sendNotFound(res, 'Nenhum boleto válido para imprimir');
        return;
      }

      const boletosHtml = await TituloPDFService.processarBoletosMultiplosHtml(titulosOk);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(TituloPDFService.montarPaginaHtmlBoletos(
        boletosHtml,
        titulosOk.length,
        isQueryFlagTrue(req.query, 'print'),
      ));
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao imprimir boletos múltiplos', 500, true);
    }
  }

  public static async gerarPdfBoletosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      const ids = parseIdsFromQueryParam(req.query.ids);
      if (ids.length === 0) {
        sendValidationError(res, 'IDs dos títulos não fornecidos');
        return;
      }

      const titulos = await TituloService.getByIds(ids);
      if (titulos.length === 0) {
        sendNotFound(res, 'Nenhum título encontrado');
        return;
      }

      const titulosOk = await TituloPDFService.prepararTitulosParaImpressao(
        titulos as unknown as TituloComRelacoes[],
      );

      if (titulosOk.length === 0) {
        sendValidationError(res, 'Nenhum boleto válido para gerar PDF. Verifique se os títulos têm cliente e banco associados.');
        return;
      }

      const pdfBuffer = await TituloPDFService.gerarPdfDeMultiplosBoletos(titulosOk);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="boletos-${titulosOk.length}-titulos.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: unknown) {
      if (!res.headersSent) {
        sendError(res, error, 'Erro interno do servidor ao gerar PDF de múltiplos boletos', 500, true, {
          context: 'TituloPDFController',
          action: 'gerarPdfBoletosMultiplos',
          ids: req.query.ids,
        });
      }
    }
  }
}
