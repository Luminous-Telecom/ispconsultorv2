import { Request, Response } from 'express';
import { DominioService } from '../../../services/blockdomi/DominioService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { sanitizeDominio } from '../../../utils/sanitize';

export class DominioController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const ativo = req.query.ativo !== undefined ? req.query.ativo === 'true' : undefined;
      const sortColumn = req.query.sortColumn as string;
      const sortDirection = req.query.sortDirection as string;

      const result = await DominioService.list({
        page,
        limit,
        search,
        ativo,
        sortColumn,
        sortDirection
      });

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar domínios', 500, true, {
        context: 'DominioController',
        action: 'list',
        query: req.query
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dominio = await DominioService.getById(id);

      if (!dominio) {
        sendNotFound(res, 'Domínio não encontrado');
        return;
      }

      sendSuccess(res, dominio.toJSON());
    } catch (error) {
      sendError(res, error, 'Erro ao buscar domínio', 500, true, {
        context: 'DominioController',
        action: 'getById',
        dominioId: req.params.id
      });
    }
  }

  static async bulkCreate(req: Request, res: Response): Promise<void> {
    try {
      const { items, nome_oficio, data_inicio_bloqueio, data_fim_bloqueio, link_oficio_anatel, link_oficio_justica, link_planilha_dominios } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        sendValidationError(res, 'Informe a lista de domínios (items: string[]).');
        return;
      }
      const dataInicio = data_inicio_bloqueio != null ? String(data_inicio_bloqueio).trim() : '';
      if (!dataInicio) {
        sendValidationError(res, 'Data início bloqueio é obrigatória no importe em lote.');
        return;
      }

      const result = await DominioService.bulkCreate(items, {
        nome_oficio: nome_oficio ?? null,
        data_inicio_bloqueio: data_inicio_bloqueio ?? null,
        data_fim_bloqueio: data_fim_bloqueio ?? null,
        link_oficio_anatel: link_oficio_anatel ?? null,
        link_oficio_justica: link_oficio_justica ?? null,
        link_planilha_dominios: link_planilha_dominios ?? null
      });

      const parts = [`Criados ${result.created} domínio(s)`];
      if (result.updated > 0) parts.push(`atualizados ${result.updated}`);
      if (result.skipped > 0) parts.push(`ignorados ${result.skipped} duplicado(s)`);
      sendSuccess(res, result, parts.join(', ') + '.', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar domínios em lote', 500, true, {
        context: 'DominioController',
        action: 'bulkCreate',
        body: req.body
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { dominio } = req.body;
      
      if (!dominio) {
        sendValidationError(res, 'Domínio é obrigatório');
        return;
      }

      const dominioLimpo = sanitizeDominio(dominio);
      if (!dominioLimpo) {
        sendValidationError(res, 'Informe o domínio sem protocolo (ex: meusite.com ou encurtador.com/abc123). Não use https:// ou http:// no início.');
        return;
      }

      const existente = await DominioService.findByDominio(dominioLimpo);
      if (existente) {
        sendValidationError(res, 'Já existe um domínio cadastrado com este valor.');
        return;
      }

      const dominioCriado = await DominioService.create({ ...req.body, dominio: dominioLimpo });
      
      // Registrar auditoria
      try {
        await registrarCriacao(
          req,
          'Dominio',
          dominioCriado.id,
          dominioCriado.toJSON() as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, dominioCriado, 'Domínio criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar domínio', 500, true, {
        context: 'DominioController',
        action: 'create',
        body: req.body
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const existingDominio = await DominioService.getById(id);
      if (!existingDominio) {
        sendNotFound(res, 'Domínio não encontrado');
        return;
      }
      
      const dadosAnteriores = existingDominio.toJSON() as Record<string, unknown>;
      
      const { dominio } = req.body;
      if (!dominio) {
        sendValidationError(res, 'Domínio é obrigatório');
        return;
      }

      const dominioLimpo = sanitizeDominio(dominio);
      if (!dominioLimpo) {
        sendValidationError(res, 'Informe o domínio sem protocolo (ex: meusite.com ou encurtador.com/abc123). Não use https:// ou http:// no início.');
        return;
      }

      const existente = await DominioService.findByDominio(dominioLimpo);
      if (existente && Number(existente.id) !== Number(id)) {
        sendValidationError(res, 'Já existe um domínio cadastrado com este valor.');
        return;
      }

      const dominioAtualizado = await DominioService.update(id, { ...req.body, dominio: dominioLimpo });
      
      // Registrar auditoria
      const dadosNovos = dominioAtualizado.toJSON() as Record<string, unknown>;
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        await registrarAtualizacao(
          req,
          'Dominio',
          dominioAtualizado.id,
          dadosAnteriores,
          dadosNovos
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, dominioAtualizado, 'Domínio atualizado com sucesso!');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar domínio', 500, true, {
        context: 'DominioController',
        action: 'update',
        dominioId: req.params.id,
        body: req.body
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const dominio = await DominioService.getById(id);
      
      if (!dominio) {
        sendNotFound(res, 'Domínio não encontrado');
        return;
      }
      
      const dadosAnteriores = dominio.toJSON() as Record<string, unknown>;
      
      await DominioService.delete(id);
      
      // Registrar auditoria
      try {
        await registrarExclusao(
          req,
          'Dominio',
          dominio.id,
          dadosAnteriores
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, undefined, 'Domínio excluído com sucesso!');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar domínio', 500, true, {
        context: 'DominioController',
        action: 'delete',
        dominioId: req.params.id
      });
    }
  }
}
