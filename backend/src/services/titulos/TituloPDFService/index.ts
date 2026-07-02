import { logger } from '../../../utils/logger';
import { PDFGenerationService } from '../../pdf-generation/PDFGenerationService';
import { BancoApiService } from '../../bancos/BancoApiService';
import { BarcodeService } from '../../bancos/BarcodeService';
import { TituloService } from '../../financeiro/TituloService';
import type { TituloComRelacoes } from '../../../controllers/titulos/TituloHelpers/types';
import type { PDFOptions } from '../../pdf-generation/types';
import { buildBoletoRenderData, buildBoletosMultiplosHtml } from '../boletoTemplate';

export const BOLETO_PDF_OPTIONS: PDFOptions = {
  format: 'A4',
  margin: { top: '0.35cm', right: '0.35cm', bottom: '0.35cm', left: '0.35cm' },
  printBackground: true,
};

export const BOLETO_PAGE_STYLES = `
  html, body {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box;
  }
  body > div {
    width: 100% !important;
    max-width: 100% !important;
  }
  .custom, .boleto-fatura, .boleto-ficha {
    width: 100% !important;
    max-width: 100% !important;
  }
`;

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export class TituloPDFService {
  static async registrarTituloNoBancoSeNecessario(
    titulo: TituloComRelacoes,
    options?: { falharSeErro?: boolean },
  ): Promise<TituloComRelacoes> {
    if (titulo.charge_id) {
      return titulo;
    }

    const resultado = await BancoApiService.gerarTitulo(titulo);
    if (!resultado.success || !resultado.data) {
      const message = resultado.message || 'Erro desconhecido';
      if (options?.falharSeErro) {
        throw new Error(`Não foi possível registrar o título no banco: ${message}`);
      }
      return titulo;
    }

    const { codigo_barras, linha_digitavel } = BarcodeService.normalizarCodigosBoleto(
      resultado.data.codigo_barras,
      resultado.data.linha_digitavel,
    );

    await TituloService.update(titulo.id, {
      charge_id: resultado.data.charge_id,
      codigo_barras,
      linha_digitavel,
      url_boleto: asString(resultado.data.url_boleto),
      qrcode: asString(resultado.data.qrcode),
      qrcode_image: asString(resultado.data.qrcode_image),
      nosso_numero: asString(resultado.data.nosso_numero),
    });

    const atualizado = await TituloService.getById(titulo.id);
    return (atualizado as TituloComRelacoes | null) ?? titulo;
  }

  static async prepararTitulosParaImpressao(titulos: TituloComRelacoes[]): Promise<TituloComRelacoes[]> {
    const preparados: TituloComRelacoes[] = [];

    for (const titulo of titulos) {
      if (!titulo.cliente || !titulo.banco) {
        continue;
      }

      try {
        preparados.push(await this.registrarTituloNoBancoSeNecessario(titulo));
      } catch (error) {
        logger.warn('Erro ao preparar título para boleto', {
          titulo_id: titulo.id,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return preparados;
  }

  static montarPaginaHtmlBoletos(boletosHtml: string, quantidade: number, autoPrint = false): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Boletos - ${quantidade} título(s)</title>
  <style>${BOLETO_PAGE_STYLES}</style>
  ${autoPrint ? '<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>' : ''}
</head>
<body>
  ${boletosHtml}
</body>
</html>`;
  }

  static async gerarPdfBase64(titulo: TituloComRelacoes): Promise<string | null> {
    try {
      const html = await this.processarBoletoHtml(titulo);
      const pdfBuffer = await PDFGenerationService.generateFromContent(html, BOLETO_PDF_OPTIONS);
      return pdfBuffer.toString('base64');
    } catch (error: unknown) {
      logger.error('Erro ao gerar PDF do boleto', {
        titulo_id: titulo.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return null;
    }
  }

  static async processarBoletoHtml(titulo: TituloComRelacoes): Promise<string> {
    const data = await buildBoletoRenderData(titulo);
    return buildBoletosMultiplosHtml([data]);
  }

  static async generatePdfForTitulo(titulo: TituloComRelacoes): Promise<Buffer> {
    const pdfBase64 = await this.gerarPdfBase64(titulo);
    if (!pdfBase64) {
      throw new Error('Erro ao gerar PDF do boleto');
    }
    return Buffer.from(pdfBase64, 'base64');
  }

  static async processarBoletosMultiplosHtml(titulos: TituloComRelacoes[]): Promise<string> {
    const dataList = await Promise.all(titulos.map((titulo) => buildBoletoRenderData(titulo)));
    return buildBoletosMultiplosHtml(dataList);
  }

  static async gerarPdfDeMultiplosBoletos(titulos: TituloComRelacoes[]): Promise<Buffer> {
    if (titulos.length === 0) {
      throw new Error('Nenhum boleto válido para gerar PDF');
    }

    const html = await this.processarBoletosMultiplosHtml(titulos);
    return PDFGenerationService.generateFromHtml(
      this.montarPaginaHtmlBoletos(html, titulos.length),
      BOLETO_PDF_OPTIONS,
    );
  }
}
