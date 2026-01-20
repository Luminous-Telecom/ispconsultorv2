import { Request, Response } from 'express';
import { ModeloDocumentoService } from '../../../services/documentos/ModeloDocumentoService';
import { ModeloDocumentoPdfService } from '../../../services/documentos/ModeloDocumentoPdfService';
import { ModeloDocumentoContentService } from '../../../services/documentos/ModeloDocumentoContentService';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { VariaveisDocumentoService } from '../../../services/documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';
import { ValidationError } from 'sequelize';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { logger } from '../../../utils/logger';

export class ModeloDocumentoController {
  /**
   * Listar todos os documentos do sistema
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.query;
      
      const whereClause: { tipo?: string; ativo?: boolean } = {};
      if (tipo) {
        whereClause.tipo = tipo as string;
      }

      const result = await ModeloDocumentoService.list({
        tipo: tipo as string,
        ativo: whereClause.ativo
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

      const documento = await ModeloDocumentoService.getById(id);

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

      const documento = await ModeloDocumentoService.create(documentoData);

      try {
        await registrarCriacao(
          req as AuthenticatedRequest,
          'ModeloDocumento',
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

      const documento = await ModeloDocumentoService.getById(id);

      if (!documento) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }

      const dadosAnteriores = documento.toJSON();
      const documentoAtualizado = await ModeloDocumentoService.update(id, documentoData);

      const dadosNovos = documentoAtualizado.toJSON() as unknown as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores as unknown as Record<string, unknown>, dadosNovos);

      try {
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'ModeloDocumento',
          documentoAtualizado.id,
          dadosAnteriores as unknown as Record<string, unknown>,
          dadosNovos
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, documentoAtualizado, 'Documento atualizado com sucesso');
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

      const documento = await ModeloDocumentoService.getById(id);

      if (!documento) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }

      const dadosAnteriores = documento.toJSON();
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores as unknown as Record<string, unknown>);
      
      await ModeloDocumentoService.delete(id);

      try {
        await registrarExclusao(
          req as AuthenticatedRequest,
          'ModeloDocumento',
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

      const documentos = await ModeloDocumentoService.getByType(tipo);

      sendSuccess(res, documentos, `Documentos do tipo ${tipo} listados com sucesso`);
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

      const documento = await ModeloDocumentoService.getDefaultByType(tipo);

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
      const tiposList = await ModeloDocumentoService.getTypes();

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
      await ModeloDocumentoPdfService.gerarPdf(Number(id), res);
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
      await ModeloDocumentoPdfService.gerarTestPdf(
        Number(id),
        cliente_id as string | undefined,
        contrato_id as string | undefined,
        req,
        res
      );
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
   * Salvar modelo de conteúdo do documento
   */
  static async saveModeloContratoConteudo(req: Request, res: Response): Promise<void> {
    try {
      const { modelo_documento_id, modelo } = req.body;
      if (!modelo_documento_id || modelo === undefined || modelo === null) {
        sendValidationError(res, 'ID do modelo de documento e modelo são obrigatórios');
        return;
      }
      const result = await ModeloDocumentoContentService.salvarConteudo(Number(modelo_documento_id), 'conteudo', modelo);
      if (result.success) {
        sendSuccess(res, result.data, result.message);
      } else {
        sendNotFound(res, result.message);
      }
    } catch (error) {
      sendError(res, error, 'Erro ao salvar modelo de documento', 500, true);
    }
  }

  static async saveModeloTermoAdesao(req: Request, res: Response): Promise<void> {
    try {
      const { modelo_documento_id, modelo } = req.body;
      if (!modelo_documento_id || modelo === undefined || modelo === null) {
        sendValidationError(res, 'ID do modelo de documento e modelo são obrigatórios');
        return;
      }
      const result = await ModeloDocumentoContentService.salvarConteudo(Number(modelo_documento_id), 'conteudo_adesao', modelo);
      if (result.success) {
        sendSuccess(res, result.data, result.message);
      } else {
        sendNotFound(res, result.message);
      }
    } catch (error) {
      sendError(res, error, 'Erro ao salvar modelo de termo de adesão', 500, true);
    }
  }

  static async saveModeloContratoPermanencia(req: Request, res: Response): Promise<void> {
    try {
      const { modelo_documento_id, modelo } = req.body;
      if (!modelo_documento_id || modelo === undefined || modelo === null) {
        sendValidationError(res, 'ID do modelo de documento e modelo são obrigatórios');
        return;
      }
      const result = await ModeloDocumentoContentService.salvarConteudo(Number(modelo_documento_id), 'conteudo_permanencia', modelo);
      if (result.success) {
        sendSuccess(res, result.data, result.message);
      } else {
        sendNotFound(res, result.message);
      }
    } catch (error) {
      sendError(res, error, 'Erro ao salvar modelo de contrato de permanência', 500, true);
    }
  }

  static async saveModeloRecibo(req: Request, res: Response): Promise<void> {
    try {
      const { modelo_documento_id, modelo } = req.body;
      if (!modelo_documento_id || modelo === undefined || modelo === null) {
        sendValidationError(res, 'ID do modelo de documento e modelo são obrigatórios');
        return;
      }
      const result = await ModeloDocumentoContentService.salvarConteudo(Number(modelo_documento_id), 'conteudo_recibo', modelo);
      if (result.success) {
        sendSuccess(res, result.data, result.message);
      } else {
        sendNotFound(res, result.message);
      }
    } catch (error) {
      sendError(res, error, 'Erro ao salvar modelo de recibo', 500, true);
    }
  }

  static async saveModeloCarta(req: Request, res: Response): Promise<void> {
    try {
      const { modelo_documento_id, modelo } = req.body;
      if (!modelo_documento_id || modelo === undefined || modelo === null) {
        sendValidationError(res, 'ID do modelo de documento e modelo são obrigatórios');
        return;
      }
      const result = await ModeloDocumentoContentService.salvarConteudo(Number(modelo_documento_id), 'conteudo_carta', modelo);
      if (result.success) {
        sendSuccess(res, result.data, result.message);
      } else {
        sendNotFound(res, result.message);
      }
    } catch (error) {
      sendError(res, error, 'Erro ao salvar modelo de carta de cobrança', 500, true);
    }
  }

  /**
   * Buscar todos os modelos de um modelo de documento
   */
  static async getModelosByModeloContrato(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const modeloDocumento = await ModeloDocumentoService.getById(id);

      if (!modeloDocumento) {
        sendNotFound(res, 'Modelo de documento não encontrado');
        return;
      }

      sendSuccess(res, {
        modelo_documento: modeloDocumento,
        modelo_contrato_conteudo: modeloDocumento.conteudo || '',
        modelo_termo_adesao: modeloDocumento.conteudo_adesao || '',
        modelo_contrato_permanencia: modeloDocumento.conteudo_permanencia || '',
        modelo_recibo: modeloDocumento.conteudo_recibo || '',
        modelo_carta: modeloDocumento.conteudo_carta || ''
      }, 'Modelos do modelo de documento recuperados com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar modelos do modelo de documento', 500, true);
    }
  }

  /**
   * Gerar PDF com conteúdo específico
   */
  static async generatePdfWithContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { conteudo } = req.body;

      const documento = await ModeloDocumentoService.getById(Number(id));
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

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${documento.nome}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      sendError(res, error, 'Erro ao gerar PDF com conteúdo', 500, true);
    }
  }

  static async generateTestPdfWithContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { cliente_id, conteudo } = req.body;

      const documento = await ModeloDocumentoService.getById(Number(id));
      if (!documento) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }

      let conteudoProcessado = conteudo;
      
      if (cliente_id) {
        const cliente = await ClienteService.getById(cliente_id);
        if (!cliente) {
          sendNotFound(res, 'Cliente não encontrado');
          return;
        }

        const contrato = await ContratoService.findAtivoByCliente(cliente.id);
        const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined;
        conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
          conteudo,
          {
            cliente,
            contrato: contrato || undefined
          },
          baseUrl
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

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${documento.nome}-teste.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      sendError(res, error, 'Erro ao gerar PDF de teste com conteúdo', 500, true);
    }
  }

  /**
   * Upload de imagem para documentos
   */
  static async uploadImagem(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        logger.warn('Upload de imagem (modelo documento) sem arquivo', {
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        sendValidationError(res, 'Arquivo não enviado');
        return;
      }

      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimes.includes(req.file.mimetype)) {
        if (req.file.path) {
          try {
            const fs = require('fs');
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch {}
        }
        sendValidationError(res, 'Tipo de arquivo inválido. Apenas imagens são permitidas (JPG, PNG, GIF, WEBP)');
        return;
      }

      const filePath = `/arquivos/documentos/${req.file.filename}`;
      // Construir URL completa da imagem
      const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : '';
      const fullUrl = `${baseUrl}${filePath}`;

      logger.info('Upload de imagem (modelo documento) concluído', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filePath,
        fullUrl
      });

      sendSuccess(res, {
        url: fullUrl,
        path: filePath
      });
    } catch (error) {
      sendError(res, error, 'Erro ao fazer upload de imagem', 500, true, {
        context: 'ModeloDocumentoController',
        action: 'uploadImagem'
      });
    }
  }
}

