import puppeteer from 'puppeteer';
import htmlPdf from 'html-pdf-node';
import { logger } from '../../utils/logger';
import { PDFEngine, PDFOptions, HtmlPdfNodeOptions, PuppeteerPDFOptions } from './types';

/**
 * Serviço centralizado para geração de PDFs
 */
export class PDFGenerationService {
  /**
   * Gera PDF a partir de HTML usando Puppeteer
   */
  static async generateFromHtmlPuppeteer(
    html: string,
    options: PuppeteerPDFOptions = {}
  ): Promise<Buffer> {
    let browser;
    try {
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions'
        ],
        timeout: 30000 // 30 segundos de timeout para lançar o navegador
      };

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: 60000 });

      const pdfOptions: PuppeteerPDFOptions = {
        format: options.format || 'a4',
        printBackground: options.printBackground !== false,
        margin: options.margin || {
          top: '0.5cm',
          right: '0.5cm',
          bottom: '0.5cm',
          left: '0.5cm'
        },
        landscape: options.landscape || false
      };

      const pdfBuffer = await page.pdf(pdfOptions);
      await browser.close();
      logger.info('PDF gerado com Puppeteer', { pdfSize: pdfBuffer.length });

      return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Erro ao gerar PDF com Puppeteer', {
        error: errorMessage,
        errorStack,
        errorName: error instanceof Error ? error.name : 'Unknown'
      });

      // Garantir que o navegador seja fechado mesmo em caso de erro
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          logger.warn('Erro ao fechar navegador após erro', { error: closeError instanceof Error ? closeError.message : 'Erro desconhecido' });
        }
      }

      throw error;
    }
  }

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
      const pdfBuffer = await htmlPdf.generatePdf(file, pdfOptions);
      logger.info('PDF gerado com html-pdf-node', { pdfSize: pdfBuffer.length });

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
   * Gera PDF a partir de conteúdo HTML usando engine especificado
   */
  static async generateFromHtml(
    html: string,
    engine: PDFEngine = 'html-pdf-node',
    options: PDFOptions = {}
  ): Promise<Buffer> {
    if (engine === 'puppeteer') {
      return this.generateFromHtmlPuppeteer(html, options as PuppeteerPDFOptions);
    }

    return this.generateFromHtmlNode(html, options as HtmlPdfNodeOptions);
  }

  /**
   * Gera PDF a partir de conteúdo
   */
  static async generateFromContent(
    content: string,
    engine: PDFEngine = 'html-pdf-node',
    options: PDFOptions = {},
    styleName: string = 'document'
  ): Promise<Buffer> {
    // Gerar HTML diretamente sem template - conteúdo do editor já vem formatado
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body>
        <div>${content}</div>
      </body>
      </html>
    `;

    return this.generateFromHtml(html, engine, options);
  }

  /**
   * Gera PDF em base64 a partir de conteúdo
   */
  static async generateBase64(
    content: string,
    engine: PDFEngine = 'html-pdf-node',
    options: PDFOptions = {},
    styleName: string = 'document'
  ): Promise<string> {
    const pdfBuffer = await this.generateFromContent(content, engine, options, styleName);
    return pdfBuffer.toString('base64');
  }

  /**
   * Gera PDF em base64 a partir de HTML
   */
  static async generateBase64FromHtml(
    html: string,
    engine: PDFEngine = 'html-pdf-node',
    options: PDFOptions = {}
  ): Promise<string> {
    const pdfBuffer = await this.generateFromHtml(html, engine, options);
    return pdfBuffer.toString('base64');
  }
}

