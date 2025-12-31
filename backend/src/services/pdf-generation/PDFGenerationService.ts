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
    const startTime = Date.now();
    logger.info('Iniciando geração de PDF com Puppeteer', {
      context: 'PDFGenerationService',
      action: 'generateFromHtmlPuppeteer',
      htmlLength: html.length
    });

    let browser;
    try {
      logger.info('Lançando navegador Puppeteer', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlPuppeteer',
        htmlLength: html.length
      });

      const browserStartTime = Date.now();
      
      // Configuração do Puppeteer com timeout e opções para evitar travamentos
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

      logger.info('Opções de lançamento do Puppeteer', {
        context: 'PDFGenerationService',
        args: launchOptions.args,
        timeout: launchOptions.timeout
      });

      logger.info('Chamando puppeteer.launch()...', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlPuppeteer'
      });

      browser = await puppeteer.launch(launchOptions);
      
      logger.info('puppeteer.launch() concluído', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlPuppeteer'
      });

      const browserDuration = Date.now() - browserStartTime;
      logger.debug('Navegador Puppeteer lançado', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlPuppeteer',
        duration: `${browserDuration}ms`
      });

      logger.debug('Criando nova página', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlPuppeteer'
      });

      const page = await browser.newPage();
      
      logger.info('Definindo conteúdo HTML na página', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlPuppeteer',
        htmlLength: html.length
      });

      const contentStartTime = Date.now();
      // Usar 'load' ao invés de 'networkidle0' para ser mais rápido e evitar timeout
      // 'networkidle0' espera 500ms sem requisições de rede, o que pode demorar muito
      // Timeout aumentado para 60 segundos para ambientes mais lentos (WSL2, etc)
      await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
      const contentDuration = Date.now() - contentStartTime;
      
      logger.debug('Conteúdo HTML carregado na página', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlPuppeteer',
        duration: `${contentDuration}ms`
      });

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

      logger.debug('Gerando PDF da página', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlPuppeteer',
        options: pdfOptions
      });

      const pdfStartTime = Date.now();
      const pdfBuffer = await page.pdf(pdfOptions);
      const pdfDuration = Date.now() - pdfStartTime;
      
      logger.debug('PDF gerado pela página', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlPuppeteer',
        pdfSize: pdfBuffer.length,
        duration: `${pdfDuration}ms`
      });

      logger.debug('Fechando navegador', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlPuppeteer'
      });

      await browser.close();

      const totalDuration = Date.now() - startTime;
      logger.info('PDF gerado com sucesso usando Puppeteer', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlPuppeteer',
        pdfSize: pdfBuffer.length,
        totalDuration: `${totalDuration}ms`
      });

      return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Erro ao gerar PDF com Puppeteer', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlPuppeteer',
        error: errorMessage,
        errorStack,
        errorName: error instanceof Error ? error.name : 'Unknown',
        duration: `${Date.now() - startTime}ms`
      });

      // Garantir que o navegador seja fechado mesmo em caso de erro
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          logger.warn('Erro ao fechar navegador após erro', {
            context: 'PDFGenerationService',
            error: closeError instanceof Error ? closeError.message : 'Erro desconhecido'
          });
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
    const startTime = Date.now();
    logger.info('Iniciando geração de PDF com html-pdf-node', {
      context: 'PDFGenerationService',
      action: 'generateFromHtmlNode',
      htmlLength: html.length
    });

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

      logger.debug('Opções do PDF', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlNode',
        options: pdfOptions
      });

      const file = { content: html };
      
      logger.info('Chamando htmlPdf.generatePdf...', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlNode',
        htmlLength: html.length
      });

      const generateStartTime = Date.now();
      const pdfBuffer = await htmlPdf.generatePdf(file, pdfOptions);
      const generateDuration = Date.now() - generateStartTime;

      logger.info('htmlPdf.generatePdf concluído', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlNode',
        pdfSize: pdfBuffer.length,
        generateDuration: `${generateDuration}ms`,
        totalDuration: `${Date.now() - startTime}ms`
      });

      return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Erro ao gerar PDF com html-pdf-node', {
        context: 'PDFGenerationService',
        action: 'generateFromHtmlNode',
        error: errorMessage,
        errorStack,
        errorName: error instanceof Error ? error.name : 'Unknown',
        duration: `${Date.now() - startTime}ms`
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

