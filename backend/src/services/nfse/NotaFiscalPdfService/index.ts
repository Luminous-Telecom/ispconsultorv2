import { NotaFiscal } from '../../../models/nfse/NotaFiscal';
import { Cliente } from '../../../models/clientes/Cliente';
import { logger } from '../../../utils/logger';
import { PDFGenerationService } from '../../pdf-generation/PDFGenerationService';
import { NotaFiscalHtmlService } from '../NotaFiscalHtmlService';

export class NotaFiscalPdfService {
  /**
   * Gera PDF da NFS-e a partir dos dados do banco
   */
  static async gerarPdfNfse(
    notaFiscal: NotaFiscal & { cliente?: Cliente | null }
  ): Promise<Buffer> {
    try {
      logger.info('Iniciando geração de PDF da NFS-e', {
        nota_id: notaFiscal.id
      });

      const html = await NotaFiscalHtmlService.processarNfseHtml(notaFiscal);

      logger.debug('HTML processado para PDF', {
        nota_id: notaFiscal.id,
        htmlLength: html.length,
        hasLogoInHtml: html.includes('data:image/svg+xml;base64,'),
        hasImgTag: html.includes('<img'),
        logoImgTags: (html.match(/<img[^>]*src="[^"]*data:image\/svg\+xml;base64,[^"]*"[^>]*>/g) || []).length
      });

      const pdfBuffer = await PDFGenerationService.generateFromHtml(html, 'html-pdf-node', {
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        printBackground: true
      });

      logger.info('PDF gerado com sucesso', {
        nota_id: notaFiscal.id,
        pdfSize: pdfBuffer.length
      });

      return pdfBuffer;
    } catch (error) {
      logger.error('Erro ao gerar PDF da NFS-e', {
        nota_id: notaFiscal.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Obtém buffer PDF de uma nota fiscal
   */
  static async getPdfBuffer(notaFiscal: NotaFiscal): Promise<Buffer | null> {
    try {
      const notaCompleta = await NotaFiscal.findByPk(notaFiscal.id, {
        include: [{ association: 'cliente' }]
      }) as (NotaFiscal & { cliente?: Cliente | null }) | null;

      if (!notaCompleta) {
        return null;
      }

      return await this.gerarPdfNfse(notaCompleta);
    } catch (error) {
      logger.error('Erro ao gerar PDF da NFS-e', {
        nota_id: notaFiscal.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    }
  }
}
