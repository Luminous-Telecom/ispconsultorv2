import { Request, Response } from 'express';
import { PlanoService } from '../../../services/cadastros/PlanoService';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendNotFound, sendValidationError, sendForbidden } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class PlanoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const tipo_servico = req.query.tipo_servico as string;
      const sortColumn = req.query.sortColumn as string;
      const sortDirection = req.query.sortDirection as string;

      const empresaId = getEmpresaIdOrNull(req);

      const result = await PlanoService.list({
        page,
        limit,
        search,
        status,
        tipo_servico,
        sortColumn,
        sortDirection,
        empresa_id: empresaId ?? undefined,
      });

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar planos', 500, true, {
        context: 'PlanoController',
        action: 'list',
        query: req.query
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const plano = await PlanoService.getById(id);

      if (!plano) {
        sendNotFound(res, 'Plano não encontrado');
        return;
      }

      // Garantir que servicos_inclusos seja um array
      const planoData = plano.toJSON();
      if (typeof planoData.servicos_inclusos === 'string') {
        try {
          planoData.servicos_inclusos = JSON.parse(planoData.servicos_inclusos);
        } catch {
          planoData.servicos_inclusos = [];
        }
      }

      sendSuccess(res, planoData);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar plano', 500, true, {
        context: 'PlanoController',
        action: 'getById',
        planoId: req.params.id
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const body = { ...req.body, empresa_id: empresaId };
      
      const plano = await PlanoService.create(body);
      
      // Registrar auditoria
      try {
        await registrarCriacao(
          req,
          'Plano',
          plano.id,
          plano.toJSON() as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, plano, 'Plano criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar plano', 500, true, {
        context: 'PlanoController',
        action: 'create',
        body: req.body
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Verificar se o plano existe e capturar dados anteriores para auditoria
      const existingPlano = await PlanoService.getById(id);
      if (!existingPlano) {
        sendNotFound(res, 'Plano não encontrado');
        return;
      }
      
      const dadosAnteriores = existingPlano.toJSON() as Record<string, unknown>;
      
      // Validar dados obrigatórios
      const { nome_plano, tipo_servico, valor_mensal } = req.body;
      if (!nome_plano || !tipo_servico || valor_mensal === undefined) {
        sendValidationError(res, 'Nome do plano, tipo de serviço e valor mensal são obrigatórios');
        return;
      }
      
      const plano = await PlanoService.update(id, req.body);
      
      // Registrar auditoria
      const dadosNovos = plano.toJSON() as Record<string, unknown>;
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        await registrarAtualizacao(
          req,
          'Plano',
          plano.id,
          dadosAnteriores,
          dadosNovos
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, plano, 'Plano atualizado com sucesso!');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar plano', 500, true, {
        context: 'PlanoController',
        action: 'update',
        planId: req.params.id,
        body: req.body
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const plano = await PlanoService.getById(id);
      
      if (!plano) {
        sendNotFound(res, 'Plano não encontrado');
        return;
      }
      
      // Capturar dados anteriores para auditoria
      const dadosAnteriores = plano.toJSON() as Record<string, unknown>;
      
      try {
        await PlanoService.delete(id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        if (errorMessage.includes('título(s) associado(s)') || errorMessage.includes('contrato(s)')) {
          sendForbidden(res, errorMessage);
          return;
        }
        throw error;
      }
      
      // Registrar auditoria
      try {
        await registrarExclusao(
          req,
          'Plano',
          plano.id,
          dadosAnteriores
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, undefined, 'Plano excluído com sucesso!');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar plano', 500, true, {
        context: 'PlanoController',
        action: 'delete',
        planoId: req.params.id
      });
    }
  }

  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const planos = await PlanoService.findAtivos();

      sendSuccess(res, planos);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar planos ativos', 500, true, {
        context: 'PlanoController',
        action: 'getAtivos'
      });
    }
  }

  // Desativar/ativar plano
  static async toggleStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validar status
      if (!status || !['ativo', 'inativo'].includes(status)) {
        sendValidationError(res, 'Status deve ser: ativo ou inativo');
        return;
      }

      const plano = await PlanoService.updateStatus(id, status);

      sendSuccess(res, {
        id: plano.id,
        nome_plano: plano.nome_plano,
        status: plano.status
      }, `Plano ${status === 'ativo' ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      sendError(res, error, 'Erro ao alterar status do plano', 500, true, {
        context: 'PlanoController',
        action: 'toggleStatus',
        planoId: req.params.id,
        body: req.body
      });
    }
  }
}