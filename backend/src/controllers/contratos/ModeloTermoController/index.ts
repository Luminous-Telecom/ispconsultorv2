import { Request, Response } from 'express';
import { ModeloDocumento } from '../../../models/ModeloDocumento';
import { Cliente } from '../../../models/Cliente';
import { Contrato } from '../../../models/Contrato';
import { Plano } from '../../../models/Plano';
import { VariaveisDocumentoService } from '../../../services/documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { setAuditData } from '../../../middleware/auditMiddleware';
import type { AuthenticatedRequest } from '../../../types/auth';

export class ModeloTermoController {
  // Listar todos os modelos de termo
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const modelos = await ModeloDocumento.findAll({
        where: {
          tipo: 'termo'
        },
        order: [['nome', 'ASC']]
      });

      res.json({
        success: true,
        data: modelos
      });
    } catch (error) {
      logger.error('Erro ao listar modelos de termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Buscar modelo por ID
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const modelo = await ModeloDocumento.findByPk(id);

      if (!modelo) {
        res.status(404).json({
          success: false,
          message: 'Modelo de termo não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: modelo
      });
    } catch (error) {
      logger.error('Erro ao buscar modelo de termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Criar novo modelo de termo
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { nome, descricao, tipo_termo, conteudo } = req.body;

      if (!nome || !conteudo) {
        res.status(400).json({
          success: false,
          message: 'Nome e conteúdo são obrigatórios'
        });
        return;
      }

      const modelo = await ModeloDocumento.create({
        nome,
        descricao,
        tipo: 'termo',
        conteudo,
        ativo: true,
        tamanho_maximo: 10485760,
        tipos_permitidos: 'pdf,doc,docx,xls,xlsx',
        retencao_dias: 365,
        auto_backup: false,
        criptografia: false
      });

      await registrarCriacao(
        req as AuthenticatedRequest,
        'ModeloTermo',
        modelo.id,
        modelo.toJSON() as unknown as Record<string, unknown>
      );

      res.status(201).json({
        success: true,
        message: 'Modelo de termo criado com sucesso',
        data: modelo
      });
    } catch (error) {
      logger.error('Erro ao criar modelo de termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar modelo de termo
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nome, descricao, tipo_termo, conteudo, ativo } = req.body;

      const modelo = await ModeloDocumento.findByPk(id);
      if (!modelo) {
        res.status(404).json({
          success: false,
          message: 'Modelo de termo não encontrado'
        });
        return;
      }

      const dadosAnteriores = modelo.toJSON() as unknown as Record<string, unknown>;
      await modelo.update({
        nome,
        descricao,
        tipo: 'termo',
        conteudo,
        ativo
      });
      await modelo.reload();

      const dadosNovos = modelo.toJSON() as unknown as Record<string, unknown>;
      setAuditData(req, dadosAnteriores, dadosNovos);

      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'ModeloTermo',
        modelo.id,
        dadosAnteriores,
        dadosNovos
      );

      res.json({
        success: true,
        message: 'Modelo de termo atualizado com sucesso',
        data: modelo
      });
    } catch (error) {
      logger.error('Erro ao atualizar modelo de termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Deletar modelo de termo
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const modelo = await ModeloDocumento.findByPk(id);

      if (!modelo) {
        res.status(404).json({
          success: false,
          message: 'Modelo de termo não encontrado'
        });
        return;
      }

      const dadosAnteriores = modelo.toJSON() as unknown as Record<string, unknown>;
      setAuditData(req, dadosAnteriores);
      await modelo.destroy();

      await registrarExclusao(
        req as AuthenticatedRequest,
        'ModeloTermo',
        modelo.id,
        dadosAnteriores
      );

      res.json({
        success: true,
        message: 'Modelo de termo excluído com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao excluir modelo de termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Buscar modelos por tipo
  static async getByTipo(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.params;
      const modelos = await ModeloDocumento.findAll({
        where: {
          tipo: 'termo',
          ativo: true
        },
        order: [['nome', 'ASC']]
      });

      res.json({
        success: true,
        data: modelos
      });
    } catch (error) {
      logger.error('Erro ao buscar modelos por tipo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Gerar PDF do modelo de termo
  static async generatePdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const modelo = await ModeloDocumento.findByPk(id);

      if (!modelo) {
        res.status(404).json({
          success: false,
          message: 'Modelo de termo não encontrado'
        });
        return;
      }

      if (modelo.tipo !== 'termo') {
        res.status(400).json({
          success: false,
          message: 'O documento não é um modelo de termo'
        });
        return;
      }

      if (!modelo.conteudo) {
        res.status(400).json({
          success: false,
          message: 'O modelo de termo não possui conteúdo'
        });
        return;
      }

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        modelo.conteudo,
        'puppeteer',
        {
          format: 'a4',
          printBackground: true,
          margin: {
            top: '1cm',
            right: '1cm',
            bottom: '1cm',
            left: '1cm'
          }
        }
      );

      if (!pdfBuffer || pdfBuffer.length === 0) {
        res.status(500).json({
          success: false,
          message: 'Erro ao gerar PDF: buffer vazio'
        });
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${modelo.nome}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      });
      res.end(pdfBuffer);

    } catch (error: unknown) {
      logger.error('Erro ao gerar PDF do modelo de termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Gerar PDF de teste com dados de cliente
  static async generateTestPdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { clienteId } = req.body;

      const modelo = await ModeloDocumento.findByPk(id);

      if (!modelo) {
        res.status(404).json({
          success: false,
          message: 'Modelo de termo não encontrado'
        });
        return;
      }

      // Buscar cliente se fornecido
      let conteudoProcessado = modelo.conteudo;
      
      if (clienteId) {
        const cliente = await Cliente.findByPk(clienteId as string);
        
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
          modelo.conteudo,
          {
            cliente,
            contrato: contrato || undefined
          }
        );
      }

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        conteudoProcessado,
        'puppeteer',
        {
          format: 'a4',
          printBackground: true,
          margin: {
            top: '1cm',
            right: '1cm',
            bottom: '1cm',
            left: '1cm'
          }
        }
      );

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${modelo.nome}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      });

      res.send(pdfBuffer);

    } catch (error) {
      logger.error('Erro ao gerar PDF de teste do modelo de termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Gerar PDF de termo com dados do contrato específico
  static async generatePdfWithContrato(req: Request, res: Response): Promise<void> {
    try {
      const { id, contratoId } = req.params;

      const modelo = await ModeloDocumento.findByPk(id);

      if (!modelo) {
        res.status(404).json({
          success: false,
          message: 'Modelo de termo não encontrado'
        });
        return;
      }

      if (modelo.tipo !== 'termo') {
        res.status(400).json({
          success: false,
          message: 'O documento não é um modelo de termo'
        });
        return;
      }

      if (!modelo.conteudo) {
        res.status(400).json({
          success: false,
          message: 'O modelo de termo não possui conteúdo'
        });
        return;
      }

      const contrato = await Contrato.findByPk(contratoId, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' }
        ]
      });

      if (!contrato) {
        res.status(404).json({
          success: false,
          message: 'Contrato não encontrado'
        });
        return;
      }

      type ContratoWithIncludes = Contrato & {
        cliente?: Cliente;
        plano?: Plano;
      };

      const contratoComIncludes = contrato as ContratoWithIncludes;

      const conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
        modelo.conteudo,
        {
          cliente: contratoComIncludes.cliente,
          contrato: contrato
        }
      );

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        conteudoProcessado,
        'html-pdf-node',
        {
          format: 'A4',
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true
        }
      );

      if (!pdfBuffer || pdfBuffer.length === 0) {
        res.status(500).json({
          success: false,
          message: 'Erro ao gerar PDF: buffer vazio'
        });
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="termo-contrato-${contratoId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      });
      res.end(pdfBuffer);
    } catch (error: unknown) {
      logger.error('Erro ao gerar PDF do termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
