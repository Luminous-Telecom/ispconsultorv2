import { Request, Response } from 'express';
import { ModeloContrato } from '../../../models/contratos/ModeloContrato';
import { ModeloContratoService } from '../../../services/contratos/ModeloContratoService';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { Plano } from '../../../models/cadastros/Plano';
import { logger } from '../../../utils/logger';
import { VariaveisDocumentoService } from '../../../services/documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';
import * as fs from 'fs/promises';
import { ValidationError } from 'sequelize';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest } from '../../../types/auth';
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

      try {
        await registrarCriacao(
          req as AuthenticatedRequest,
          'ModeloContrato',
          documento.id,
          documento.toJSON() as unknown as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

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

      const dadosAnteriores = documento.toJSON();
      await ModeloContratoService.update(id, documentoData);
      await documento.reload();

      try {
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'ModeloContrato',
          documento.id,
          dadosAnteriores as unknown as Record<string, unknown>,
          documento.toJSON() as unknown as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

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

      const dadosAnteriores = documento.toJSON();
      await ModeloContratoService.delete(id);

      try {
        await registrarExclusao(
          req as AuthenticatedRequest,
          'ModeloContrato',
          documento.id,
          dadosAnteriores as unknown as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

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

      const documento = await ModeloContratoService.getByTipo(tipo, true);

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
      const { cliente_id } = req.query;

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

        // Buscar contrato ativo do cliente
        const contrato = await ContratoService.findAtivoByCliente(cliente.id);

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
}
