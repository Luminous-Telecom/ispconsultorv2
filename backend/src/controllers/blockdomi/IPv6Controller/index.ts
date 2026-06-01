import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { IPv6Service } from '../../../services/blockdomi/IPv6Service';
import { IPv6 } from '../../../models/blockdomi/IPv6';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { isValidIPv6 } from '../../../utils/sanitize';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { parseListQuery } from '../../../utils/listQuery';

export class IPv6Controller {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, ativo, sortColumn, sortDirection } = parseListQuery(req.query);

      const result = await IPv6Service.list({
        page,
        limit,
        search,
        searchField,
        ativo,
        sortColumn,
        sortDirection,
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
      const { items, nome_oficio, data_inicio_bloqueio, data_fim_bloqueio, link_oficio_anatel, link_oficio_justica, link_planilha_dominios, numero_sei_anatel } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        sendValidationError(res, 'Informe a lista de IPv6 (items: string[]).');
        return;
      }
      const dataInicio = data_inicio_bloqueio != null ? String(data_inicio_bloqueio).trim() : '';
      if (!dataInicio) {
        sendValidationError(res, 'Data início bloqueio é obrigatória no importe em lote.');
        return;
      }

      const empresaIdAudit = getEmpresaIdOrNull(req) ?? null;
      const result = await IPv6Service.bulkCreate(items, {
        nome_oficio: nome_oficio ?? null,
        data_inicio_bloqueio: data_inicio_bloqueio ?? null,
        data_fim_bloqueio: data_fim_bloqueio ?? null,
        link_oficio_anatel: link_oficio_anatel ?? null,
        link_oficio_justica: link_oficio_justica ?? null,
        link_planilha_dominios: link_planilha_dominios ?? null,
        numero_sei_anatel: numero_sei_anatel != null && String(numero_sei_anatel).trim() !== '' ? String(numero_sei_anatel).trim() : null,
        empresa_id: empresaIdAudit
      });

      try {
        const allIds = [...result.createdIds, ...result.updatedIds];
        if (allIds.length > 0) {
          const ipv6s = await IPv6.findAll({ where: { id: { [Op.in]: allIds } } });
          const ipv6Map = new Map(ipv6s.map((d) => [d.id, d.toJSON() as Record<string, unknown>]));
          for (const id of result.createdIds) {
            const dados = ipv6Map.get(id);
            if (dados) await registrarCriacao(req, 'IPv6', id, dados, 'Importação em lote', empresaIdAudit);
          }
          for (const id of result.updatedIds) {
            const dados = ipv6Map.get(id);
            if (dados) await registrarAtualizacao(req, 'IPv6', id, { id }, dados, 'Importação em lote', empresaIdAudit);
          }
        }
      } catch (auditError) {
        // Não interromper o fluxo
      }

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

      const ipv6Criado = await IPv6Service.create({
        ...req.body,
        empresa_id: req.body.empresa_id ?? getEmpresaIdOrNull(req) ?? null
      });
      
      // Registrar auditoria
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? ipv6Criado.empresa_id ?? null;
        await registrarCriacao(
          req,
          'IPv6',
          ipv6Criado.id,
          ipv6Criado.toJSON() as Record<string, unknown>,
          undefined,
          empresaIdAudit
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
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? ipv6Atualizado.empresa_id ?? null;
        await registrarAtualizacao(
          req,
          'IPv6',
          ipv6Atualizado.id,
          dadosAnteriores,
          dadosNovos,
          undefined,
          empresaIdAudit
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
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? ipv6.empresa_id ?? null;
        await registrarExclusao(
          req,
          'IPv6',
          ipv6.id,
          dadosAnteriores,
          undefined,
          empresaIdAudit
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

  static async bulkDelete(req: Request, res: Response): Promise<void> {
    try {
      const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
      if (ids.length === 0) {
        sendValidationError(res, 'Informe os IDs para exclusão (ids: number[]).');
        return;
      }

      const idsNum = ids.map((id: unknown) => Number(id)).filter((n: number) => !Number.isNaN(n));
      const empresaIdAudit = getEmpresaIdOrNull(req) ?? null;

      const ipv6sAntes = idsNum.length > 0 ? await IPv6.findAll({ where: { id: { [Op.in]: idsNum } } }) : [];
      const { deleted, versao } = await IPv6Service.bulkDelete(ids);

      try {
        for (const d of ipv6sAntes) {
          await registrarExclusao(req, 'IPv6', d.id, d.toJSON() as Record<string, unknown>, 'Exclusão em lote', empresaIdAudit);
        }
      } catch (auditError) {
        // Não interromper o fluxo
      }
      sendSuccess(
        res,
        { deleted, versao },
        `Excluído(s) ${deleted} IPv6. Versão da operação: ${versao}.`,
        200
      );
    } catch (error) {
      sendError(res, error, 'Erro ao excluir IPv6 em massa', 500, true, {
        context: 'IPv6Controller',
        action: 'bulkDelete',
        body: req.body
      });
    }
  }
}
