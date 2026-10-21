import puppeteer, { type PDFOptions as PuppeteerPdfOptions, type PaperFormat } from 'puppeteer';
import { logger } from '../../../utils/logger';
import { inlineArquivosImages } from '../inlineArquivosImages';
import { PDFOptions, HtmlPdfNodeOptions } from '../types';

const DEFAULT_MARGIN = {
  top: '0.5cm',
  right: '0.5cm',
  bottom: '0.5cm',
  left: '0.5cm',
};

function toPuppeteerPdfOptions(options: HtmlPdfNodeOptions & PDFOptions): PuppeteerPdfOptions {
  const format = (options.format?.toUpperCase() || 'A4') as PaperFormat;
  return {
    format,
    landscape: options.landscape === true,
    margin: options.margin || DEFAULT_MARGIN,
    printBackground: options.printBackground !== false,
  };
}

/**
 * Serviço centralizado para geração de PDFs (Puppeteer headless).
 */
export class PDFGenerationService {
  /**
   * Gera PDF a partir de HTML.
   */
  static async generateFromHtmlNode(
    html: string,
    options: HtmlPdfNodeOptions = {}
  ): Promise<Buffer> {
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        if (url.startsWith('data:') || url.startsWith('about:')) {
          request.continue().catch(() => undefined);
          return;
        }
        request.abort().catch(() => undefined);
      });
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const pdfBuffer = await page.pdf(toPuppeteerPdfOptions(options));
      return Buffer.from(pdfBuffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Erro ao gerar PDF com Puppeteer', {
        error: errorMessage,
        errorStack,
        errorName: error instanceof Error ? error.name : 'Unknown',
      });
      throw error;
    } finally {
      await browser?.close().catch(() => undefined);
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
    _styleName = 'document'
  ): Promise<Buffer> {
    const baseHref = process.env.APP_URL || process.env.BASE_URL || '';
    const normalizedBase = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        ${baseHref ? `<base href="${normalizedBase}">` : ''}
      </head>
      <body style="margin:0;padding:0;width:100%;">
        <div style="width:100%;max-width:100%;box-sizing:border-box;">${inlineArquivosImages(content)}</div>
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
