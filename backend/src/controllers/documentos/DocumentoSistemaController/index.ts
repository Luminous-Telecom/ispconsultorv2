import { Request, Response } from 'express';
import { ValidationError } from 'sequelize';
import { ModeloContrato } from '../../../models/ModeloContrato';
import { Cliente } from '../../../models/Cliente';
import { Contrato } from '../../../models/Contrato';
import { Plano } from '../../../models/Plano';
import { logger } from '../../../utils/logger';
import fs from 'fs/promises';
import { VariaveisDocumentoService } from '../../../services/documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';

export class ModeloContratoController {
  /**
   * Listar todos os documentos do sistema
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.query;
      
      const whereClause: { tipo?: string } = {};
      if (tipo) {
        whereClause.tipo = tipo as string;
      }

      const documentos = await ModeloContrato.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
      });

      res.json({
        success: true,
        data: documentos,
        message: 'Documentos do sistema listados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar documentos do sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar documento por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const documento = await ModeloContrato.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: documento,
        message: 'Documento encontrado'
      });
    } catch (error) {
      logger.error('Erro ao buscar documento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo documento
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const documentoData = req.body;

      // Validar dados obrigatórios
      if (!documentoData.nome || !documentoData.tipo || !documentoData.conteudo) {
        res.status(400).json({
          success: false,
          message: 'Nome, tipo e conteúdo são obrigatórios'
        });
        return;
      }

      const documento = await ModeloContrato.create(documentoData);

      res.status(201).json({
        success: true,
        data: documento,
        message: 'Documento criado com sucesso'
      });
    } catch (error: unknown) {
      logger.error('Erro ao criar documento:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors ? error.errors.map((err) => err.message) : []
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar documento
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const documentoData = req.body;

      const documento = await ModeloContrato.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      await documento.update(documentoData);

      res.json({
        success: true,
        data: documento,
        message: 'Documento atualizado com sucesso'
      });
    } catch (error: unknown) {
      logger.error('Erro ao atualizar documento:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors ? error.errors.map((err) => err.message) : []
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deletar documento
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const documento = await ModeloContrato.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      await documento.destroy();

      res.json({
        success: true,
        message: 'Documento deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar documento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar documentos por tipo
   */
  static async getByType(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.params;

      const documentos = await ModeloContrato.findAll({
        where: { tipo, ativo: true },
        order: [['nome', 'ASC']],
      });

      res.json({
        success: true,
        data: documentos,
        message: `Documentos do tipo ${tipo} listados com sucesso`
      });
    } catch (error) {
      logger.error('Erro ao buscar documentos por tipo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar documento padrão por tipo
   */
  static async getDefaultByType(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.params;

      const documento = await ModeloContrato.findOne({
        where: { tipo, ativo: true },
        order: [['created_at', 'ASC']], // Pega o primeiro criado como padrão
      });

      if (!documento) {
        res.status(404).json({
          success: false,
          message: `Nenhum documento padrão encontrado para o tipo ${tipo}`
        });
        return;
      }

      res.json({
        success: true,
        data: documento,
        message: 'Documento padrão encontrado'
      });
    } catch (error) {
      logger.error('Erro ao buscar documento padrão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar tipos de documentos disponíveis
   */
  static async getTypes(req: Request, res: Response): Promise<void> {
    try {
      const tipos = await ModeloContrato.findAll({
        attributes: ['tipo'],
        group: ['tipo'],
        where: { ativo: true },
        order: [['tipo', 'ASC']],
      });

      const tiposList = tipos.map((doc) => doc.tipo as string);

      res.json({
        success: true,
        data: tiposList,
        message: 'Tipos de documentos listados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar tipos de documentos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Gerar PDF do documento usando serviço centralizado
   */
  static async generatePdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const documento = await ModeloContrato.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        documento.conteudo,
        'html-pdf-node',
        {
          format: 'A4',
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true
        }
      );

      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${documento.nome}.pdf"`);
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
      const { cliente_id, contrato_id } = req.query;

      const documento = await ModeloContrato.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      // Buscar cliente se fornecido
      let conteudoProcessado = documento.conteudo;
      
      if (cliente_id) {
        const cliente = await Cliente.findByPk(cliente_id as string);
        
        if (!cliente) {
          res.status(404).json({
            success: false,
            message: 'Cliente não encontrado'
          });
          return;
        }

        // Se contrato_id foi fornecido, usar esse contrato específico
        // Caso contrário, buscar contrato ativo do cliente
        let contrato: Contrato | null = null;
        
        if (contrato_id) {
          contrato = await Contrato.findByPk(contrato_id as string, {
            include: [
              { model: Plano, as: 'plano' },
              { model: Cliente, as: 'cliente' }
            ]
          });
          
          if (!contrato) {
            res.status(404).json({
              success: false,
              message: 'Contrato não encontrado'
            });
            return;
          }
          
          const contratoComIncludes = contrato as Contrato & { plano?: Plano; cliente?: Cliente };
          
          // Verificar se o contrato pertence ao cliente
          if (contratoComIncludes.cliente_id !== cliente.id) {
            res.status(400).json({
              success: false,
              message: 'Contrato não pertence ao cliente informado'
            });
            return;
          }
        } else {
          contrato = await Contrato.findOne({
            where: { cliente_id: cliente.id, status: 'ativo' },
            include: [
              { model: Plano, as: 'plano' },
              { model: Cliente, as: 'cliente' }
            ]
          });
        }

        // Processar variáveis do documento
        conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
          documento.conteudo,
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
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true
        }
      );

      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${documento.nome}-teste.pdf"`);
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
   * Listar variáveis disponíveis para documentos
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

  /**
   * Gerar PDF com conteúdo específico
   */
  static async generatePdfWithContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { conteudo } = req.body;

      const documento = await ModeloContrato.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        conteudo,
        'html-pdf-node',
        {
          format: 'A4',
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true
        }
      );

      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${documento.nome}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF com conteúdo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar PDF'
      });
    }
  }

  /**
   * Gerar PDF de teste com conteúdo específico e dados de um cliente
   */
  static async generateTestPdfWithContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { cliente_id, conteudo } = req.body;

      logger.info(`[generateTestPdfWithContent] Request received - id: ${id}, cliente_id: ${cliente_id}`);
      logger.info(`[generateTestPdfWithContent] Content length: ${conteudo?.length || 0}`);

      const documento = await ModeloContrato.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      // Buscar cliente se fornecido
      let conteudoProcessado = conteudo;
      
      if (cliente_id) {
        const cliente = await Cliente.findByPk(cliente_id);
        
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
          conteudo,
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
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true
        }
      );

      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${documento.nome}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF de teste com conteúdo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar PDF de teste'
      });
    }
  }

  /**
   * Salvar modelo específico do modelo de contrato
   */
  static async saveModeloContratoConteudo(req: Request, res: Response): Promise<void> {
    try {
      const { modelo_contrato_id, modelo } = req.body;

      if (!modelo_contrato_id || modelo === undefined || modelo === null) {
        res.status(400).json({
          success: false,
          message: 'ID do modelo de contrato e modelo são obrigatórios'
        });
        return;
      }

      // Atualizar diretamente na tabela modelo_contrato
      const modeloContrato = await ModeloContrato.findByPk(modelo_contrato_id);
      
      if (!modeloContrato) {
        res.status(404).json({
          success: false,
          message: 'Modelo de contrato não encontrado'
        });
        return;
      }

      await modeloContrato.update({ conteudo: modelo });

      res.json({
        success: true,
        data: modeloContrato,
        message: 'Modelo de contrato salvo com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao salvar modelo de contrato:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Salvar modelo específico do termo de adesão
   */
  static async saveModeloTermoAdesao(req: Request, res: Response): Promise<void> {
    try {
      const { modelo_contrato_id, modelo } = req.body;

      if (!modelo_contrato_id || modelo === undefined || modelo === null) {
        res.status(400).json({
          success: false,
          message: 'ID do modelo de contrato e modelo são obrigatórios'
        });
        return;
      }

      // Atualizar diretamente na tabela modelo_contrato
      const modeloContrato = await ModeloContrato.findByPk(modelo_contrato_id);
      
      if (!modeloContrato) {
        res.status(404).json({
          success: false,
          message: 'Modelo de contrato não encontrado'
        });
        return;
      }

      await modeloContrato.update({ conteudo_adesao: modelo });

      res.json({
        success: true,
        data: modeloContrato,
        message: 'Modelo de termo de adesão salvo com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao salvar modelo de termo de adesão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Salvar modelo específico do contrato de permanência
   */
  static async saveModeloContratoPermanencia(req: Request, res: Response): Promise<void> {
    try {
      const { modelo_contrato_id, modelo } = req.body;

      if (!modelo_contrato_id || modelo === undefined || modelo === null) {
        res.status(400).json({
          success: false,
          message: 'ID do modelo de contrato e modelo são obrigatórios'
        });
        return;
      }

      // Atualizar diretamente na tabela modelo_contrato
      const modeloContrato = await ModeloContrato.findByPk(modelo_contrato_id);
      
      if (!modeloContrato) {
        res.status(404).json({
          success: false,
          message: 'Modelo de contrato não encontrado'
        });
        return;
      }

      await modeloContrato.update({ conteudo_permanencia: modelo });

      res.json({
        success: true,
        data: modeloContrato,
        message: 'Modelo de contrato de permanência salvo com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao salvar modelo de contrato de permanência:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar todos os modelos de um modelo de contrato
   */
  static async getModelosByModeloContrato(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const modeloContrato = await ModeloContrato.findByPk(id);

      if (!modeloContrato) {
        res.status(404).json({
          success: false,
          message: 'Modelo de contrato não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          modelo_contrato: modeloContrato,
          modelo_contrato_conteudo: modeloContrato.conteudo || '',
          modelo_termo_adesao: modeloContrato.conteudo_adesao || '',
          modelo_contrato_permanencia: modeloContrato.conteudo_permanencia || ''
        },
        message: 'Modelos do modelo de contrato recuperados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao buscar modelos do modelo de contrato:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
