import { Request, Response } from 'express';
import { ContratoPlanoAdicional } from '../models/ContratoPlanoAdicional';
import { Contrato } from '../models/Contrato';
import { Plano } from '../models/Plano';
import * as Joi from 'joi';
import { logger } from '../utils/logger';
import { isJoiError, getErrorMessage } from '../utils/errorUtils';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../services/AuditoriaService';
import { setAuditData } from '../middleware/auditMiddleware';
import type { AuthenticatedRequest } from '../types/auth';
//
export class ContratoPlanoAdicionalController {
  // Schema de validação para criação
  private static createSchema = Joi.object({
    contrato_id: Joi.number().integer().min(1).required(),
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
        res.status(400).json({
          success: false,
          message: 'ID do contrato inválido'
        });
        return;
      }

      const servicos = await ContratoPlanoAdicional.findAll({
        where: { contrato_id: parseInt(contrato_id) },
        include: [
          {
            association: 'plano',
            attributes: ['id', 'nome_plano', 'descricao', 'tipo_servico', 'valor_mensal', 'status']
          }
        ],
        order: [['created_at', 'DESC']]
      });

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

      res.json({
        success: true,
        data: servicosComValorFinal
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao listar serviços adicionais', {
        context: 'ContratoPlanoAdicionalController',
        action: 'index',
        error: errorMessage,
        stack: errorStack,
        contratoId: req.params.contratoId
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Adicionar serviço adicional ao contrato
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { contrato_id } = req.params;
      const value = await ContratoPlanoAdicionalController.createSchema.validateAsync(req.body);

      // Verificar se o contrato existe
      const contrato = await Contrato.findByPk(contrato_id);
      if (!contrato) {
        res.status(404).json({
          success: false,
          message: 'Contrato não encontrado'
        });
        return;
      }

      // Verificar se o plano existe
      const plano = await Plano.findByPk(value.plano_id);
      if (!plano) {
        res.status(404).json({
          success: false,
          message: 'Plano não encontrado'
        });
        return;
      }

      // Verificar se o plano já está vinculado ao contrato
      const servicoExistente = await ContratoPlanoAdicional.findOne({
        where: {
          contrato_id: parseInt(contrato_id),
          plano_id: value.plano_id
        }
      });

      if (servicoExistente) {
        res.status(400).json({
          success: false,
          message: 'Este plano já está vinculado ao contrato'
        });
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

      const servico = await ContratoPlanoAdicional.create({
        contrato_id: parseInt(contrato_id),
        plano_id: value.plano_id,
        desconto_percentual: value.desconto_percentual || null,
        desconto_valor: value.desconto_valor || null,
        valor_final: valorFinal,
        status: value.status || 'ativo',
        observacoes: value.observacoes || null
      });

      const servicoComPlano = await ContratoPlanoAdicional.findByPk(servico.id, {
        include: [
          {
            association: 'plano',
            attributes: ['id', 'nome_plano', 'descricao', 'tipo_servico', 'valor_mensal', 'status']
          }
        ]
      });

      await registrarCriacao(
        req as AuthenticatedRequest,
        'ContratoPlanoAdicional',
        servico.id,
        servicoComPlano?.toJSON() as Record<string, unknown>
      );

      res.status(201).json({
        success: true,
        message: 'Serviço adicional vinculado com sucesso',
        data: servicoComPlano
      });
    } catch (error: unknown) {
      if (isJoiError(error)) {
        res.status(400).json({
          success: false,
          message: getErrorMessage(error)
        });
        return;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao adicionar serviço adicional', {
        context: 'ContratoPlanoAdicionalController',
        action: 'create',
        error: errorMessage,
        stack: errorStack,
        contratoId: req.params.contratoId,
        body: req.body
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar serviço adicional
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const value = await ContratoPlanoAdicionalController.updateSchema.validateAsync(req.body);

      const servico = await ContratoPlanoAdicional.findByPk(id);

      if (!servico) {
        res.status(404).json({
          success: false,
          message: 'Serviço adicional não encontrado'
        });
        return;
      }

      // Se plano_id foi fornecido, verificar se o plano existe
      let planoIdParaUsar = servico.plano_id;
      if (value.plano_id && value.plano_id !== servico.plano_id) {
        const novoPlano = await Plano.findByPk(value.plano_id);
        if (!novoPlano) {
          res.status(404).json({
            success: false,
            message: 'Plano não encontrado'
          });
          return;
        }
        planoIdParaUsar = value.plano_id;
      }

      // Buscar plano para calcular valor_final (usar o novo plano se foi alterado)
      const plano = await Plano.findByPk(planoIdParaUsar);
      if (!plano) {
        res.status(404).json({
          success: false,
          message: 'Plano não encontrado'
        });
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

      await servico.update({
        plano_id: planoIdParaUsar,
        desconto_percentual: value.desconto_percentual !== undefined ? value.desconto_percentual : servico.desconto_percentual,
        desconto_valor: value.desconto_valor !== undefined ? value.desconto_valor : servico.desconto_valor,
        valor_final: valorFinal,
        status: value.status || servico.status,
        observacoes: value.observacoes !== undefined ? value.observacoes : servico.observacoes
      });

      const servicoAtualizado = await ContratoPlanoAdicional.findByPk(id, {
        include: [
          {
            association: 'plano',
            attributes: ['id', 'nome_plano', 'descricao', 'tipo_servico', 'valor_mensal', 'status']
          }
        ]
      });

      const dadosAnteriores = servico.toJSON() as Record<string, unknown>;
      const dadosNovos = servicoAtualizado?.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);

      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'ContratoPlanoAdicional',
        servico.id,
        dadosAnteriores,
        dadosNovos
      );

      res.json({
        success: true,
        message: 'Serviço adicional atualizado com sucesso',
        data: servicoAtualizado
      });
    } catch (error: unknown) {
      if (isJoiError(error)) {
        res.status(400).json({
          success: false,
          message: getErrorMessage(error)
        });
        return;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao atualizar serviço adicional', {
        context: 'ContratoPlanoAdicionalController',
        action: 'update',
        error: errorMessage,
        stack: errorStack,
        id: req.params.id,
        body: req.body
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Remover serviço adicional
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        res.status(400).json({
          success: false,
          message: 'ID do serviço adicional inválido'
        });
        return;
      }

      const servicoId = parseInt(id);
      const servico = await ContratoPlanoAdicional.findByPk(servicoId);
      
      if (!servico) {
        res.status(404).json({
          success: false,
          message: 'Serviço adicional não encontrado'
        });
        return;
      }

      const dadosAnteriores = servico.toJSON();
      await servico.destroy();

      await registrarExclusao(
        req as AuthenticatedRequest,
        'ContratoPlanoAdicional',
        servico.id,
        dadosAnteriores as Record<string, unknown>
      );

      res.json({
        success: true,
        message: 'Serviço adicional removido com sucesso'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao remover serviço adicional', {
        context: 'ContratoPlanoAdicionalController',
        action: 'delete',
        error: errorMessage,
        stack: errorStack,
        id: req.params.id
      });
      res.status(500).json({
        success: false,
        message: errorMessage
      });
    }
  }
}

