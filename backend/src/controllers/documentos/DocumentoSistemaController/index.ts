import { Request, Response } from 'express';
import { ValidationError } from 'sequelize';
import { ModeloContrato } from '../../../models/contratos/ModeloContrato';
import { ModeloContratoService } from '../../../services/contratos/ModeloContratoService';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { Plano } from '../../../models/cadastros/Plano';
import { logger } from '../../../utils/logger';
import fs from 'fs/promises';
import { VariaveisDocumentoService } from '../../../services/documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';

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

      const result = await ModeloContratoService.list({
        tipo: tipo as string
      });

      sendSuccess(res, result, 'Documentos do sistema listados com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao listar documentos do sistema', 500, true);
    }
  }

  /**
   * Buscar documento por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const documento = await ModeloContratoService.getById(id);

      if (!documento) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }

      sendSuccess(res, documento, 'Documento encontrado');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar documento', 500, true);
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
        sendValidationError(res, 'Nome, tipo e conteúdo são obrigatórios');
        return;
      }

      const documento = await ModeloContratoService.create(documentoData);

      sendSuccess(res, documento, 'Documento criado com sucesso', 201);
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        const errors = error.errors ? error.errors.map((err) => err.message) : [];
        sendValidationError(res, 'Dados inválidos', { errors });
        return;
      }

      sendError(res, error, 'Erro ao criar documento', 500, true);
    }
  }

  /**
   * Atualizar documento
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const documentoData = req.body;

      const documento = await ModeloContratoService.getById(id);

      if (!documento) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }

      await ModeloContratoService.update(id, documentoData);

      sendSuccess(res, documento, 'Documento atualizado com sucesso');
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        const errors = error.errors ? error.errors.map((err) => err.message) : [];
        sendValidationError(res, 'Dados inválidos', { errors });
        return;
      }

      sendError(res, error, 'Erro ao atualizar documento', 500, true);
    }
  }

  /**
   * Deletar documento
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const documento = await ModeloContratoService.getById(id);

      if (!documento) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }

      await ModeloContratoService.delete(id);

      sendSuccess(res, undefined, 'Documento deletado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar documento', 500, true);
    }
  }

  /**
   * Buscar documentos por tipo
   */
  static async getByType(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.params;

      const result = await ModeloContratoService.list({
        tipo: tipo as string
      });

      sendSuccess(res, result, `Documentos do tipo ${tipo} listados com sucesso`);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar documentos por tipo', 500, true);
    }
  }

  /**
   * Buscar documento padrão por tipo
   */
  static async getDefaultByType(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.params;

      const documento = await ModeloContratoService.getByTipo(tipo);

      if (!documento) {
        sendNotFound(res, `Nenhum documento padrão encontrado para o tipo ${tipo}`);
        return;
      }

      sendSuccess(res, documento, 'Documento padrão encontrado');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar documento padrão', 500, true);
    }
  }

  /**
   * Listar tipos de documentos disponíveis
   */
  static async getTypes(req: Request, res: Response): Promise<void> {
    try {
      const tiposList = await ModeloContratoService.getTypes();

      sendSuccess(res, tiposList, 'Tipos de documentos listados com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao listar tipos de documentos', 500, true);
    }
  }

  /**
   * Gerar PDF do documento usando serviço centralizado
   */
  static async generatePdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const documento = await ModeloContratoService.getById(id);

      if (!documento) {
        sendNotFound(res, 'Documento não encontrado');
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
      sendError(res, error, 'Erro ao gerar PDF', 500, true);
    }
  }

  /**
   * Gerar PDF de teste com dados de um cliente
   */
  static async generateTestPdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { cliente_id, contrato_id } = req.query;

      const documento = await ModeloContratoService.getById(id);

      if (!documento) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }

      // Buscar cliente se fornecido
      let conteudoProcessado = documento.conteudo;
      
      if (cliente_id) {
        const cliente = await ClienteService.getById(cliente_id as string);
        
        if (!cliente) {
          sendNotFound(res, 'Cliente não encontrado');
          return;
        }

        // Se contrato_id foi fornecido, usar esse contrato específico
        // Caso contrário, buscar contrato ativo do cliente
        let contrato = null;
        
        if (contrato_id) {
          contrato = await ContratoService.getById(contrato_id as string);
          
          if (!contrato) {
            sendNotFound(res, 'Contrato não encontrado');
            return;
          }
          
          // Verificar se o contrato pertence ao cliente
          if (contrato.cliente_id !== cliente.id) {
            sendValidationError(res, 'Contrato não pertence ao cliente informado');
            return;
          }
        } else {
          contrato = await ContratoService.findAtivoByCliente(cliente.id);
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
      sendError(res, error, 'Erro ao gerar PDF de teste', 500, true);
    }
  }

  /**
   * Listar variáveis disponíveis para documentos
   */
  static async listarVariaveis(req: Request, res: Response): Promise<void> {
    try {
      const variaveis = VariaveisDocumentoService.getVariaveisDisponiveis();

      sendSuccess(res, variaveis, 'Variáveis listadas com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao listar variáveis', 500, true);
    }
  }

  /**
   * Gerar PDF com conteúdo específico
   */
  static async generatePdfWithContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { conteudo } = req.body;

      const documento = await ModeloContratoService.getById(id);

      if (!documento) {
        sendNotFound(res, 'Documento não encontrado');
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
      sendError(res, error, 'Erro ao gerar PDF com conteúdo', 500, true);
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

      const documento = await ModeloContratoService.getById(id);

      if (!documento) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }

      // Buscar cliente se fornecido
      let conteudoProcessado = conteudo;
      
      if (cliente_id) {
        const cliente = await ClienteService.getById(cliente_id);
        
        if (!cliente) {
          sendNotFound(res, 'Cliente não encontrado');
          return;
        }

        // Buscar contrato ativo do cliente
        const contrato = await ContratoService.findAtivoByCliente(cliente.id);

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
      sendError(res, error, 'Erro ao gerar PDF de teste com conteúdo', 500, true);
    }
  }

  /**
   * Salvar modelo específico do modelo de contrato
   */
  static async saveModeloContratoConteudo(req: Request, res: Response): Promise<void> {
    try {
      const { modelo_contrato_id, modelo } = req.body;

      if (!modelo_contrato_id || modelo === undefined || modelo === null) {
        sendValidationError(res, 'ID do modelo de contrato e modelo são obrigatórios');
        return;
      }

      // Atualizar diretamente na tabela modelo_contrato
      const modeloContrato = await ModeloContratoService.getById(modelo_contrato_id);
      
      if (!modeloContrato) {
        sendNotFound(res, 'Modelo de contrato não encontrado');
        return;
      }

      await ModeloContratoService.update(modelo_contrato_id, { conteudo: modelo });

      sendSuccess(res, modeloContrato, 'Modelo de contrato salvo com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao salvar modelo de contrato', 500, true);
    }
  }

  /**
   * Salvar modelo específico do termo de adesão
   */
  static async saveModeloTermoAdesao(req: Request, res: Response): Promise<void> {
    try {
      const { modelo_contrato_id, modelo } = req.body;

      if (!modelo_contrato_id || modelo === undefined || modelo === null) {
        sendValidationError(res, 'ID do modelo de contrato e modelo são obrigatórios');
        return;
      }

      // Atualizar diretamente na tabela modelo_contrato
      const modeloContrato = await ModeloContratoService.getById(modelo_contrato_id);
      
      if (!modeloContrato) {
        sendNotFound(res, 'Modelo de contrato não encontrado');
        return;
      }

      await ModeloContratoService.update(modelo_contrato_id, { conteudo_adesao: modelo });

      sendSuccess(res, modeloContrato, 'Modelo de termo de adesão salvo com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao salvar modelo de termo de adesão', 500, true);
    }
  }

  /**
   * Salvar modelo específico do contrato de permanência
   */
  static async saveModeloContratoPermanencia(req: Request, res: Response): Promise<void> {
    try {
      const { modelo_contrato_id, modelo } = req.body;

      if (!modelo_contrato_id || modelo === undefined || modelo === null) {
        sendValidationError(res, 'ID do modelo de contrato e modelo são obrigatórios');
        return;
      }

      // Atualizar diretamente na tabela modelo_contrato
      const modeloContrato = await ModeloContratoService.getById(modelo_contrato_id);
      
      if (!modeloContrato) {
        sendNotFound(res, 'Modelo de contrato não encontrado');
        return;
      }

      await ModeloContratoService.update(modelo_contrato_id, { conteudo_permanencia: modelo });

      sendSuccess(res, modeloContrato, 'Modelo de contrato de permanência salvo com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao salvar modelo de contrato de permanência', 500, true);
    }
  }

  /**
   * Buscar todos os modelos de um modelo de contrato
   */
  static async getModelosByModeloContrato(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const modeloContrato = await ModeloContratoService.getById(id);

      if (!modeloContrato) {
        sendNotFound(res, 'Modelo de contrato não encontrado');
        return;
      }

      sendSuccess(res, {
        modelo_contrato: modeloContrato,
        modelo_contrato_conteudo: modeloContrato.conteudo || '',
        modelo_termo_adesao: modeloContrato.conteudo_adesao || '',
        modelo_contrato_permanencia: modeloContrato.conteudo_permanencia || ''
      }, 'Modelos do modelo de contrato recuperados com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar modelos do modelo de contrato', 500, true);
    }
  }
}
