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

