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
    const html = await NotaFiscalHtmlService.processarNfseHtml(notaFiscal);
    return PDFGenerationService.generateFromHtml(html, 'html-pdf-node', {
      format: 'A4',
      margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
      printBackground: true
    });
  }

  /**
   * Obtém buffer PDF de uma nota fiscal
   */
  static async getPdfBuffer(notaFiscal: NotaFiscal): Promise<Buffer | null> {
    try {
      const notaCompleta = await NotaFiscal.findByPk(notaFiscal.id, {
        include: [{ model: Cliente, as: 'cliente' }]
      }) as (NotaFiscal & { cliente?: Cliente | null }) | null;

      if (!notaCompleta || !notaCompleta.cliente) {
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
