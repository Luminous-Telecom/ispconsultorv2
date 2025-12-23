import { Request, Response } from 'express';
import { ModeloCarta } from '../models/ModeloCarta';
import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Plano } from '../models/Plano';
import { logger } from '../utils/logger';
import { VariaveisDocumentoService } from '../services/VariaveisDocumentoService';
import { PDFGenerationService } from '../services/pdf-generation/PDFGenerationService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../services/AuditoriaService';
import type { AuthenticatedRequest } from '../types/auth';

export class ModeloCartaController {
  /**
   * Listar todas as cartas de cobrança
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const cartas = await ModeloCarta.findAll({
        order: [['created_at', 'DESC']],
      });

      res.json({
        success: true,
        data: cartas,
        message: 'Cartas de cobrança listadas com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar cartas de cobrança:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar carta de cobrança por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const carta = await ModeloCarta.findByPk(id);

      if (!carta) {
        res.status(404).json({
          success: false,
          message: 'Carta de cobrança não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: carta,
        message: 'Carta de cobrança encontrada com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao buscar carta de cobrança:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar nova carta de cobrança
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { nome, conteudo, descricao, ativo, tamanho_maximo, tipos_permitidos, retencao_dias, auto_backup, criptografia } = req.body;

      const carta = await ModeloCarta.create({
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
        'ModeloCarta',
        carta.id,
        carta.toJSON() as unknown as Record<string, unknown>
      );

      res.status(201).json({
        success: true,
        data: carta,
        message: 'Carta de cobrança criada com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao criar carta de cobrança:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar carta de cobrança
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const carta = await ModeloCarta.findByPk(id);

      if (!carta) {
        res.status(404).json({
          success: false,
          message: 'Carta de cobrança não encontrada'
        });
        return;
      }

      const dadosAnteriores = carta.toJSON();
      await carta.update(updateData);
      await carta.reload();

      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'ModeloCarta',
        carta.id,
        dadosAnteriores as unknown as Record<string, unknown>,
        carta.toJSON() as unknown as Record<string, unknown>
      );

      res.json({
        success: true,
        data: carta,
        message: 'Carta de cobrança atualizada com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao atualizar carta de cobrança:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deletar carta de cobrança
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const carta = await ModeloCarta.findByPk(id);

      if (!carta) {
        res.status(404).json({
          success: false,
          message: 'Carta de cobrança não encontrada'
        });
        return;
      }

      const dadosAnteriores = carta.toJSON();
      await carta.destroy();

      await registrarExclusao(
        req as AuthenticatedRequest,
        'ModeloCarta',
        carta.id,
        dadosAnteriores as unknown as Record<string, unknown>
      );

      res.json({
        success: true,
        message: 'Carta de cobrança deletada com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar carta de cobrança:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Gerar PDF da carta de cobrança usando html-pdf-node (Puppeteer)
   */
  static async generatePdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const carta = await ModeloCarta.findByPk(id);

      if (!carta) {
        res.status(404).json({
          success: false,
          message: 'Carta de cobrança não encontrada'
        });
        return;
      }

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        carta.conteudo,
        'html-pdf-node',
        {
          format: 'A4',
          margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
          printBackground: true
        }
      );

      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${carta.nome}.pdf"`);
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

      const carta = await ModeloCarta.findByPk(id);

      if (!carta) {
        res.status(404).json({
          success: false,
          message: 'Carta de cobrança não encontrada'
        });
        return;
      }

      // Buscar cliente se fornecido
      let conteudoProcessado = carta.conteudo;
      
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
          carta.conteudo,
          {
            cliente,
            contrato: contrato || undefined
          }
        );
      }

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        conteudoProcessado,
        'html-pdf-node',
        {
          format: 'A4',
          margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
          printBackground: true
        }
      );

      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${carta.nome}-teste.pdf"`);
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
   * Listar variáveis disponíveis para cartas de cobrança
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
