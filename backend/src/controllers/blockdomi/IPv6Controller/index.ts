import { Request, Response } from 'express';
import { IPv6Service } from '../../../services/blockdomi/IPv6Service';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { isValidIPv6 } from '../../../utils/sanitize';

export class IPv6Controller {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const ativo = req.query.ativo !== undefined ? req.query.ativo === 'true' : undefined;
      const sortColumn = req.query.sortColumn as string;
      const sortDirection = req.query.sortDirection as string;

      const result = await IPv6Service.list({
        page,
        limit,
        search,
        ativo,
        sortColumn,
        sortDirection
      });

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar IPv6', 500, true, {
        context: 'IPv6Controller',
        action: 'list',
        query: req.query
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const ipv6 = await IPv6Service.getById(id);

      if (!ipv6) {
        sendNotFound(res, 'IPv6 não encontrado');
        return;
      }

      sendSuccess(res, ipv6.toJSON());
    } catch (error) {
      sendError(res, error, 'Erro ao buscar IPv6', 500, true, {
        context: 'IPv6Controller',
        action: 'getById',
        ipv6Id: req.params.id
      });
    }
  }

  static async bulkCreate(req: Request, res: Response): Promise<void> {
    try {
      const { items, nome_oficio, data_inicio_bloqueio, data_fim_bloqueio, link_oficio_anatel, link_oficio_justica, link_planilha_dominios } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        sendValidationError(res, 'Informe a lista de IPv6 (items: string[]).');
        return;
      }

      const result = await IPv6Service.bulkCreate(items, {
        nome_oficio: nome_oficio ?? null,
        data_inicio_bloqueio: data_inicio_bloqueio ?? null,
        data_fim_bloqueio: data_fim_bloqueio ?? null,
        link_oficio_anatel: link_oficio_anatel ?? null,
        link_oficio_justica: link_oficio_justica ?? null,
        link_planilha_dominios: link_planilha_dominios ?? null
      });

      const parts = [`Criados ${result.created} IPv6`];
      if (result.updated > 0) parts.push(`atualizados ${result.updated}`);
      if (result.skipped > 0) parts.push(`ignorados ${result.skipped} duplicado(s)`);
      sendSuccess(res, result, parts.join(', ') + '.', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar IPv6 em lote', 500, true, {
        context: 'IPv6Controller',
        action: 'bulkCreate',
        body: req.body
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { ip } = req.body;

      if (!ip) {
        sendValidationError(res, 'IP é obrigatório');
        return;
      }

      if (!isValidIPv6(ip)) {
        sendValidationError(res, 'Informe um IPv6 válido (8 grupos hex separados por :). Ex: 2001:db8::1. Pode usar :: uma vez para comprimir zeros.');
        return;
      }

      const existente = await IPv6Service.findByIp(ip);
      if (existente) {
        sendValidationError(res, 'Já existe um IPv6 cadastrado com este valor.');
        return;
      }

      const ipv6Criado = await IPv6Service.create(req.body);
      
      // Registrar auditoria
      try {
        await registrarCriacao(
          req,
          'IPv6',
          ipv6Criado.id,
          ipv6Criado.toJSON() as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, ipv6Criado, 'IPv6 criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar IPv6', 500, true, {
        context: 'IPv6Controller',
        action: 'create',
        body: req.body
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const existingIPv6 = await IPv6Service.getById(id);
      if (!existingIPv6) {
        sendNotFound(res, 'IPv6 não encontrado');
        return;
      }
      
      const dadosAnteriores = existingIPv6.toJSON() as Record<string, unknown>;
      
      const { ip } = req.body;
      if (!ip) {
        sendValidationError(res, 'IP é obrigatório');
        return;
      }

      if (!isValidIPv6(ip)) {
        sendValidationError(res, 'Informe um IPv6 válido (8 grupos hex separados por :). Ex: 2001:db8::1. Pode usar :: uma vez para comprimir zeros.');
        return;
      }

      const existente = await IPv6Service.findByIp(ip);
      if (existente && Number(existente.id) !== Number(id)) {
        sendValidationError(res, 'Já existe um IPv6 cadastrado com este valor.');
        return;
      }

      const ipv6Atualizado = await IPv6Service.update(id, req.body);
      
      // Registrar auditoria
      const dadosNovos = ipv6Atualizado.toJSON() as Record<string, unknown>;
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        await registrarAtualizacao(
          req,
          'IPv6',
          ipv6Atualizado.id,
          dadosAnteriores,
          dadosNovos
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, ipv6Atualizado, 'IPv6 atualizado com sucesso!');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar IPv6', 500, true, {
        context: 'IPv6Controller',
        action: 'update',
        ipv6Id: req.params.id,
        body: req.body
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const ipv6 = await IPv6Service.getById(id);
      
      if (!ipv6) {
        sendNotFound(res, 'IPv6 não encontrado');
        return;
      }
      
      const dadosAnteriores = ipv6.toJSON() as Record<string, unknown>;
      
      await IPv6Service.delete(id);
      
      // Registrar auditoria
      try {
        await registrarExclusao(
          req,
          'IPv6',
          ipv6.id,
          dadosAnteriores
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, undefined, 'IPv6 excluído com sucesso!');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar IPv6', 500, true, {
        context: 'IPv6Controller',
        action: 'delete',
        ipv6Id: req.params.id
      });
    }
  }
}
