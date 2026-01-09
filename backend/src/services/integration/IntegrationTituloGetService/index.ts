import { WhereOptions } from 'sequelize';
import crypto from 'crypto';
import { TituloService } from '../../financeiro/TituloService';
import { TituloPDFController } from '../../../controllers/titulos/TituloPDFController';
import { TituloComRelacoes } from '../../../controllers/titulos/TituloHelpers/types';
import { logger } from '../../../utils/logger';
import { formatDateISO } from '../../../utils/dateUtils';
import { getCurrentTimestamp } from '../../../utils/timezoneUtils';
import * as helpers from '../../../controllers/IntegrationWebhookController/helpers';

export interface IntegrationTituloPayload {
  tituloId?: number;
  numeroTitulo?: string;
  fields?: string[];
  format?: 'json' | 'pdf';
}

interface PdfCacheEntry {
  buffer: Buffer;
  filename: string;
  expiresAt: number;
}

// Cache compartilhado (será gerenciado pelo controller)
export const pdfCache = new Map<string, PdfCacheEntry>();

export interface TituloGetResult {
  timestamp: string;
  data: Record<string, unknown>;
}

export interface TituloGetPdfResult {
  timestamp: string;
  data: {
    id: number;
    numero_titulo: string;
    pdf_url: string;
    filename: string;
    expires_at: string;
  };
}

export class IntegrationTituloGetService {
  /**
   * Processa busca de título em formato JSON
   */
  static async processGetJson(
    payload: IntegrationTituloPayload
  ): Promise<TituloGetResult> {
    const where: WhereOptions = {};
    if (payload.tituloId) {
      where.id = payload.tituloId;
    } else if (payload.numeroTitulo) {
      where.numero_titulo = payload.numeroTitulo;
    }

    const titulos = await TituloService.findAllWithFilters(where, {
      attributes: [
        'id',
        'numero_titulo',
        'valor',
        'status',
        'data_vencimento',
        'qrcode',
        'linha_digitavel',
        'codigo_barras',
        'url_boleto'
      ],
      limit: 1
    });

    const titulo = titulos.length > 0 ? titulos[0] : null;

    if (!titulo) {
      throw new Error('Título não encontrado');
    }

    const tituloData = titulo.toJSON();

    // Se fields foi especificado, retornar apenas esses campos
    if (payload.fields && Array.isArray(payload.fields) && payload.fields.length > 0) {
      const filteredData: Record<string, unknown> = {
        id: tituloData.id,
        numero_titulo: tituloData.numero_titulo
      };

      for (const field of payload.fields) {
        const normalizedField = field.toLowerCase().trim();
        if (normalizedField === 'qrcode' || normalizedField === 'qrcode_pix') {
          filteredData.qrcode = tituloData.qrcode;
        } else if (normalizedField === 'linha_digitavel' || normalizedField === 'linha_digitável') {
          filteredData.linha_digitavel = tituloData.linha_digitavel;
        } else if (normalizedField === 'codigo_barras' || normalizedField === 'código_barras') {
          filteredData.codigo_barras = tituloData.codigo_barras;
        } else if (normalizedField === 'url_boleto') {
          filteredData.url_boleto = tituloData.url_boleto;
        } else if (normalizedField === 'valor') {
          filteredData.valor = tituloData.valor;
        } else if (normalizedField === 'status') {
          filteredData.status = tituloData.status;
        } else if (normalizedField === 'data_vencimento') {
          filteredData.data_vencimento = formatDateISO(tituloData.data_vencimento as string | Date | null | undefined);
        }
      }

      return {
        timestamp: getCurrentTimestamp(),
        data: filteredData
      };
    }

    // Retornar todos os campos disponíveis
    return {
      timestamp: getCurrentTimestamp(),
      data: {
        id: tituloData.id,
        numero_titulo: tituloData.numero_titulo,
        valor: helpers.parseNumber(tituloData.valor as string | number | null | undefined),
        status: tituloData.status,
        data_vencimento: formatDateISO(tituloData.data_vencimento as string | Date | null | undefined),
        qrcode: tituloData.qrcode,
        linha_digitavel: tituloData.linha_digitavel,
        codigo_barras: tituloData.codigo_barras,
        url_boleto: tituloData.url_boleto
      }
    };
  }

  /**
   * Processa busca de título em formato PDF
   */
  static async processGetPdf(
    payload: IntegrationTituloPayload
  ): Promise<TituloGetPdfResult> {
    const where: WhereOptions = {};
    if (payload.tituloId) {
      where.id = payload.tituloId;
    } else if (payload.numeroTitulo) {
      where.numero_titulo = payload.numeroTitulo;
    }

    // Buscar título por ID ou número
    let titulo = null;
    if (where.id) {
      titulo = await TituloService.getById(where.id as number);
    } else if (where.numero_titulo) {
      // Buscar por número de título
      const titulos = await TituloService.findAllWithFilters(
        { numero_titulo: where.numero_titulo as string },
        {
          include: [
            { association: 'cliente' },
            { association: 'plano' },
            { 
              association: 'banco',
              attributes: [
                'id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox',
                'url_retorno', 'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 'instrucao_linha_3', 
                'instrucao_linha_4', 'instrucao_linha_5', 'logo'
              ]
            }
          ],
          limit: 1
        }
      );
      titulo = titulos.length > 0 ? titulos[0] : null;
    }

    if (!titulo) {
      throw new Error('Título não encontrado');
    }

    const pdfBase64 = await TituloPDFController.gerarPdfBase64(titulo as unknown as TituloComRelacoes);

    if (!pdfBase64) {
      throw new Error('Erro ao gerar PDF do boleto');
    }

    // Converter base64 para Buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    
    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex');
    const filename = `boleto-${titulo.numero_titulo}.pdf`;
    
    // Armazenar em cache (expira em 1 hora)
    const expiresAt = Date.now() + (60 * 60 * 1000);
    pdfCache.set(token, {
      buffer: pdfBuffer,
      filename,
      expiresAt
    });

    // URL relativa para o PDF
    const pdfUrl = `/webhook/integration/pdf/${token}`;

    return {
      timestamp: getCurrentTimestamp(),
      data: {
        id: titulo.id,
        numero_titulo: titulo.numero_titulo,
        pdf_url: pdfUrl,
        filename,
        expires_at: new Date(expiresAt).toISOString()
      }
    };
  }

  /**
   * Processa busca de título (JSON ou PDF)
   */
  static async processGet(payload: IntegrationTituloPayload | undefined): Promise<TituloGetResult | TituloGetPdfResult> {
    if (!payload?.tituloId && !payload?.numeroTitulo) {
      throw new Error('É necessário informar tituloId ou numeroTitulo');
    }

    const format = payload.format || 'json';

    if (format === 'pdf') {
      return await this.processGetPdf(payload);
    }

    return await this.processGetJson(payload);
  }
}
