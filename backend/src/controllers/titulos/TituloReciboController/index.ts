import { Request, Response } from 'express';
import { TituloService } from '../../../services/financeiro/TituloService';
import { ReciboPDFService } from '../../../services/titulos/ReciboPDFService';
import { RECIBO_MODELO_NAO_CONFIGURADO } from '../../../services/titulos/ReciboPDFService/messages';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';
import { logger } from '../../../utils/logger';
import { TituloComRelacoes } from '../TituloHelpers/types';
import { sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { isQueryFlagTrue, parseIdsFromQueryParam } from '../../../utils/listQuery';
import { FONT_FAMILY_BASE } from '../../../constants/typography';

export class TituloReciboController {
  /**
   * Imprime múltiplos recibos (HTML com print=true ou PDF).
   */
  public static async imprimirRecibosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      const ids = parseIdsFromQueryParam(req.body.ids ?? req.query.ids);

      if (ids.length === 0) {
        sendValidationError(res, 'IDs dos títulos não fornecidos');
        return;
      }

      const titulos = await TituloService.getByIds(ids);
      if (titulos.length === 0) {
        sendNotFound(res, 'Nenhum título encontrado');
        return;
      }

      const titulosPagos = titulos.filter(
        (titulo) => titulo.status === 'pago' || titulo.status === 'pago_atraso'
      );

      if (titulosPagos.length === 0) {
        sendValidationError(res, 'Nenhum título pago encontrado. Recibo só pode ser gerado para títulos pagos.');
        return;
      }

      const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined;
      const recibosHtml: string[] = [];
      const errosDetalhados: Array<{ titulo_id: number; motivo: string }> = [];

      for (const titulo of titulosPagos) {
        try {
          const tituloComRelacoes = titulo as unknown as TituloComRelacoes;

          if (!tituloComRelacoes.cliente) {
            errosDetalhados.push({ titulo_id: titulo.id, motivo: 'Título sem cliente associado' });
            continue;
          }

          const conteudo = await ReciboPDFService.gerarReciboConteudo({
            titulo,
            cliente: tituloComRelacoes.cliente,
            contrato: tituloComRelacoes.contrato,
            baseUrl,
          });

          if (!conteudo || conteudo.trim().length === 0) {
            errosDetalhados.push({
              titulo_id: titulo.id,
              motivo: RECIBO_MODELO_NAO_CONFIGURADO,
            });
            continue;
          }

          recibosHtml.push(`<div class="recibo-page">${conteudo}</div>`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error('Erro ao processar recibo para impressão múltipla', {
            titulo_id: titulo.id,
            error: errorMessage,
          });
          errosDetalhados.push({ titulo_id: titulo.id, motivo: errorMessage });
        }
      }

      if (recibosHtml.length === 0) {
        sendValidationError(
          res,
          'Não foi possível gerar nenhum recibo. Configure a aba Recibos em Cadastros → Modelos de Documentos → Contratos.',
          {
            erros: [JSON.stringify(errosDetalhados)],
          }
        );
        return;
      }

      const autoPrint = isQueryFlagTrue(req.query, 'print');
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Recibos - ${recibosHtml.length} título(s)</title>
          <style>
            @media print { .recibo-page { page-break-after: always; } }
            body { margin: 0; padding: 0; font-family: ${FONT_FAMILY_BASE}; }
            ${ReciboPDFService.getReciboFallbackStyles()}
          </style>
          ${autoPrint ? '<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>' : ''}
        </head>
        <body>
          ${recibosHtml.join('\n')}
        </body>
        </html>
      `;

      if (autoPrint) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(template);
        return;
      }

      const pdfBuffer = await PDFGenerationService.generateFromHtml(template, {
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        printBackground: true,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="recibos-${recibosHtml.length}-titulos.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: unknown) {
      if (!res.headersSent) {
        sendError(res, error, 'Erro ao gerar recibos', 500, true, {
          context: 'TituloReciboController',
          action: 'imprimirRecibosMultiplos',
          ids: req.query.ids,
        });
      }
    }
  }
}
