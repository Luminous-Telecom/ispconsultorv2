import { Request, Response } from 'express';
import { ClienteArquivoService, CreateClienteArquivoData, UpdateClienteArquivoData } from '../../../services/cadastros';
import { logger } from '../../../utils/logger';
import Joi from 'joi';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import type { AuthenticatedRequest } from '../../../types/auth';
import { ClienteArquivo } from '../../../models/clientes/ClienteArquivo';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class ClienteArquivoController {
  private static createSchema = Joi.object({
    cliente_id: Joi.number().integer().required(),
    nome: Joi.string().min(1).max(255).required(),
    tipo: Joi.string().valid('documento', 'foto', 'assinatura', 'outro').required(),
    descricao: Joi.string().allow(null, '').optional(),
    origem: Joi.string().valid('manual', 'assinatura_digital', 'sistema').default('manual'),
    referencia_id: Joi.number().integer().allow(null).optional(),
    referencia_tipo: Joi.string().max(100).allow(null, '').optional()
  });

  private static updateSchema = Joi.object({
    nome: Joi.string().min(1).max(255),
    descricao: Joi.string().allow(null, '')
  });

  /**
   * Lista arquivos de um cliente
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { cliente_id } = req.params;
      const { tipo, origem, sortColumn, sortDirection } = req.query;

      if (!cliente_id) {
        sendValidationError(res, 'cliente_id é obrigatório');
        return;
      }

      const arquivos = await ClienteArquivoService.list(Number(cliente_id), {
        tipo: tipo as string | undefined,
        origem: origem as string | undefined,
        sortColumn: sortColumn as string | undefined,
        sortDirection: sortDirection as string | undefined
      });

      sendSuccess(res, arquivos);
    } catch (error) {
      sendError(res, error, 'Erro ao listar arquivos do cliente', 500, true);
    }
  }

  /**
   * Busca arquivo por ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const arquivo = await ClienteArquivoService.getById(Number(id));

      if (!arquivo) {
        sendNotFound(res, 'Arquivo não encontrado');
        return;
      }

      sendSuccess(res, arquivo);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar arquivo', 500, true);
    }
  }

  /**
   * Cria novo arquivo
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      // Validar dados do body (excluindo arquivo que vem do multer)
      const { error, value } = ClienteArquivoController.createSchema.validate(req.body);

      if (error) {
        sendValidationError(res, error.details[0].message);
        return;
      }

      // Verificar se arquivo foi enviado
      if (!req.file) {
        sendValidationError(res, 'Arquivo é obrigatório');
        return;
      }

      const cliente = await ClienteService.getById(value.cliente_id);
      if (!cliente) {
        sendNotFound(res, 'Cliente não encontrado');
        return;
      }

      const createData: CreateClienteArquivoData = {
        cliente_id: value.cliente_id,
        empresa_id: cliente.empresa_id ?? getEmpresaIdOrNull(req) ?? null,
        nome: value.nome || req.file.originalname,
        tipo: value.tipo,
        arquivo: req.file,
        mime_type: req.file.mimetype,
        descricao: value.descricao || null,
        origem: value.origem || 'manual',
        referencia_id: value.referencia_id || null,
        referencia_tipo: value.referencia_tipo || null
      };

      const arquivo = await ClienteArquivoService.create(createData);

      try {
        await registrarCriacao(
          req as AuthenticatedRequest,
          'ClienteArquivo',
          arquivo.id,
          arquivo.toJSON() as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, arquivo, 'Arquivo criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar arquivo', 500, true);
    }
  }

  /**
   * Atualiza arquivo
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error, value } = ClienteArquivoController.updateSchema.validate(req.body);

      if (error) {
        sendValidationError(res, error.details[0].message);
        return;
      }

      const arquivoAntes = await ClienteArquivoService.getById(Number(id));
      const dadosAnteriores = arquivoAntes ? arquivoAntes.toJSON() : null;

      const arquivo = await ClienteArquivoService.update(Number(id), value as UpdateClienteArquivoData);

      const dadosNovos = arquivo.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores as Record<string, unknown>, dadosNovos);

      try {
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'ClienteArquivo',
          arquivo.id,
          dadosAnteriores as Record<string, unknown>,
          dadosNovos
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, arquivo, 'Arquivo atualizado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar arquivo', 500, true);
    }
  }

  /**
   * Deleta arquivo
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const arquivo = await ClienteArquivoService.getById(Number(id));
      const dadosAnteriores = arquivo ? arquivo.toJSON() : null;

      await ClienteArquivoService.delete(Number(id));

      if (arquivo && dadosAnteriores) {
        try {
          await registrarExclusao(
            req as AuthenticatedRequest,
            'ClienteArquivo',
            arquivo.id,
            dadosAnteriores as Record<string, unknown>
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }

      sendSuccess(res, undefined, 'Arquivo deletado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar arquivo', 500, true);
    }
  }

  /**
   * Download arquivo
   */
  static async download(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const arquivo = await ClienteArquivoService.getById(Number(id));

      if (!arquivo) {
        sendNotFound(res, 'Arquivo não encontrado');
        return;
      }

      const buffer = await ClienteArquivoService.getFileContent(Number(id));
      const isView = req.query.view === 'true';

      res.setHeader('Content-Type', arquivo.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', isView 
        ? `inline; filename="${arquivo.nome}"` 
        : `attachment; filename="${arquivo.nome}"`);
      
      if (!isView) {
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      }
      
      res.send(buffer);
    } catch (error) {
      sendError(res, error, 'Erro ao fazer download do arquivo', 500, true, {
        id: req.params.id
      });
    }
  }
}
