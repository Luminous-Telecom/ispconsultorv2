import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '../../utils/logger';
import { parseDateFromDb, formatDate } from '../../utils/dateUtils';
import { TituloComRelacoes } from './types';

/**
 * Converte logo para base64
 */
export function converterLogoParaBase64(logo: string): string {
  if (!logo || logo.startsWith('data:image/')) {
    return logo || '';
  }
  
  try {
    // Lógica de conversão para base64 (mantida a original)
    // Se for URL absoluta, extrair pathname; caso contrário, usar como está
    let cleanPath = logo;
    if (logo.startsWith('http://') || logo.startsWith('https://')) {
      try {
        cleanPath = new URL(logo).pathname;
      } catch {
        // Se falhar ao criar URL, usar logo original
        cleanPath = logo;
      }
    }
    const fileName = cleanPath.split('/').pop() || '';
    
    if (fileName.includes('efi.png')) return getLogoBancoPadrao('efi');
    if (fileName.includes('asaas.png')) return getLogoBancoPadrao('asaas');
    if (fileName.includes('boletoproprio.png')) return getLogoBancoPadrao('bancario');
    
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    
    const imagePath = path.join(process.cwd(), cleanPath);
    
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : 'image/png';
      return `data:${mimeType};base64,${base64Image}`;
    }
  } catch (error) {
    logger.warn('Erro ao converter logo para base64', { logo, error });
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
    const imagesPath = path.join(__dirname, '../../images/bancos');
    const imagePath = fs.existsSync(imagesPath) ? path.join(imagesPath, fileName) : path.join(process.cwd(), 'images/bancos', fileName);

    console.log('DEBUG LOGO BOLETO - Tentando carregar logo:', {
      tipoBanco,
      fileName,
      __dirname,
      processCwd: process.cwd(),
      imagesPath,
      imagesPathExists: fs.existsSync(imagesPath),
      imagePath,
      imagePathExists: fs.existsSync(imagePath)
    });

    logger.error('DEBUG LOGO BOLETO - Tentando carregar logo', {
      tipoBanco,
      fileName,
      __dirname,
      processCwd: process.cwd(),
      imagesPath,
      imagesPathExists: fs.existsSync(imagesPath),
      imagePath,
      imagePathExists: fs.existsSync(imagePath)
    });
    
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

      console.log('DEBUG LOGO BOLETO - Logo carregada com sucesso:', {
        tipoBanco,
        fileName,
        imagePath,
        imageSize: imageBuffer.length
      });

      logger.error('DEBUG LOGO BOLETO - Logo carregada com sucesso', {
        tipoBanco,
        fileName,
        imagePath,
        imageSize: imageBuffer.length
      });

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
export function gerarLinkPagamentoPublico(tituloId: number, baseUrl?: string): string {
  const secret = process.env.JWT_SECRET || 'default-secret';
  const token = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
  
  // URL do frontend detectada automaticamente da requisição ou padrão relativo
  // Em produção, será a mesma origem (Nginx serve frontend e backend)
  return `/pagamento/${tituloId}/${token}`;
}

