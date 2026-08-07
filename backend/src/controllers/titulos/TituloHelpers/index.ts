import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '../../../utils/logger';
import { parseDateFromDb, formatDate } from '../../../utils/dateUtils';
import { resolveImagePath, resolveArquivosPath } from '../../../utils/pathUtils';
import { TituloComRelacoes } from './types';

/**
 * Converte logo para base64
 */
export function converterLogoParaBase64(logo: string): string {
  if (!logo || logo.startsWith('data:image/')) {
    return logo || '';
  }
  
  try {
    let cleanPath = logo;
    if (logo.startsWith('http://') || logo.startsWith('https://')) {
      try {
        cleanPath = new URL(logo).pathname;
      } catch {
        cleanPath = logo;
      }
    }
    const fileName = cleanPath.split('/').pop() || '';
    
    if (fileName.includes('efi.png')) {
      return getLogoBancoPadrao('efi');
    }
    if (fileName.includes('asaas.png')) {
      return getLogoBancoPadrao('asaas');
    }
    if (fileName.includes('boletoproprio.png')) {
      return getLogoBancoPadrao('bancario');
    }
    
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    
    let imagePath: string;
    if (path.isAbsolute(cleanPath)) {
      imagePath = cleanPath;
    } else {
      if (cleanPath.startsWith('arquivos/')) {
        const pathParts = cleanPath.substring('arquivos/'.length).split('/');
        imagePath = resolveArquivosPath(...pathParts);
      } else {
        const pathParts = cleanPath.split('/');
        if (pathParts[0] === 'arquivos' && pathParts[1] === 'images') {
          imagePath = resolveImagePath(...pathParts.slice(2));
        } else if (pathParts[0] === 'images') {
          imagePath = resolveImagePath(...pathParts.slice(1));
        } else {
          imagePath = path.join(process.cwd(), cleanPath);
        }
      }
    }
    
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : 'image/png';
      return `data:${mimeType};base64,${base64Image}`;
    }
  } catch (error) {
    logger.error('Erro ao converter logo para base64', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
  
  return logo;
}

/**
 * Obtém logo padrão do banco
 */
export function getLogoBancoPadrao(tipoBanco: string): string {
  try {
    const logosPadrao: Record<string, string> = {
      'efi': 'efi.png',
      'asaas': 'asaas.png',
      'bancario': 'boletoproprio.png',
      'outros': 'boletoproprio.png'
    };
    
    const fileName = logosPadrao[tipoBanco] || logosPadrao['outros'];
    
    // Usar resolveArquivosPath que funciona corretamente em dev e produção
    const imagePath = resolveArquivosPath('images', 'bancos', fileName);
    
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

      return `data:${mimeType};base64,${base64Image}`;
    }
    
    return '';
  } catch (error) {
    logger.error('Erro ao carregar logo do banco', { error, tipoBanco });
    return '';
  }
}

/**
 * Processa instruções do boleto substituindo variáveis
 */
export function processarInstrucao(instrucao: string, titulo: TituloComRelacoes): string {
  if (!instrucao) return '';
  
  return instrucao
    .replace(/%quantidade_usuarios%/g, String(titulo.plano?.quantidade_usuarios || '1'))
    .replace(/%tipo_servico%/g, titulo.plano?.tipo_servico || '')
    .replace(/%nome_plano%/g, titulo.plano?.nome_plano || 'Plano')
    .replace(/%valor_plano%/g, Number(titulo.plano?.valor_mensal || 0).toFixed(2).replace('.', ','))
    .replace(/%cliente_nome%/g, titulo.cliente?.razao_social || '')
    .replace(/%cliente_cnpj%/g, titulo.cliente?.cnpj || '')
    .replace(/%data_vencimento%/g, formatDate(parseDateFromDb(titulo.data_vencimento)) || '')
    .replace(/%valor_boleto%/g, Number(titulo.valor).toFixed(2).replace('.', ','));
}

/**
 * Gera link público de pagamento
 */
export function gerarTokenPagamentoPublico(tituloId: number): string {
  const secret = process.env.JWT_SECRET || 'default-secret';
  return crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
}

export function gerarLinkPagamentoPublico(tituloId: number, _baseUrl?: string): string {
  const token = gerarTokenPagamentoPublico(tituloId);
  return `/pagamento/${tituloId}/${token}`;
}

/**
 * URL pública HTTPS do PDF do boleto (WhatsApp Cloud header document link).
 * Requer BASE_URL ou APP_URL apontando para o servidor acessível pela Meta.
 */
export function gerarLinkPdfPublico(tituloId: number): string | null {
  const base = (process.env.BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
  if (!base) return null;
  const token = gerarTokenPagamentoPublico(tituloId);
  return `${base}/api/pagamento/${tituloId}/${token}/pdf`;
}

