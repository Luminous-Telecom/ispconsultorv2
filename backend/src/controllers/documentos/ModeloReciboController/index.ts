import { Request, Response } from 'express';
import { ModeloDocumento } from '../../../models/documentos/ModeloDocumento';
import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import { Plano } from '../../../models/cadastros/Plano';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Op } from 'sequelize';
import { logger } from '../../../utils/logger';
import { VariaveisDocumentoService } from '../../../services/documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';
import type { TituloComRelacoes } from '../../titulos/TituloHelpers/types';

export class ModeloReciboController {

  /**
   * Imprimir recibos de múltiplos títulos pagos
   */
  static async imprimirRecibosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      const idsParam = req.query.ids as string;
      
      if (!idsParam) {
        res.status(400).json({ success: false, message: 'IDs dos títulos não fornecidos' });
        return;
      }

      const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

      if (ids.length === 0) {
        res.status(400).json({ success: false, message: 'IDs dos títulos inválidos' });
        return;
      }

      // Buscar títulos pagos com suas relações
      const titulos = await Titulo.findAll({
        where: { 
          id: { [Op.in]: ids },
          status: { [Op.in]: ['pago', 'pago_atraso'] }
        },
        include: [
          { model: Cliente, as: 'cliente', required: false },
          { model: Plano, as: 'plano', required: false }
        ]
      });

      if (titulos.length === 0) {
        res.status(404).json({ success: false, message: 'Nenhum título pago encontrado' });
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
            ? await Contrato.findByPk(titulo.contrato_id, {
                include: [{ model: Plano, as: 'plano', required: false }]
              })
            : null;

          if (!contrato || !contrato.modelo_documento_id) {
            logger.warn(`Título ${titulo.id}: Contrato não encontrado ou sem modelo de documento associado`);
            continue;
          }

          // Buscar modelo de documento do contrato
          const modeloDocumento = await ModeloDocumento.findByPk(contrato.modelo_documento_id);
          
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
        res.status(500).json({ success: false, message: 'Nenhum recibo pôde ser gerado' });
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
      logger.error('Erro ao imprimir recibos múltiplos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar recibos'
      });
    }
  }
}
