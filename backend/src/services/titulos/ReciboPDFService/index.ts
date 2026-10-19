import { logger } from '../../../utils/logger';
import { ModeloDocumentoService } from '../../documentos/ModeloDocumentoService';
import { VariaveisDocumentoService, type DadosVariaveis } from '../../documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../pdf-generation/PDFGenerationService';
import { ContratoService } from '../../contratos/ContratoService';
import { RECIBO_MODELO_NAO_CONFIGURADO } from './messages';

export { RECIBO_MODELO_NAO_CONFIGURADO } from './messages';

interface ReciboPDFParams {
  titulo: { id: number; contrato_id?: number | null; empresa_id?: number | null };
  cliente: { empresa_id?: number | null };
  contrato?: unknown;
  baseUrl?: string;
}

const RECIBO_FALLBACK_STYLES = `
  h1 { color: #333; text-align: center; margin-bottom: 30px; }
  .recibo-box { border: 2px solid #333; padding: 30px; margin: 20px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
  th { background-color: #f2f2f2; font-weight: bold; width: 30%; }
  .valor { font-size: 18px; font-weight: bold; color: #10b981; }
  .assinatura { margin-top: 60px; border-top: 1px solid #333; padding-top: 20px; }
`;

/**
 * Gera PDF do recibo de pagamento a partir da aba Recibos do modelo de contrato.
 */
export class ReciboPDFService {
  static async gerarReciboConteudo(params: ReciboPDFParams): Promise<string | null> {
    const { titulo, cliente, baseUrl } = params;
    let contrato = params.contrato;
    if (!contrato && titulo.contrato_id) {
      contrato = await ContratoService.getById(titulo.contrato_id) ?? undefined;
    }

    try {
      const empresaId = cliente.empresa_id ?? titulo.empresa_id ?? null;
      const modeloDocumentoId = (contrato as { modelo_documento_id?: number | null } | undefined)?.modelo_documento_id ?? null;

      const modelo = await ModeloDocumentoService.resolveModeloReciboContrato({
        empresaId,
        modeloDocumentoId,
      });

      const conteudoTemplate = modelo?.conteudo_recibo?.trim();
      if (!conteudoTemplate) {
        logger.warn(`ReciboPDFService - ${RECIBO_MODELO_NAO_CONFIGURADO}`, {
          titulo_id: titulo.id,
          empresa_id: empresaId,
          modelo_documento_id: modeloDocumentoId,
        });
        return null;
      }

      return await VariaveisDocumentoService.processarVariaveis(
        conteudoTemplate,
        {
          cliente: cliente as DadosVariaveis['cliente'],
          contrato: contrato as DadosVariaveis['contrato'],
          titulo: titulo as DadosVariaveis['titulo'],
        },
        baseUrl
      );
    } catch (error) {
      logger.error('ReciboPDFService.gerarReciboConteudo - Erro ao processar HTML do recibo', {
        titulo_id: titulo.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  static getReciboFallbackStyles(): string {
    return RECIBO_FALLBACK_STYLES;
  }

  static async gerarReciboPdfBuffer(params: ReciboPDFParams): Promise<Buffer | null> {
    const conteudoProcessado = await this.gerarReciboConteudo(params);
    if (!conteudoProcessado) return null;

    try {
      return await PDFGenerationService.generateFromContent(
        conteudoProcessado,
        {
          format: 'A4',
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true,
        }
      );
    } catch (error) {
      logger.error('ReciboPDFService.gerarReciboPdfBuffer - Erro ao gerar PDF do recibo', {
        titulo_id: params.titulo.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  static async gerarReciboBase64(params: ReciboPDFParams): Promise<string | null> {
    const pdfBuffer = await this.gerarReciboPdfBuffer(params);
    return pdfBuffer ? pdfBuffer.toString('base64') : null;
  }
}
