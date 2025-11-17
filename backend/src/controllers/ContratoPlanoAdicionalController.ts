import { Request, Response } from 'express';
import { ContratoPlanoAdicional } from '../models/ContratoPlanoAdicional';
import { Contrato } from '../models/Contrato';
import { Plano } from '../models/Plano';
import { Op } from 'sequelize';
import * as Joi from 'joi';
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
      const servicosComValorFinal = await Promise.all(
        servicos.map(async (servico) => {
          const servicoJson = servico.toJSON() as any;
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
      console.error('Erro ao listar serviços adicionais:', error);
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

      res.status(201).json({
        success: true,
        message: 'Serviço adicional vinculado com sucesso',
        data: servicoComPlano
      });
    } catch (error: any) {
      if (error.isJoi) {
        res.status(400).json({
          success: false,
          message: error.details[0].message
        });
        return;
      }
      console.error('Erro ao adicionar serviço adicional:', error);
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

      res.json({
        success: true,
        message: 'Serviço adicional atualizado com sucesso',
        data: servicoAtualizado
      });
    } catch (error: any) {
      if (error.isJoi) {
        res.status(400).json({
          success: false,
          message: error.details[0].message
        });
        return;
      }
      console.error('Erro ao atualizar serviço adicional:', error);
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

      await servico.destroy();

      res.json({
        success: true,
        message: 'Serviço adicional removido com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao remover serviço adicional:', error);
      const errorMessage = error?.message || 'Erro interno do servidor';
      res.status(500).json({
        success: false,
        message: errorMessage
      });
    }
  }
}

