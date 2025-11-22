/**
 * Opções de configuração para geração de PDF
 */
export interface PDFOptions {
  format?: 'A4' | 'Letter' | 'Legal' | 'a4' | 'letter' | 'legal';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
  landscape?: boolean;
}

/**
 * Opções para geração de PDF usando html-pdf-node
 */
export interface HtmlPdfNodeOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
}

/**
 * Opções para geração de PDF usando Puppeteer
 */
export interface PuppeteerPDFOptions {
  format?: 'A4' | 'Letter' | 'Legal' | 'a4' | 'letter' | 'legal';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
  landscape?: boolean;
}

/**
 * Tipo de engine para geração de PDF
 */
export type PDFEngine = 'puppeteer' | 'html-pdf-node';

