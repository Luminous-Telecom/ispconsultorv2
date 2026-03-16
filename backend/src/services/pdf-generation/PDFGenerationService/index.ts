import htmlPdf from 'html-pdf-node';
import { logger } from '../../../utils/logger';
import { PDFOptions, HtmlPdfNodeOptions } from '../types';

/**
 * Serviço centralizado para geração de PDFs (usa apenas html-pdf-node)
 */
export class PDFGenerationService {
  /**
   * Gera PDF a partir de HTML usando html-pdf-node
   */
  static async generateFromHtmlNode(
    html: string,
    options: HtmlPdfNodeOptions = {}
  ): Promise<Buffer> {
    try {
      const pdfOptions: HtmlPdfNodeOptions = {
        format: options.format || 'A4',
        margin: options.margin || {
          top: '0.5cm',
          right: '0.5cm',
          bottom: '0.5cm',
          left: '0.5cm'
        },
        printBackground: options.printBackground !== false
      };

      const file = { content: html };
      
      // html-pdf-node usa callback, então precisamos promisificar
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        htmlPdf.generatePdf(file, pdfOptions, (err: Error | null, buffer: Buffer) => {
          if (err) {
            reject(err);
          } else {
            resolve(buffer);
          }
        });
      });

      return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Erro ao gerar PDF com html-pdf-node', {
        error: errorMessage,
        errorStack,
        errorName: error instanceof Error ? error.name : 'Unknown'
      });
      throw error;
    }
  }

  /**
   * Gera PDF a partir de conteúdo HTML
   */
  static async generateFromHtml(
    html: string,
    options: PDFOptions = {}
  ): Promise<Buffer> {
    return this.generateFromHtmlNode(html, options as HtmlPdfNodeOptions);
  }

  /**
   * Gera PDF a partir de conteúdo
   */
  static async generateFromContent(
    content: string,
    options: PDFOptions = {},
    styleName = 'document'
  ): Promise<Buffer> {
    // Garantir que imagens e recursos relativos funcionem no PDF
    const baseHref = process.env.APP_URL || process.env.BASE_URL || '';
    const normalizedBase = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;

    // Gerar HTML diretamente sem template - conteúdo do editor já vem formatado
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        ${baseHref ? `<base href="${normalizedBase}">` : ''}
      </head>
      <body>
        <div>${content}</div>
      </body>
      </html>
    `;

    return this.generateFromHtml(html, options);
  }

  /**
   * Gera PDF em base64 a partir de conteúdo
   */
  static async generateBase64(
    content: string,
    options: PDFOptions = {},
    styleName = 'document'
  ): Promise<string> {
    const pdfBuffer = await this.generateFromContent(content, options, styleName);
    return pdfBuffer.toString('base64');
  }

  /**
   * Gera PDF em base64 a partir de HTML
   */
  static async generateBase64FromHtml(
    html: string,
    options: PDFOptions = {}
  ): Promise<string> {
    const pdfBuffer = await this.generateFromHtml(html, options);
    return pdfBuffer.toString('base64');
  }
}

