import { Request, Response } from 'express';
import { IPv4Service } from '../../../services/blockdomi/IPv4Service';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { isValidIPv4 } from '../../../utils/sanitize';

export class IPv4Controller {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const ativo = req.query.ativo !== undefined ? req.query.ativo === 'true' : undefined;
      const sortColumn = req.query.sortColumn as string;
      const sortDirection = req.query.sortDirection as string;

      const result = await IPv4Service.list({
        page,
        limit,
        search,
        ativo,
        sortColumn,
        sortDirection
      });

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar IPv4', 500, true, {
        context: 'IPv4Controller',
        action: 'list',
        query: req.query
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const ipv4 = await IPv4Service.getById(id);

      if (!ipv4) {
        sendNotFound(res, 'IPv4 não encontrado');
        return;
      }

      sendSuccess(res, ipv4.toJSON());
    } catch (error) {
      sendError(res, error, 'Erro ao buscar IPv4', 500, true, {
        context: 'IPv4Controller',
        action: 'getById',
        ipv4Id: req.params.id
      });
    }
  }

  static async bulkCreate(req: Request, res: Response): Promise<void> {
    try {
      const { items, nome_oficio, data_inicio_bloqueio, data_fim_bloqueio, link_oficio_anatel, link_oficio_justica, link_planilha_dominios } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        sendValidationError(res, 'Informe a lista de IPv4 (items: string[]).');
        return;
      }

      const result = await IPv4Service.bulkCreate(items, {
        nome_oficio: nome_oficio ?? null,
        data_inicio_bloqueio: data_inicio_bloqueio ?? null,
        data_fim_bloqueio: data_fim_bloqueio ?? null,
        link_oficio_anatel: link_oficio_anatel ?? null,
        link_oficio_justica: link_oficio_justica ?? null,
        link_planilha_dominios: link_planilha_dominios ?? null
      });

      sendSuccess(res, result, `Criados ${result.created} IPv4, ignorados ${result.skipped} duplicado(s).`, 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar IPv4 em lote', 500, true, {
        context: 'IPv4Controller',
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

      if (!isValidIPv4(ip)) {
        sendValidationError(res, 'Informe um IPv4 válido com 4 octetos (ex: 192.168.1.1). Não use pontos no final.');
        return;
      }

      const existente = await IPv4Service.findByIp(ip);
      if (existente) {
        sendValidationError(res, 'Já existe um IPv4 cadastrado com este valor.');
        return;
      }

      const ipv4Criado = await IPv4Service.create(req.body);
      
      // Registrar auditoria
      try {
        await registrarCriacao(
          req,
          'IPv4',
          ipv4Criado.id,
          ipv4Criado.toJSON() as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, ipv4Criado, 'IPv4 criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar IPv4', 500, true, {
        context: 'IPv4Controller',
        action: 'create',
        body: req.body
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const existingIPv4 = await IPv4Service.getById(id);
      if (!existingIPv4) {
        sendNotFound(res, 'IPv4 não encontrado');
        return;
      }
      
      const dadosAnteriores = existingIPv4.toJSON() as Record<string, unknown>;
      
      const { ip } = req.body;
      if (!ip) {
        sendValidationError(res, 'IP é obrigatório');
        return;
      }

      if (!isValidIPv4(ip)) {
        sendValidationError(res, 'Informe um IPv4 válido com 4 octetos (ex: 192.168.1.1). Não use pontos no final.');
        return;
      }

      const existente = await IPv4Service.findByIp(ip);
      if (existente && Number(existente.id) !== Number(id)) {
        sendValidationError(res, 'Já existe um IPv4 cadastrado com este valor.');
        return;
      }

      const ipv4Atualizado = await IPv4Service.update(id, req.body);
      
      // Registrar auditoria
      const dadosNovos = ipv4Atualizado.toJSON() as Record<string, unknown>;
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        await registrarAtualizacao(
          req,
          'IPv4',
          ipv4Atualizado.id,
          dadosAnteriores,
          dadosNovos
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, ipv4Atualizado, 'IPv4 atualizado com sucesso!');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar IPv4', 500, true, {
        context: 'IPv4Controller',
        action: 'update',
        ipv4Id: req.params.id,
        body: req.body
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const ipv4 = await IPv4Service.getById(id);
      
      if (!ipv4) {
        sendNotFound(res, 'IPv4 não encontrado');
        return;
      }
      
      const dadosAnteriores = ipv4.toJSON() as Record<string, unknown>;
      
      await IPv4Service.delete(id);
      
      // Registrar auditoria
      try {
        await registrarExclusao(
          req,
          'IPv4',
          ipv4.id,
          dadosAnteriores
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, undefined, 'IPv4 excluído com sucesso!');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar IPv4', 500, true, {
        context: 'IPv4Controller',
        action: 'delete',
        ipv4Id: req.params.id
      });
    }
  }
}
