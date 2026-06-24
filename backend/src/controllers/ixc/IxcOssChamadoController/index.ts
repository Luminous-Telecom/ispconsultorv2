import { Request, Response } from 'express';
import {
  IxcOssChamadoService,
  OSS_CHAMADO_ACOES,
  type OssChamadoAcao,
} from '../../../services/externos/IxcOssChamadoService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { parseListQuery } from '../../../utils/listQuery';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class IxcOssChamadoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, sortColumn, sortDirection } = parseListQuery(req.query);
      const empresaId = getEmpresaIdOrNull(req);

      const result = await IxcOssChamadoService.list({
        page,
        limit,
        search,
        searchField,
        sortColumn,
        sortDirection,
      }, empresaId);

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar ordens de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'list',
        query: req.query,
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const chamado = await IxcOssChamadoService.getById(id, empresaId);

      if (!chamado) {
        sendNotFound(res, 'Ordem de serviço não encontrada');
        return;
      }

      sendSuccess(res, chamado);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'getById',
        id: req.params.id,
      });
    }
  }

  static async listMensagens(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const mensagens = await IxcOssChamadoService.listMensagens(id, empresaId);
      sendSuccess(res, mensagens);
    } catch (error) {
      sendError(res, error, 'Erro ao listar mensagens da ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'listMensagens',
        id: req.params.id,
      });
    }
  }

  static async deleteMensagem(req: Request, res: Response): Promise<void> {
    try {
      const { id, mensagemId } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      await IxcOssChamadoService.deleteMensagem(id, mensagemId, empresaId);
      sendSuccess(res, undefined, 'Mensagem excluída com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir mensagem da ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'deleteMensagem',
        id: req.params.id,
        mensagemId: req.params.mensagemId,
      });
    }
  }

  static async listArquivos(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const arquivos = await IxcOssChamadoService.listArquivos(id, empresaId);
      sendSuccess(res, arquivos);
    } catch (error) {
      sendError(res, error, 'Erro ao listar arquivos da ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'listArquivos',
        id: req.params.id,
      });
    }
  }

  static async createArquivo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);

      if (!req.file) {
        sendValidationError(res, 'Arquivo é obrigatório');
        return;
      }

      const descricao = String(req.body?.descricao ?? req.body?.nome ?? req.file.originalname ?? '').trim();
      const resultado = await IxcOssChamadoService.createArquivo(
        id,
        descricao,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        empresaId
      );

      sendSuccess(res, resultado, 'Arquivo anexado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao anexar arquivo na ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'createArquivo',
        id: req.params.id,
      });
    }
  }

  static async deleteArquivo(req: Request, res: Response): Promise<void> {
    try {
      const { id, arquivoId } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      await IxcOssChamadoService.deleteArquivo(id, arquivoId, empresaId);
      sendSuccess(res, undefined, 'Arquivo excluído com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir arquivo da ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'deleteArquivo',
        id: req.params.id,
        arquivoId: req.params.arquivoId,
      });
    }
  }

  static async downloadArquivo(req: Request, res: Response): Promise<void> {
    try {
      const { id, arquivoId } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const isView = req.query.view === 'true' || req.query.view === '1';

      const { buffer, nome, mimeType } = await IxcOssChamadoService.downloadArquivo(
        id,
        arquivoId,
        empresaId
      );

      res.setHeader('Content-Type', mimeType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        isView ? `inline; filename="${nome}"` : `attachment; filename="${nome}"`
      );

      if (!isView) {
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      }

      res.send(buffer);
    } catch (error) {
      sendError(res, error, 'Erro ao baixar arquivo da ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'downloadArquivo',
        id: req.params.id,
        arquivoId: req.params.arquivoId,
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const resultado = await IxcOssChamadoService.create(req.body, empresaId);
      sendSuccess(res, resultado, 'Ordem de serviço criada com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'create',
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const resultado = await IxcOssChamadoService.update(id, req.body, empresaId);
      sendSuccess(res, resultado, 'Ordem de serviço atualizada com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'update',
        id: req.params.id,
      });
    }
  }

  static async executeAcao(req: Request, res: Response): Promise<void> {
    try {
      const { id, acao } = req.params;

      if (!OSS_CHAMADO_ACOES.includes(acao as OssChamadoAcao)) {
        sendError(res, new Error('Ação inválida'), 'Ação inválida', 400);
        return;
      }

      const resultado = await IxcOssChamadoService.executeAcao(
        id,
        acao as OssChamadoAcao,
        req.body,
        getEmpresaIdOrNull(req)
      );

      sendSuccess(res, resultado, 'Ação executada com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao executar ação na ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'executeAcao',
        id: req.params.id,
        acao: req.params.acao,
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      await IxcOssChamadoService.delete(id, empresaId);
      sendSuccess(res, undefined, 'Ordem de serviço excluída com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'delete',
        id: req.params.id,
      });
    }
  }
}
