import { Request, Response } from 'express';
import { ContratoPlanoAdicional } from '../../../models/contratos/ContratoPlanoAdicional';
import { ContratoPlanoAdicionalService } from '../../../services/contratos/ContratoPlanoAdicionalService';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { PlanoService } from '../../../services/cadastros/PlanoService';
import * as Joi from 'joi';
import { logger } from '../../../utils/logger';
import { isJoiError, getErrorMessage } from '../../../utils/errorUtils';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
//
export class ContratoPlanoAdicionalController {
  // Schema de validação para criação
  private static createSchema = Joi.object({
    plano_id: Joi.number().integer().min(1).required(),
    desconto_percentual: Joi.number().min(0).max(100).allow(null),
    desconto_valor: Joi.number().min(0).allow(null),
    status: Joi.string().valid('ativo', 'inativo', 'suspenso').default('ativo'),
    observacoes: Joi.string().allow(null, '')
  });

  // Schema de validação para atualização (sem campos obrigatórios)
  private static updateSchema = Joi.object({
    plano_id: Joi.number().integer().min(1).allow(null),
    desconto_percentual: Joi.number().min(0).max(100).allow(null),
    desconto_valor: Joi.number().min(0).allow(null),
    status: Joi.string().valid('ativo', 'inativo', 'suspenso'),
    observacoes: Joi.string().allow(null, '')
  });

  // Listar serviços adicionais de um contrato
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { contrato_id } = req.params;

      if (!contrato_id || isNaN(parseInt(contrato_id))) {
        sendValidationError(res, 'ID do contrato inválido');
        return;
      }

      const servicos = await ContratoPlanoAdicionalService.getByContrato(parseInt(contrato_id));

      // Calcular valor_final para cada serviço
      interface ServicoJson extends ReturnType<typeof servicos[0]['toJSON']> {
        valor_final?: number;
      }
      
      const servicosComValorFinal = await Promise.all(
        servicos.map(async (servico) => {
          const servicoJson = servico.toJSON() as ServicoJson;
          const valorFinal = await servico.getValorFinal();
          return {
            ...servicoJson,
            valor_final: valorFinal
          };
        })
      );

      sendSuccess(res, servicosComValorFinal);
    } catch (error) {
      sendError(res, error, 'Erro ao listar serviços adicionais', 500, true, {
        context: 'ContratoPlanoAdicionalController',
        action: 'index',
        contratoId: req.params.contrato_id
      });
    }
  }

  // Adicionar serviço adicional ao contrato
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { contrato_id } = req.params;
      const value = await ContratoPlanoAdicionalController.createSchema.validateAsync(req.body);

      // Verificar se o contrato existe
      const contrato = await ContratoService.getById(contrato_id);
      if (!contrato) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      // Verificar se o plano existe
      const plano = await PlanoService.getById(value.plano_id);
      if (!plano) {
        sendNotFound(res, 'Plano não encontrado');
        return;
      }

      // Verificar se o plano já está vinculado ao contrato
      const servicoExistente = await ContratoPlanoAdicionalService.findOne({
        where: {
          contrato_id: parseInt(contrato_id),
          plano_id: value.plano_id
        }
      });

      if (servicoExistente) {
        sendValidationError(res, 'Este plano já está vinculado ao contrato');
        return;
      }

      // Calcular valor_final
      let valorFinal = parseFloat(plano.valor_mensal.toString());
      if (value.desconto_valor && value.desconto_valor > 0) {
        valorFinal = Math.max(0, valorFinal - parseFloat(value.desconto_valor.toString()));
      } else if (value.desconto_percentual && value.desconto_percentual > 0) {
        const descontoValor = valorFinal * (parseFloat(value.desconto_percentual.toString()) / 100);
        valorFinal = Math.max(0, valorFinal - descontoValor);
      }
      valorFinal = Math.round(valorFinal * 100) / 100;

      const servico = await ContratoPlanoAdicionalService.create({
        contrato_id: parseInt(contrato_id),
        plano_id: value.plano_id,
        desconto_percentual: value.desconto_percentual || null,
        desconto_valor: value.desconto_valor || null,
        valor_final: valorFinal,
        status: value.status || 'ativo',
        observacoes: value.observacoes || null
      });

      const servicoComPlano = await ContratoPlanoAdicionalService.getById(servico.id, true);

      try {
        await registrarCriacao(
          req as AuthenticatedRequest,
          'ContratoPlanoAdicional',
          servico.id,
          servicoComPlano?.toJSON() as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, servicoComPlano, 'Serviço adicional vinculado com sucesso', 201);
    } catch (error: unknown) {
      if (isJoiError(error)) {
        sendValidationError(res, getErrorMessage(error));
        return;
      }
      sendError(res, error, 'Erro ao adicionar serviço adicional', 500, true, {
        context: 'ContratoPlanoAdicionalController',
        action: 'create',
        contratoId: req.params.contrato_id,
        body: req.body
      });
    }
  }

  // Atualizar serviço adicional
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const value = await ContratoPlanoAdicionalController.updateSchema.validateAsync(req.body);

      const servico = await ContratoPlanoAdicionalService.getById(id);

      if (!servico) {
        sendNotFound(res, 'Serviço adicional não encontrado');
        return;
      }

      // Se plano_id foi fornecido, verificar se o plano existe
      let planoIdParaUsar = servico.plano_id;
      if (value.plano_id && value.plano_id !== servico.plano_id) {
        const novoPlano = await PlanoService.getById(value.plano_id);
        if (!novoPlano) {
          sendNotFound(res, 'Plano não encontrado');
          return;
        }
        planoIdParaUsar = value.plano_id;
      }

      // Buscar plano para calcular valor_final (usar o novo plano se foi alterado)
      const plano = await PlanoService.getById(planoIdParaUsar);
      if (!plano) {
        sendNotFound(res, 'Plano não encontrado');
        return;
      }

      // Calcular valor_final
      let valorFinal = parseFloat(plano.valor_mensal.toString());
      if (value.desconto_valor && value.desconto_valor > 0) {
        valorFinal = Math.max(0, valorFinal - parseFloat(value.desconto_valor.toString()));
      } else if (value.desconto_percentual && value.desconto_percentual > 0) {
        const descontoValor = valorFinal * (parseFloat(value.desconto_percentual.toString()) / 100);
        valorFinal = Math.max(0, valorFinal - descontoValor);
      }
      valorFinal = Math.round(valorFinal * 100) / 100;

      await ContratoPlanoAdicionalService.update(id, {
        plano_id: planoIdParaUsar,
        desconto_percentual: value.desconto_percentual !== undefined ? value.desconto_percentual : servico.desconto_percentual,
        desconto_valor: value.desconto_valor !== undefined ? value.desconto_valor : servico.desconto_valor,
        valor_final: valorFinal,
        status: value.status || servico.status,
        observacoes: value.observacoes !== undefined ? value.observacoes : servico.observacoes
      });

      const servicoAtualizado = await ContratoPlanoAdicionalService.getById(id, true);

      const dadosAnteriores = servico.toJSON() as Record<string, unknown>;
      const dadosNovos = servicoAtualizado?.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);

      try {
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'ContratoPlanoAdicional',
          servico.id,
          dadosAnteriores,
          dadosNovos
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, servicoAtualizado, 'Serviço adicional atualizado com sucesso');
    } catch (error: unknown) {
      if (isJoiError(error)) {
        sendValidationError(res, getErrorMessage(error));
        return;
      }
      sendError(res, error, 'Erro ao atualizar serviço adicional', 500, true, {
        context: 'ContratoPlanoAdicionalController',
        action: 'update',
        id: req.params.id,
        body: req.body
      });
    }
  }

  // Remover serviço adicional
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        sendValidationError(res, 'ID do serviço adicional inválido');
        return;
      }

      const servicoId = parseInt(id);
      const servico = await ContratoPlanoAdicionalService.getById(servicoId);
      
      if (!servico) {
        sendNotFound(res, 'Serviço adicional não encontrado');
        return;
      }

      const dadosAnteriores = servico.toJSON();
      await ContratoPlanoAdicionalService.delete(servicoId);

      try {
        await registrarExclusao(
          req as AuthenticatedRequest,
          'ContratoPlanoAdicional',
          servico.id,
          dadosAnteriores as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, undefined, 'Serviço adicional removido com sucesso');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao remover serviço adicional', 500, true, {
        context: 'ContratoPlanoAdicionalController',
        action: 'delete',
        id: req.params.id
      });
    }
  }
}

