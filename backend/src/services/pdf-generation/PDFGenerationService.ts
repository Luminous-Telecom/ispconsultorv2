import puppeteer from 'puppeteer';
import htmlPdf from 'html-pdf-node';
import { logger } from '../../utils/logger';
import { TemplateLoader } from './utils/TemplateLoader';
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
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

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

      return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF com Puppeteer:', error);
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
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: options.printBackground !== false
      };

      const file = { content: html };
      const pdfBuffer = await htmlPdf.generatePdf(file, pdfOptions);

      return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF com html-pdf-node:', error);
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
   * Gera PDF a partir de conteúdo usando template base
   */
  static async generateFromContent(
    content: string,
    engine: PDFEngine = 'html-pdf-node',
    options: PDFOptions = {},
    styleName: string = 'document'
  ): Promise<Buffer> {
    const styles = TemplateLoader.loadStyle(styleName);
    const html = TemplateLoader.renderTemplate('base', {
      styles,
      content
    });

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

