import { Request, Response } from 'express';
import { ModeloRecibo } from '../models/ModeloRecibo';
import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Plano } from '../models/Plano';
import { logger } from '../utils/logger';
import { VariaveisDocumentoService } from '../services/VariaveisDocumentoService';
import { PDFGenerationService } from '../services/pdf-generation/PDFGenerationService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../services/AuditoriaService';
import { setAuditData } from '../middleware/auditMiddleware';
import type { AuthenticatedRequest } from '../types/auth';

export class ModeloReciboController {
  /**
   * Listar todos os recibos
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const recibos = await ModeloRecibo.findAll({
        order: [['created_at', 'DESC']],
      });

      res.json({
        success: true,
        data: recibos,
        message: 'Recibos listados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar recibos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar recibo por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const recibo = await ModeloRecibo.findByPk(id);

      if (!recibo) {
        res.status(404).json({
          success: false,
          message: 'Recibo não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: recibo,
        message: 'Recibo encontrado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao buscar recibo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo recibo
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { nome, conteudo, descricao, ativo, tamanho_maximo, tipos_permitidos, retencao_dias, auto_backup, criptografia } = req.body;

      const recibo = await ModeloRecibo.create({
        nome,
        conteudo,
        descricao,
        ativo: ativo !== undefined ? ativo : true,
        tamanho_maximo: tamanho_maximo || 10485760,
        tipos_permitidos: tipos_permitidos || 'pdf,doc,docx,xls,xlsx',
        retencao_dias: retencao_dias || 365,
        auto_backup: auto_backup || false,
        criptografia: criptografia || false,
      });

      await registrarCriacao(
        req as AuthenticatedRequest,
        'ModeloRecibo',
        recibo.id,
        recibo.toJSON() as unknown as Record<string, unknown>
      );

      res.status(201).json({
        success: true,
        data: recibo,
        message: 'Recibo criado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao criar recibo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar recibo
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const recibo = await ModeloRecibo.findByPk(id);

      if (!recibo) {
        res.status(404).json({
          success: false,
          message: 'Recibo não encontrado'
        });
        return;
      }

      const dadosAnteriores = recibo.toJSON() as unknown as Record<string, unknown>;
      await recibo.update(updateData);
      await recibo.reload();

      const dadosNovos = recibo.toJSON() as unknown as Record<string, unknown>;
      setAuditData(req, dadosAnteriores, dadosNovos);

      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'ModeloRecibo',
        recibo.id,
        dadosAnteriores,
        dadosNovos
      );

      res.json({
        success: true,
        data: recibo,
        message: 'Recibo atualizado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao atualizar recibo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deletar recibo
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const recibo = await ModeloRecibo.findByPk(id);

      if (!recibo) {
        res.status(404).json({
          success: false,
          message: 'Recibo não encontrado'
        });
        return;
      }

      const dadosAnteriores = recibo.toJSON() as unknown as Record<string, unknown>;
      setAuditData(req, dadosAnteriores);
      await recibo.destroy();

      await registrarExclusao(
        req as AuthenticatedRequest,
        'ModeloRecibo',
        recibo.id,
        dadosAnteriores
      );

      res.json({
        success: true,
        message: 'Recibo deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar recibo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Gerar PDF do recibo usando html-pdf-node (Puppeteer)
   */
  static async generatePdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const recibo = await ModeloRecibo.findByPk(id);

      if (!recibo) {
        res.status(404).json({
          success: false,
          message: 'Recibo não encontrado'
        });
        return;
      }

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        recibo.conteudo,
        'html-pdf-node',
        {
          format: 'A4',
          margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
          printBackground: true
        }
      );

      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${recibo.nome}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar PDF'
      });
    }
  }

  /**
   * Gerar PDF de teste com dados de um cliente
   */
  static async generateTestPdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { cliente_id } = req.query;

      const recibo = await ModeloRecibo.findByPk(id);

      if (!recibo) {
        res.status(404).json({
          success: false,
          message: 'Recibo não encontrado'
        });
        return;
      }

      // Buscar cliente se fornecido
      let conteudoProcessado = recibo.conteudo;
      
      if (cliente_id) {
        const cliente = await Cliente.findByPk(cliente_id as string);
        
        if (!cliente) {
          res.status(404).json({
            success: false,
            message: 'Cliente não encontrado'
          });
          return;
        }

        // Buscar contrato ativo do cliente
        const contrato = await Contrato.findOne({
          where: { cliente_id: cliente.id, status: 'ativo' },
          include: [{ model: Plano, as: 'plano' }]
        });

        // Processar variáveis do documento
        conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
          recibo.conteudo,
          {
            cliente,
            contrato: contrato || undefined
          }
        );
      }

      // Prepara o HTML completo com estilos básicos
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              color: #333;
              margin: 0;
              padding: 0;
              line-height: 1.2;
            }
            
            /* Estilos para imagens - preservar dimensões inline */
            img {
              display: block;
              page-break-inside: avoid;
              object-fit: contain;
              max-width: 100% !important;
            }
            
            /* Limitar imagens muito grandes (largura > 800px) */
            img[width] {
              max-width: 100% !important;
              height: auto !important;
            }
            
            /* Se tem style inline com dimensões, preservar proporções */
            img[style*="width"] {
              max-width: 100% !important;
              height: auto !important;
            }
            
            /* NÃO forçar auto se a imagem tem dimensões inline razoáveis */
            img:not([style*="width"]):not([style*="height"]):not([width]):not([height]) {
              max-width: 100%;
              height: auto;
            }
            
            /* Estilos para tabelas */
            figure.table {
              width: 100% !important;
              float: none !important;
              margin: 0 !important;
              margin-inline-start: 0 !important;
              margin-inline-end: 0 !important;
              margin-top: 0 !important;
              margin-bottom: 0.5em !important;
            }
            
            table {
              border-collapse: collapse;
              width: 100% !important;
              table-layout: auto !important;
              margin: 0 !important;
            }
            
            table colgroup,
            table colgroup col {
              width: auto !important;
            }
            
            table td, table th {
              border: none;
              width: auto !important;
              max-width: none !important;
              min-width: 0 !important;
              padding: 0 !important;
            }
            
            /* Remover espaçamento excessivo entre elementos */
            p {
              margin: 0 !important;
              padding: 0 !important;
              line-height: 1.2 !important;
            }
            
            /* Classes de espaçamento entre linhas */
            .line-height-1 { line-height: 1.0 !important; }
            .line-height-115 { line-height: 1.15 !important; }
            .line-height-12 { line-height: 1.2 !important; }
            .line-height-15 { line-height: 1.5 !important; }
            .line-height-2 { line-height: 2.0 !important; }
            
            p:empty {
              margin: 0 !important;
              padding: 0 !important;
              line-height: 0 !important;
              height: 0 !important;
              display: none !important;
            }
            
            br {
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
              line-height: 1 !important;
              height: 0.5em !important;
            }
            
            /* Adicionar pequeno espaço apenas entre parágrafos consecutivos */
            p + p {
              margin-top: 0.2em !important;
            }
            
            /* Espaçamento do body */
            body {
              line-height: 1.2 !important;
            }
            
            /* Espaçamento entre tabelas */
            figure.table + figure.table {
              margin-top: 0.5em !important;
            }
            
            /* Remover espaço entre parágrafos vazios e tabelas */
            p:empty + figure.table,
            figure.table + p:empty {
              margin: 0 !important;
            }
          </style>
        </head>
        <body>
          <div>${conteudoProcessado}</div>
        </body>
        </html>
      `;

      // Configurações do PDF
      const pdfBuffer = await PDFGenerationService.generateFromHtml(htmlContent, 'html-pdf-node', {
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true
      });

      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${recibo.nome}-teste.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF de teste:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar PDF de teste'
      });
    }
  }

  /**
   * Listar variáveis disponíveis para recibos
   */
  static async listarVariaveis(req: Request, res: Response): Promise<void> {
    try {
      const variaveis = VariaveisDocumentoService.getVariaveisDisponiveis();

      res.json({
        success: true,
        data: variaveis,
        message: 'Variáveis listadas com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar variáveis:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
