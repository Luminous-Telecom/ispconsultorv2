import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '../../../utils/logger';
import { parseDateFromDb, formatDate } from '../../../utils/dateUtils';
import { resolveImagePath, resolveArquivosPath } from '../../../utils/pathUtils';
import { TituloComRelacoes } from './types';
import type { JsonValue } from '../../../types/index';

/** Status da EFI/Asaas que significam título já recebido/liquidado. */
const STATUS_PAGO_BANCO = new Set([
  'paid',
  'settled',
  'received',
  'confirmed',
  'received_in_cash',
]);

/**
 * Extrai o status da cobrança a partir da resposta de consultarStatus.
 * EFI: status em resultado.status (mapeado) ou em data.data.status.
 * Asaas: status em resultado.status ou data.status.
 */
export function extrairStatusConsultaBanco(resultado: {
  status?: string;
  data?: Record<string, JsonValue | undefined> | null;
}): string | null {
  if (typeof resultado.status === 'string' && resultado.status.trim()) {
    return resultado.status.trim().toLowerCase();
  }

  const data = resultado.data;
  if (!data || typeof data !== 'object') {
    return null;
  }

  if (typeof data.status === 'string' && data.status.trim()) {
    return data.status.trim().toLowerCase();
  }

  const nested = data.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const nestedStatus = (nested as Record<string, JsonValue>).status;
    if (typeof nestedStatus === 'string' && nestedStatus.trim()) {
      return nestedStatus.trim().toLowerCase();
    }
  }

  return null;
}

export function isStatusPagoNoBanco(status: string | null | undefined): boolean {
  if (!status) return false;
  return STATUS_PAGO_BANCO.has(status.trim().toLowerCase());
}

/**
 * Valor pago na resposta do banco. EFI usa centavos em paid_value; Asaas usa reais em value/netValue.
 */
export function extrairValorPagoConsultaBanco(
  resultado: { data?: Record<string, JsonValue | undefined> | null },
  valorTitulo: number
): number {
  const data = resultado.data;
  if (!data || typeof data !== 'object') {
    return valorTitulo;
  }

  const charge =
    data.data && typeof data.data === 'object' && !Array.isArray(data.data)
      ? (data.data as Record<string, JsonValue>)
      : data;

  const paidValue = charge.paid_value;
  if (typeof paidValue === 'number' && Number.isFinite(paidValue)) {
    // EFI: paid_value em centavos (ex.: 10000 = R$ 100,00)
    return paidValue / 100;
  }

  const valorPago = charge.valor_pago;
  if (typeof valorPago === 'number' && Number.isFinite(valorPago)) {
    return valorPago;
  }

  const value = charge.value ?? charge.netValue ?? charge.net_value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return valorTitulo;
}

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

