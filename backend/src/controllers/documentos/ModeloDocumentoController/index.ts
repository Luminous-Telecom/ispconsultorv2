import { toPlain } from '../../../utils/toPlain';
import { Request, Response } from 'express';
import { ModeloDocumentoService } from '../../../services/documentos/ModeloDocumentoService';
import { ModeloDocumentoPdfService } from '../../../services/documentos/ModeloDocumentoPdfService';
import { ModeloDocumentoContentService } from '../../../services/documentos/ModeloDocumentoContentService';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { VariaveisDocumentoService } from '../../../services/documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendNotFound, sendValidationError, sendForbidden } from '../../../utils/responseUtils';
import { logger } from '../../../utils/logger';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { SaasPlanoLimitesService } from '../../../services/saas/SaasPlanoLimitesService';
import { parseOptionalQueryInt, queryString } from '../../../utils/listQuery';

function isModelValidationError(error: unknown): error is Error & { errors: Array<{ message?: string }> } {
  return error instanceof Error && Array.isArray((error as { errors?: unknown }).errors);
}

function pertenceEmpresa(doc: { empresa_id?: number | null }, empresaId: number | null): boolean {
  const eid = doc.empresa_id;
  if (empresaId == null) return true;
  return eid === empresaId || eid === null;
}

export class ModeloDocumentoController {
  /**
   * Listar todos os documentos do sistema
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const tipo = queryString(req.query.tipo);
      const empresaId = getEmpresaIdOrNull(req);

      const result = await ModeloDocumentoService.list({
        tipo,
        empresa_id: empresaId ?? undefined
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
      const empresaId = getEmpresaIdOrNull(req);

      const documento = await ModeloDocumentoService.getById(id);

      if (!documento || !pertenceEmpresa(documento, empresaId)) {
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

      const empresaId = documentoData.empresa_id ?? getEmpresaIdOrNull(req) ?? null;
      const limitError = await SaasPlanoLimitesService.validateLimiteCreate(
        empresaId,
        'cadastros_limite_modelos_documento'
      );
      if (limitError) {
        sendForbidden(res, limitError);
        return;
      }

      const documento = await ModeloDocumentoService.create({
        ...documentoData,
        empresa_id: empresaId
      });

      try {
        const empresaId = getEmpresaIdOrNull(req) ?? documento.empresa_id ?? null;
        await registrarCriacao(
          req as AuthenticatedRequest,
          'ModeloDocumento',
          documento.id,
          toPlain(documento) as unknown as Record<string, unknown>,
          undefined,
          empresaId
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, documento, 'Documento criado com sucesso', 201);
    } catch (error: unknown) {
      if (isModelValidationError(error)) {
        const errors = error.errors.map((err) => err.message ?? '');
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
      const empresaId = getEmpresaIdOrNull(req);

      const documento = await ModeloDocumentoService.getById(id);

      if (!documento || !pertenceEmpresa(documento, empresaId)) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }

      const dadosAnteriores = toPlain(documento);
      const payload = { ...documentoData };
      if (empresaId != null) payload.empresa_id = documento.empresa_id;
      const documentoAtualizado = await ModeloDocumentoService.update(id, payload);

      const dadosNovos = toPlain(documentoAtualizado) as unknown as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores as unknown as Record<string, unknown>, dadosNovos);

      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? documentoAtualizado.empresa_id ?? null;
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'ModeloDocumento',
          documentoAtualizado.id,
          dadosAnteriores as unknown as Record<string, unknown>,
          dadosNovos,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, documentoAtualizado, 'Documento atualizado com sucesso');
    } catch (error: unknown) {
      if (isModelValidationError(error)) {
        const errors = error.errors.map((err) => err.message ?? '');
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
      const empresaId = getEmpresaIdOrNull(req);

      const documento = await ModeloDocumentoService.getById(id);

      if (!documento || !pertenceEmpresa(documento, empresaId)) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }

      const dadosAnteriores = toPlain(documento);
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores as unknown as Record<string, unknown>);
      
      await ModeloDocumentoService.delete(id);

      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? documento.empresa_id ?? null;
        await registrarExclusao(
          req as AuthenticatedRequest,
          'ModeloDocumento',
          documento.id,
          dadosAnteriores as unknown as Record<string, unknown>,
          undefined,
          empresaIdAudit
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

      const empresaId = getEmpresaIdOrNull(req);
      const documentos = await ModeloDocumentoService.getByType(tipo, true, empresaId);

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

      const empresaId = getEmpresaIdOrNull(req);
      const documento = await ModeloDocumentoService.getDefaultByType(tipo, empresaId);

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
      const empresaId = getEmpresaIdOrNull(req);
      const tiposList = await ModeloDocumentoService.getTypes(empresaId);

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
      const empresaId = getEmpresaIdOrNull(req);
      const documento = await ModeloDocumentoService.getById(id);
      if (!documento || !pertenceEmpresa(documento, empresaId)) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }
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
      const empresaId = getEmpresaIdOrNull(req);
      const documento = await ModeloDocumentoService.getById(id);
      if (!documento || !pertenceEmpresa(documento, empresaId)) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }
      const cliente_id = queryString(req.query.cliente_id);
      const contrato_id = queryString(req.query.contrato_id);
      await ModeloDocumentoPdfService.gerarTestPdf(
        Number(id),
        cliente_id,
        contrato_id,
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
      const empresaId = getEmpresaIdOrNull(req);
      const doc = await ModeloDocumentoService.getById(modelo_documento_id);
      if (!doc || !pertenceEmpresa(doc, empresaId)) {
        sendNotFound(res, 'Modelo de documento não encontrado');
        return;
      }
      const dadosAnteriores = toPlain(doc) as unknown as Record<string, unknown>;
      const result = await ModeloDocumentoContentService.salvarConteudo(Number(modelo_documento_id), 'conteudo', modelo);
      if (result.success) {
        try {
          const docAtualizado = await ModeloDocumentoService.getById(modelo_documento_id);
          const empresaIdAudit = empresaId ?? doc.empresa_id ?? null;
          if (docAtualizado) {
            await registrarAtualizacao(
              req as AuthenticatedRequest,
              'ModeloDocumento',
              doc.id,
              dadosAnteriores,
              (toPlain(docAtualizado) ?? docAtualizado) as unknown as Record<string, unknown>,
              'Modelo contrato conteúdo atualizado',
              empresaIdAudit
            );
          }
        } catch (auditError) {
          // Não interromper o fluxo
        }
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
      const empresaId = getEmpresaIdOrNull(req);
      const doc = await ModeloDocumentoService.getById(modelo_documento_id);
      if (!doc || !pertenceEmpresa(doc, empresaId)) {
        sendNotFound(res, 'Modelo de documento não encontrado');
        return;
      }
      const dadosAnteriores = toPlain(doc) as unknown as Record<string, unknown>;
      const result = await ModeloDocumentoContentService.salvarConteudo(Number(modelo_documento_id), 'conteudo_adesao', modelo);
      if (result.success) {
        try {
          const docAtualizado = await ModeloDocumentoService.getById(modelo_documento_id);
          const empresaIdAudit = empresaId ?? doc.empresa_id ?? null;
          if (docAtualizado) {
            await registrarAtualizacao(
              req as AuthenticatedRequest,
              'ModeloDocumento',
              doc.id,
              dadosAnteriores,
              (toPlain(docAtualizado) ?? docAtualizado) as unknown as Record<string, unknown>,
              'Modelo termo adesão atualizado',
              empresaIdAudit
            );
          }
        } catch (auditError) {
          // Não interromper o fluxo
        }
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
      const empresaId = getEmpresaIdOrNull(req);
      const doc = await ModeloDocumentoService.getById(modelo_documento_id);
      if (!doc || !pertenceEmpresa(doc, empresaId)) {
        sendNotFound(res, 'Modelo de documento não encontrado');
        return;
      }
      const dadosAnteriores = toPlain(doc) as unknown as Record<string, unknown>;
      const result = await ModeloDocumentoContentService.salvarConteudo(Number(modelo_documento_id), 'conteudo_permanencia', modelo);
      if (result.success) {
        try {
          const docAtualizado = await ModeloDocumentoService.getById(modelo_documento_id);
          const empresaIdAudit = empresaId ?? doc.empresa_id ?? null;
          if (docAtualizado) {
            await registrarAtualizacao(
              req as AuthenticatedRequest,
              'ModeloDocumento',
              doc.id,
              dadosAnteriores,
              (toPlain(docAtualizado) ?? docAtualizado) as unknown as Record<string, unknown>,
              'Modelo contrato permanência atualizado',
              empresaIdAudit
            );
          }
        } catch (auditError) {
          // Não interromper o fluxo
        }
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
      const empresaId = getEmpresaIdOrNull(req);
      const doc = await ModeloDocumentoService.getById(modelo_documento_id);
      if (!doc || !pertenceEmpresa(doc, empresaId)) {
        sendNotFound(res, 'Modelo de documento não encontrado');
        return;
      }
      const dadosAnteriores = toPlain(doc) as unknown as Record<string, unknown>;
      const result = await ModeloDocumentoContentService.salvarConteudo(Number(modelo_documento_id), 'conteudo_recibo', modelo);
      if (result.success) {
        try {
          const docAtualizado = await ModeloDocumentoService.getById(modelo_documento_id);
          const empresaIdAudit = empresaId ?? doc.empresa_id ?? null;
          if (docAtualizado) {
            await registrarAtualizacao(
              req as AuthenticatedRequest,
              'ModeloDocumento',
              doc.id,
              dadosAnteriores,
              (toPlain(docAtualizado) ?? docAtualizado) as unknown as Record<string, unknown>,
              'Modelo recibo atualizado',
              empresaIdAudit
            );
          }
        } catch (auditError) {
          // Não interromper o fluxo
        }
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
      const empresaId = getEmpresaIdOrNull(req);
      const doc = await ModeloDocumentoService.getById(modelo_documento_id);
      if (!doc || !pertenceEmpresa(doc, empresaId)) {
        sendNotFound(res, 'Modelo de documento não encontrado');
        return;
      }
      const dadosAnteriores = toPlain(doc) as unknown as Record<string, unknown>;
      const result = await ModeloDocumentoContentService.salvarConteudo(Number(modelo_documento_id), 'conteudo_carta', modelo);
      if (result.success) {
        try {
          const docAtualizado = await ModeloDocumentoService.getById(modelo_documento_id);
          const empresaIdAudit = empresaId ?? doc.empresa_id ?? null;
          if (docAtualizado) {
            await registrarAtualizacao(
              req as AuthenticatedRequest,
              'ModeloDocumento',
              doc.id,
              dadosAnteriores,
              (toPlain(docAtualizado) ?? docAtualizado) as unknown as Record<string, unknown>,
              'Modelo carta atualizado',
              empresaIdAudit
            );
          }
        } catch (auditError) {
          // Não interromper o fluxo
        }
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
      const empresaId = getEmpresaIdOrNull(req);

      const modeloDocumento = await ModeloDocumentoService.getById(id);

      if (!modeloDocumento || !pertenceEmpresa(modeloDocumento, empresaId)) {
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
      const empresaId = getEmpresaIdOrNull(req);

      const documento = await ModeloDocumentoService.getById(Number(id));
      if (!documento || !pertenceEmpresa(documento, empresaId)) {
        sendNotFound(res, 'Documento não encontrado');
        return;
      }

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        conteudo,
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
      const empresaId = getEmpresaIdOrNull(req);

      const documento = await ModeloDocumentoService.getById(Number(id));
      if (!documento || !pertenceEmpresa(documento, empresaId)) {
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
        const { getEmpresaIdOrNull } = await import('../../../utils/tenantUtils');
        const empresaId = getEmpresaIdOrNull(req) ?? cliente.empresa_id ?? contrato?.empresa_id;
        conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
          conteudo,
          {
            cliente,
            contrato: contrato || undefined,
            empresaId
          },
          baseUrl
        );
      }

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        conteudoProcessado,
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

