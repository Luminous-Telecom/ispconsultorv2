declare module 'html-pdf-node' {
  export interface FileOptions {
    content: string;
    url?: string;
  }

  export interface PdfOptions {
    format?: 'Letter' | 'Legal' | 'Tabloid' | 'Ledger' | 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6';
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    printBackground?: boolean;
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
    landscape?: boolean;
    scale?: number;
    width?: string;
    height?: string;
    preferCSSPageSize?: boolean;
  }

  export function generatePdf(file: FileOptions, options?: PdfOptions): Promise<Buffer>;

  const htmlPdf: {
    generatePdf: typeof generatePdf;
  };

  export default htmlPdf;
}

