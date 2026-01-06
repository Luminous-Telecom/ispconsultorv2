import { Request, Response as ExpressResponse } from 'express';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { Banco } from '../../../models/cadastros/Banco';
import { TituloPDFController } from '../../titulos/TituloPDFController';
import { TituloComRelacoes } from '../../titulos/TituloHelpers/types';
import { logger } from '../../../utils/logger';
import crypto from 'crypto';

export class PagamentoPublicoController {
  /**
   * Gerar token de acesso público para um título
   */
  static gerarToken(tituloId: number): string {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const data = `${tituloId}-${Date.now()}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 32);
  }

  /**
   * Validar token e retornar ID do título
   */
  static validarToken(token: string, tituloId: number): boolean {
    // Por enquanto, vamos usar uma validação simples baseada no ID
    // Em produção, você pode implementar um sistema de tokens mais robusto
    // Por segurança, vamos usar um hash do ID + secret
    const secret = process.env.JWT_SECRET || 'default-secret';
    const expectedHash = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
    return token === expectedHash;
  }

  /**
   * API para buscar dados do título para página pública de pagamento
   */
  static async getTituloPublico(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id, token } = req.params;

      if (!id || !token) {
        res.status(400).json({
          success: false,
          message: 'ID e token são obrigatórios'
        });
        return;
      }

      const tituloId = parseInt(id, 10);
      if (isNaN(tituloId)) {
        res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
        return;
      }

      const secret = process.env.JWT_SECRET || 'default-secret';
      const expectedHash = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
      
      if (token !== expectedHash) {
        res.status(403).json({
          success: false,
          message: 'Token inválido ou expirado'
        });
        return;
      }

      const titulo = await Titulo.findByPk(tituloId, {
        include: [
          { 
            model: Cliente, 
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia']
          },
          { 
            model: Plano, 
            as: 'plano',
            attributes: ['id', 'nome_plano']
          }
        ],
        attributes: ['id', 'numero_titulo', 'valor', 'valor_final', 'data_vencimento', 'status', 'qrcode', 'linha_digitavel']
      }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: titulo
      });
    } catch (error) {
      logger.error('Erro ao buscar título público:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Gerar e servir PDF do boleto
   */
  static async downloadPdf(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id, token } = req.params;

      if (!id || !token) {
        res.status(400).json({
          success: false,
          message: 'ID e token são obrigatórios'
        });
        return;
      }

      const tituloId = parseInt(id, 10);
      if (isNaN(tituloId)) {
        res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
        return;
      }

      // Validar token
      const secret = process.env.JWT_SECRET || 'default-secret';
      const expectedHash = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
      
      if (token !== expectedHash) {
        res.status(403).json({
          success: false,
          message: 'Token inválido'
        });
        return;
      }

      // Buscar título
      const titulo = await Titulo.findByPk(tituloId, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { 
            model: Banco, 
            as: 'banco',
            attributes: [
              'id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox',
              'url_retorno', 'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 
              'instrucao_linha_3', 'instrucao_linha_4', 'instrucao_linha_5', 'logo'
            ]
          }
        ]
      }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Gerar PDF - titulo já tem os relacionamentos incluídos
      const pdfBase64 = await TituloPDFController.gerarPdfBase64(titulo as TituloComRelacoes);
      
      if (!pdfBase64) {
        res.status(500).json({
          success: false,
          message: 'Erro ao gerar PDF do boleto'
        });
        return;
      }

      // Converter base64 para Buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // Configurar headers para download de PDF
      const filename = `boleto-${(titulo as TituloComRelacoes).numero_titulo || (titulo as TituloComRelacoes).id}.pdf`;
      
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      });

      res.end(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF para download público:', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

