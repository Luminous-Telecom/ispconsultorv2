import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../../utils/logger';
import { resolveArquivosPath } from '../../../utils/pathUtils';

/**
 * Cache para logo da empresa (evita conversões repetidas)
 */
interface LogoCache {
  url: string;
  base64: string;
}

/**
 * Classe utilitária para conversão de imagens
 */
export class ImageConverter {
  private static logoCache: LogoCache | null = null;

  /**
   * Converte imagem (URL ou caminho local) para base64
   */
  static async converterParaBase64(logoUrl: string): Promise<string> {
    if (this.logoCache && this.logoCache.url === logoUrl) {
      return this.logoCache.base64;
    }

    try {
      const base64Result = await this.processarImagem(logoUrl);
      
      if (base64Result) {
        this.logoCache = { url: logoUrl, base64: base64Result };
        return base64Result;
      }
    } catch (error) {
      this.logarErroConversao(error);
    }

    return '';
  }

  /**
   * Processa imagem de URL ou arquivo local
   */
  private static async processarImagem(logoUrl: string): Promise<string> {
    if (this.isUrl(logoUrl)) {
      return await this.converterUrlParaBase64(logoUrl);
    }

    return this.converterArquivoParaBase64(logoUrl);
  }

  /**
   * Verifica se é uma URL
   */
  private static isUrl(logoUrl: string): boolean {
    return logoUrl.startsWith('http://') || logoUrl.startsWith('https://');
  }

  /**
   * Converte URL para base64
   */
  private static async converterUrlParaBase64(logoUrl: string): Promise<string> {
    const response = await axios.get(logoUrl, {
      responseType: 'arraybuffer',
      timeout: 5000
    });

    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const contentType = response.headers['content-type'] || 'image/png';
    
    return `data:${contentType};base64,${base64}`;
  }

  /**
   * Converte arquivo local para base64
   */
  private static converterArquivoParaBase64(logoUrl: string): string {
    let absolutePath: string;
    
    if (path.isAbsolute(logoUrl)) {
      absolutePath = logoUrl;
    } else {
      // Se começar com /arquivos/, usar resolveArquivosPath
      if (logoUrl.startsWith('/arquivos/') || logoUrl.startsWith('arquivos/')) {
        const cleanPath = logoUrl.startsWith('/') ? logoUrl.substring(1) : logoUrl;
        const pathParts = cleanPath.startsWith('arquivos/') 
          ? cleanPath.substring('arquivos/'.length).split('/')
          : cleanPath.split('/');
        absolutePath = resolveArquivosPath(...pathParts);
      } else {
        // Para outros caminhos, usar process.cwd()
        absolutePath = path.join(process.cwd(), logoUrl);
      }
    }

    if (!fs.existsSync(absolutePath)) {
      return '';
    }

    const imageBuffer = fs.readFileSync(absolutePath);
    const base64 = imageBuffer.toString('base64');
    const contentType = this.obterContentType(absolutePath);

    return `data:${contentType};base64,${base64}`;
  }

  /**
   * Obtém content type baseado na extensão do arquivo
   */
  private static obterContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp'
    };

    return mimeTypes[ext] || 'image/png';
  }

  /**
   * Loga erros de conversão
   */
  private static logarErroConversao(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('Erro ao converter logo para base64', {
      context: 'ImageConverter',
      action: 'converterParaBase64',
      error: errorMessage,
      stack: errorStack
    });
  }
}

