import { Request, Response } from 'express';
import { IxcAtendimentoService } from '../../../services/externos/IxcAtendimentoService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { parseListQuery } from '../../../utils/listQuery';
import { getEmpresaIdOrNull, getUsuarioIdOrNull } from '../../../utils/tenantUtils';
import { SuporteDocumentoPdfService } from '../../../services/documentos/SuporteDocumentoPdfService';

function parseOptionalClienteId(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export class IxcAtendimentoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, sortColumn, sortDirection } = parseListQuery(req.query);
      const empresaId = getEmpresaIdOrNull(req);
      const clienteId = parseOptionalClienteId(req.query.cliente_id);

      const result = await IxcAtendimentoService.list(
        {
          page,
          limit,
          search,
          searchField,
          sortColumn,
          sortDirection,
          cliente_id: clienteId ?? undefined,
          id_ticket_setor:
            typeof req.query.id_ticket_setor === 'string'
              ? req.query.id_ticket_setor
              : undefined,
          status: typeof req.query.status === 'string' ? req.query.status : undefined,
        },
        empresaId
      );

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar atendimentos', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'list',
        query: req.query,
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const clienteId = parseOptionalClienteId(req.query.cliente_id);
      const atendimento = await IxcAtendimentoService.getById(id, empresaId, clienteId);

      if (!atendimento) {
        sendNotFound(res, 'Atendimento não encontrado');
        return;
      }

      sendSuccess(res, atendimento);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar atendimento', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'getById',
        id: req.params.id,
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const resultado = await IxcAtendimentoService.create(
        req.body,
        empresaId,
        getUsuarioIdOrNull(req)
      );
      sendSuccess(res, resultado, 'Atendimento criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar atendimento', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'create',
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const resultado = await IxcAtendimentoService.update(id, req.body, empresaId);
      sendSuccess(res, resultado, 'Atendimento atualizado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar atendimento', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'update',
        id: req.params.id,
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const clienteId = parseOptionalClienteId(req.query.cliente_id);
      await IxcAtendimentoService.delete(id, empresaId, clienteId);
      sendSuccess(res, undefined, 'Atendimento excluído com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir atendimento', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'delete',
        id: req.params.id,
      });
    }
  }

  static async listMensagens(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const clienteId = parseOptionalClienteId(req.query.cliente_id);
      const mensagens = await IxcAtendimentoService.listMensagens(id, empresaId, clienteId);
      sendSuccess(res, mensagens);
    } catch (error) {
      sendError(res, error, 'Erro ao listar mensagens do atendimento', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'listMensagens',
        id: req.params.id,
      });
    }
  }

  static async createMensagem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const clienteId = parseOptionalClienteId(req.body?.cliente_id);
      const mensagem = String(req.body?.mensagem ?? '').trim();
      if (!mensagem) {
        sendValidationError(res, 'Informe a mensagem');
        return;
      }
      const resultado = await IxcAtendimentoService.createMensagem(
        id,
        mensagem,
        empresaId,
        clienteId,
        getUsuarioIdOrNull(req)
      );
      sendSuccess(res, resultado, 'Mensagem registrada com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao registrar mensagem do atendimento', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'createMensagem',
        id: req.params.id,
      });
    }
  }

  static async deleteMensagem(req: Request, res: Response): Promise<void> {
    try {
      const { id, mensagemId } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const clienteId = parseOptionalClienteId(req.query.cliente_id);
      await IxcAtendimentoService.deleteMensagem(id, mensagemId, empresaId, clienteId);
      sendSuccess(res, undefined, 'Mensagem excluída com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir mensagem do atendimento', 500, true, {
        context: 'IxcAtendimentoController',
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
      const clienteId = parseOptionalClienteId(req.query.cliente_id);
      const arquivos = await IxcAtendimentoService.listArquivos(id, empresaId, clienteId);
      sendSuccess(res, arquivos);
    } catch (error) {
      sendError(res, error, 'Erro ao listar arquivos do atendimento', 500, true, {
        context: 'IxcAtendimentoController',
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
      const resultado = await IxcAtendimentoService.createArquivo(
        id,
        descricao,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        empresaId
      );

      sendSuccess(res, resultado, 'Arquivo anexado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao anexar arquivo no atendimento', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'createArquivo',
        id: req.params.id,
      });
    }
  }

  static async deleteArquivo(req: Request, res: Response): Promise<void> {
    try {
      const { id, arquivoId } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      await IxcAtendimentoService.deleteArquivo(id, arquivoId, empresaId);
      sendSuccess(res, undefined, 'Arquivo excluído com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir arquivo do atendimento', 500, true, {
        context: 'IxcAtendimentoController',
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

      const { buffer, nome, mimeType } = await IxcAtendimentoService.downloadArquivo(
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
      sendError(res, error, 'Erro ao baixar arquivo do atendimento', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'downloadArquivo',
        id: req.params.id,
        arquivoId: req.params.arquivoId,
      });
    }
  }

  static async listOrdensServico(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const clienteId = parseOptionalClienteId(req.query.cliente_id);
      const ordens = await IxcAtendimentoService.listOrdensServico(id, empresaId, clienteId);
      sendSuccess(res, ordens);
    } catch (error) {
      sendError(res, error, 'Erro ao listar ordens de serviço do atendimento', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'listOrdensServico',
        id: req.params.id,
      });
    }
  }

  static async listDepartamentos(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, sortColumn, sortDirection } = parseListQuery(req.query);
      const empresaId = getEmpresaIdOrNull(req);
      const clienteId = parseOptionalClienteId(req.query.cliente_id);
      const result = await IxcAtendimentoService.listDepartamentos(
        { page, limit, search, searchField, sortColumn, sortDirection },
        empresaId,
        clienteId
      );
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar departamentos de atendimento', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'listDepartamentos',
      });
    }
  }

  static async imprimir(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      await SuporteDocumentoPdfService.gerarAtendimentoPdf(id, empresaId, req, res, {
        clienteId: parseOptionalClienteId(req.query.cliente_id),
      });
    } catch (error) {
      sendError(res, error, 'Erro ao imprimir atendimento', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'imprimir',
        id: req.params.id,
      });
    }
  }

  static async listTecnicos(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, sortColumn, sortDirection } = parseListQuery(req.query);
      const empresaId = getEmpresaIdOrNull(req);
      const clienteId = parseOptionalClienteId(req.query.cliente_id);
      const id_ticket_setor =
        typeof req.query.id_ticket_setor === 'string' ? req.query.id_ticket_setor : undefined;
      const result = await IxcAtendimentoService.listTecnicos(
        { page, limit, search, searchField, sortColumn, sortDirection, id_ticket_setor },
        empresaId,
        clienteId
      );
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar técnicos de atendimento', 500, true, {
        context: 'IxcAtendimentoController',
        action: 'listTecnicos',
      });
    }
  }
}
