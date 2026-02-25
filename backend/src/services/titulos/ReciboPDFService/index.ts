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
import type { ModeloDocumento } from '../../../models/documentos/ModeloDocumento';

interface ReciboPDFParams {
  titulo: InferAttributes<Titulo> | Titulo;
  cliente: Cliente;
  contrato?: unknown;
  baseUrl?: string;
}

/**
 * Gera PDF do recibo de pagamento (reutilizado no envio por email/WhatsApp e na central do assinante).
 */
export class ReciboPDFService {
  /**
   * Gera o HTML do recibo e retorna o PDF em base64.
   * Retorna null em caso de erro.
   */
  static async gerarReciboBase64(params: ReciboPDFParams): Promise<string | null> {
    const { titulo, cliente, baseUrl } = params;
    let contrato = params.contrato;
    if (!contrato && titulo.contrato_id) {
      contrato = await ContratoService.getById(titulo.contrato_id) ?? undefined;
    }
    try {
      let modelos = await ModeloDocumentoService.getByType('recibo', true);
      if (modelos.length === 0) {
        const todosModelos = await ModeloDocumentoService.list({ ativo: true });
        modelos = todosModelos.data.filter(
          (m: ModeloDocumento & { conteudo_recibo?: string }) => m.conteudo_recibo && m.conteudo_recibo.trim().length > 0
        );
      }

      let conteudoProcessado: string;

      if (modelos.length > 0) {
        const modelo = modelos[0] as ModeloDocumento & { conteudo_recibo?: string };
        const conteudoTemplate = modelo.conteudo_recibo || modelo.conteudo;
        conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
          conteudoTemplate,
          {
            cliente,
            contrato: contrato ? (contrato as Contrato | (Partial<Contrato> & { id: number })) : undefined,
            titulo: titulo as Titulo | TituloComRelacoes
          },
          baseUrl
        );
      } else {
        conteudoProcessado = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #333; text-align: center; margin-bottom: 30px; }
              .recibo-box { border: 2px solid #333; padding: 30px; margin: 20px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f2f2f2; font-weight: bold; width: 30%; }
              .valor { font-size: 18px; font-weight: bold; color: #10b981; }
              .assinatura { margin-top: 60px; border-top: 1px solid #333; padding-top: 20px; }
            </style>
          </head>
          <body>
            <h1>RECIBO DE PAGAMENTO</h1>
            <div class="recibo-box">
              <table>
                <tr><th>Número do Título:</th><td>${titulo.numero_titulo || titulo.id}</td></tr>
                <tr><th>Cliente:</th><td>${cliente.razao_social || cliente.nome_fantasia || '-'}</td></tr>
                <tr><th>CNPJ:</th><td>${cliente.cnpj || '-'}</td></tr>
                <tr><th>Valor Pago:</th><td class="valor">R$ ${Number(titulo.valor_pago || titulo.valor_final || titulo.valor).toFixed(2).replace('.', ',')}</td></tr>
                <tr><th>Data de Vencimento:</th><td>${titulo.data_vencimento ? new Date(titulo.data_vencimento).toLocaleDateString('pt-BR') : '-'}</td></tr>
                <tr><th>Data de Pagamento:</th><td>${titulo.data_pagamento ? new Date(titulo.data_pagamento).toLocaleDateString('pt-BR') : '-'}</td></tr>
                <tr><th>Status:</th><td>${titulo.status === 'pago' ? 'Pago' : 'Pago com Atraso'}</td></tr>
              </table>
              <div class="assinatura">
                <p>Recebido de: ${cliente.razao_social || cliente.nome_fantasia || '-'}</p>
                <p style="margin-top: 40px;">_________________________________</p>
                <p>Assinatura</p>
              </div>
            </div>
          </body>
          </html>
        `;
      }

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        conteudoProcessado,
        'html-pdf-node',
        {
          format: 'A4',
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true
        }
      );
      return pdfBuffer.toString('base64');
    } catch (error) {
      logger.error('ReciboPDFService.gerarReciboBase64 - Erro ao gerar PDF do recibo', {
        titulo_id: titulo.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }
}
