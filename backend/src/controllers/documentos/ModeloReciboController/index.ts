import { Request, Response } from 'express';
import { TituloService } from '../../../services/financeiro/TituloService';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { ModeloDocumentoService } from '../../../services/documentos/ModeloDocumentoService';
import { logger } from '../../../utils/logger';
import { VariaveisDocumentoService } from '../../../services/documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';
import type { TituloComRelacoes } from '../../titulos/TituloHelpers/types';
import { sendError, sendValidationError } from '../../../utils/responseUtils';

export class ModeloReciboController {

  /**
   * Imprimir recibos de múltiplos títulos pagos
   */
  static async imprimirRecibosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      const idsParam = req.query.ids as string;
      
      if (!idsParam) {
        sendValidationError(res, 'IDs dos títulos não fornecidos');
        return;
      }

      const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

      if (ids.length === 0) {
        sendValidationError(res, 'IDs dos títulos inválidos');
        return;
      }

      // Buscar títulos pagos com suas relações
      const titulos = await TituloService.getByIds(ids, ['pago', 'pago_atraso']);

      if (titulos.length === 0) {
        sendError(res, new Error('Nenhum título pago encontrado'), 'Nenhum título pago encontrado', 404, false);
        return;
      }

      const recibosHtml: string[] = [];

      for (const titulo of titulos) {
        try {
          const tituloComRelacoes = titulo as unknown as TituloComRelacoes;
          const cliente = tituloComRelacoes.cliente;

          if (!cliente) {
            logger.warn(`Título ${titulo.id} sem cliente associado`);
            continue;
          }

          // Buscar contrato do título
          const contrato = titulo.contrato_id 
            ? await ContratoService.getById(titulo.contrato_id)
            : null;

          if (!contrato || !contrato.modelo_documento_id) {
            logger.warn(`Título ${titulo.id}: Contrato não encontrado ou sem modelo de documento associado`);
            continue;
          }

          // Buscar modelo de documento do contrato
          const modeloDocumento = await ModeloDocumentoService.getById(contrato.modelo_documento_id);
          
          if (!modeloDocumento || !modeloDocumento.conteudo_recibo) {
            logger.warn(`Título ${titulo.id}: Modelo de documento não encontrado ou sem conteúdo de recibo configurado`);
            continue;
          }

          const conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
            modeloDocumento.conteudo_recibo,
            { cliente, contrato, titulo: tituloComRelacoes }
          );

          recibosHtml.push(`<div style="page-break-after: always;">${conteudoProcessado}</div>`);
        } catch (error) {
          logger.error(`Erro ao processar recibo para título ${titulo.id}:`, error);
        }
      }

      if (recibosHtml.length === 0) {
        sendError(res, new Error('Nenhum recibo pôde ser gerado'), 'Nenhum recibo pôde ser gerado', 500, false);
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            /* Estilos mínimos - apenas para garantir funcionamento básico do PDF */
            /* O conteúdo do editor será renderizado com seus próprios estilos inline */
            
            /* Evitar quebra de página dentro de imagens */
            img {
              page-break-inside: avoid;
            }
            
            /* Ocultar parágrafos vazios */
            p:empty {
              display: none;
            }
          </style>
        </head>
        <body>${recibosHtml.join('')}</body>
        </html>
      `;

      // Se for para imprimir diretamente, retornar HTML
      if (req.query.print === 'true') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(htmlContent);
        return;
      }

      // Caso contrário, gerar PDF
      const pdfBuffer = await PDFGenerationService.generateFromHtml(htmlContent, 'html-pdf-node', {
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        printBackground: true
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="recibos-pagamento.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      sendError(res, error, 'Erro ao gerar recibos', 500, true);
    }
  }
}
