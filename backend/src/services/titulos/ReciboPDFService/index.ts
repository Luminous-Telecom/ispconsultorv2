import { Titulo } from '../../../models/financeiro/Titulo';
import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import type { InferAttributes } from 'sequelize';
import type { TituloComRelacoes } from '../../../controllers/titulos/TituloHelpers/types';
import { logger } from '../../../utils/logger';
import { ModeloDocumentoService } from '../../documentos/ModeloDocumentoService';
import { VariaveisDocumentoService } from '../../documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../pdf-generation/PDFGenerationService';
import { ContratoService } from '../../contratos/ContratoService';

interface ReciboPDFParams {
  titulo: InferAttributes<Titulo> | Titulo;
  cliente: Cliente;
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
  /**
   * Retorna o HTML processado do recibo (fragmento embedável em documento maior).
   * Usa exclusivamente `conteudo_recibo` de modelo tipo contrato.
   */
  static async gerarReciboConteudo(params: ReciboPDFParams): Promise<string | null> {
    const { titulo, cliente, baseUrl } = params;
    let contrato = params.contrato;
    if (!contrato && titulo.contrato_id) {
      contrato = await ContratoService.getById(titulo.contrato_id) ?? undefined;
    }

    try {
      const empresaId =
        (cliente as { empresa_id?: number | null }).empresa_id ??
        (titulo as { empresa_id?: number | null }).empresa_id ??
        null;
      const modeloDocumentoId =
        (contrato as Contrato | undefined)?.modelo_documento_id ?? null;

      const modelo = await ModeloDocumentoService.resolveModeloReciboContrato({
        empresaId,
        modeloDocumentoId,
      });

      const conteudoTemplate = modelo?.conteudo_recibo?.trim();
      if (!conteudoTemplate) {
        logger.warn('ReciboPDFService - Modelo de recibo não configurado no modelo de contrato', {
          titulo_id: titulo.id,
          empresa_id: empresaId,
          modelo_documento_id: modeloDocumentoId,
        });
        return null;
      }

      return await VariaveisDocumentoService.processarVariaveis(
        conteudoTemplate,
        {
          cliente,
          contrato: contrato ? (contrato as Contrato | (Partial<Contrato> & { id: number })) : undefined,
          titulo: titulo as Titulo | TituloComRelacoes,
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

  /**
   * Gera o PDF do recibo em Buffer.
   */
  static async gerarReciboPdfBuffer(params: ReciboPDFParams): Promise<Buffer | null> {
    const conteudoProcessado = await this.gerarReciboConteudo(params);
    if (!conteudoProcessado) {
      return null;
    }

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

  /**
   * Gera o PDF do recibo e retorna em base64.
   */
  static async gerarReciboBase64(params: ReciboPDFParams): Promise<string | null> {
    const pdfBuffer = await this.gerarReciboPdfBuffer(params);
    return pdfBuffer ? pdfBuffer.toString('base64') : null;
  }
}
