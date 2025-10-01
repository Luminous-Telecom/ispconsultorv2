import { Request, Response } from 'express';
import { ClientePlano } from '../models/ClientePlano';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import * as Joi from 'joi';

export class ContratoController {
  // Schema de validação para criação
  private static createSchema = Joi.object({
    cliente_id: Joi.number().integer().min(1).required(),
    plano_id: Joi.number().integer().min(1).required(),
    desconto_percentual: Joi.number().min(0).max(100).allow(null),
    desconto_valor: Joi.number().min(0).allow(null),
    data_inicio: Joi.date().allow(null),
    data_fim: Joi.date().allow(null),
    status: Joi.string().valid('ativo', 'inativo', 'suspenso').default('ativo'),
    observacoes: Joi.string().allow(null, ''),
    isento_mensalidade: Joi.boolean().default(false),
    dia_vencimento: Joi.number().min(1).max(31).allow(null),
    conta_boleto: Joi.number().integer().min(1).allow(null),
    data_validade_desconto: Joi.date().allow(null)
  });

  // Schema de validação para atualização
  private static updateSchema = Joi.object({
    plano_id: Joi.number().integer().min(1),
    desconto_percentual: Joi.number().min(0).max(100).allow(null),
    desconto_valor: Joi.number().min(0).allow(null),
    data_inicio: Joi.date().allow(null),
    data_fim: Joi.date().allow(null),
    status: Joi.string().valid('ativo', 'inativo', 'suspenso'),
    observacoes: Joi.string().allow(null, ''),
    isento_mensalidade: Joi.boolean(),
    dia_vencimento: Joi.number().min(1).max(31).allow(null),
    conta_boleto: Joi.number().integer().min(1).allow(null),
    data_validade_desconto: Joi.date().allow(null)
  });

  // Listar contratos por cliente
  static async getByCliente(req: Request, res: Response): Promise<void> {
    try {
      const { clienteId } = req.params;
      
      const contratos = await ClientePlano.findAll({
        where: { cliente_id: clienteId },
        include: [
          { model: Plano, as: 'plano' },
          { model: Banco, as: 'bancoBoleto' }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json(contratos);
    } catch (error) {
      console.error('Erro ao buscar contratos do cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Buscar contrato por ID
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const contrato = await ClientePlano.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { model: Banco, as: 'bancoBoleto' }
        ]
      });

      if (!contrato) {
        res.status(404).json({
          success: false,
          message: 'Contrato não encontrado'
        });
        return;
      }

      res.json(contrato);
    } catch (error) {
      console.error('Erro ao buscar contrato:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Criar novo contrato
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = ContratoController.createSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      // Verificar se o cliente existe
      const cliente = await Cliente.findByPk(value.cliente_id);
      if (!cliente) {
        res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
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

      // Verificar se o banco existe (se fornecido)
      if (value.conta_boleto) {
        const banco = await Banco.findByPk(value.conta_boleto);
        if (!banco) {
          res.status(404).json({
            success: false,
            message: 'Banco não encontrado'
          });
          return;
        }
      }

      // Calcular valor_final se não fornecido
      if (!value.valor_final) {
        const plano = await Plano.findByPk(value.plano_id);
        if (plano) {
          let valorFinal = parseFloat(plano.valor_mensal.toString());
          
          // Aplicar desconto percentual
          if (value.desconto_percentual && value.desconto_percentual > 0) {
            const desconto = (parseFloat(value.desconto_percentual) / 100) * valorFinal;
            valorFinal -= desconto;
          }
          
          // Aplicar desconto em valor
          if (value.desconto_valor && parseFloat(value.desconto_valor) > 0) {
            valorFinal -= parseFloat(value.desconto_valor);
          }
          
          // Garantir que o valor não seja negativo
          if (valorFinal < 0) {
            valorFinal = 0;
          }
          
          value.valor_final = valorFinal.toFixed(2);
        }
      }

      const contrato = await ClientePlano.create(value);

      res.status(201).json({
        success: true,
        message: 'Contrato criado com sucesso',
        data: contrato
      });
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar contrato
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error, value } = ContratoController.updateSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const contrato = await ClientePlano.findByPk(id);
      if (!contrato) {
        res.status(404).json({
          success: false,
          message: 'Contrato não encontrado'
        });
        return;
      }

      // Verificar se o plano existe (se fornecido)
      if (value.plano_id) {
        const plano = await Plano.findByPk(value.plano_id);
        if (!plano) {
          res.status(404).json({
            success: false,
            message: 'Plano não encontrado'
          });
          return;
        }
      }

      // Verificar se o banco existe (se fornecido)
      if (value.conta_boleto) {
        const banco = await Banco.findByPk(value.conta_boleto);
        if (!banco) {
          res.status(404).json({
            success: false,
            message: 'Banco não encontrado'
          });
          return;
        }
      }

      await contrato.update(value);

      res.json({
        success: true,
        message: 'Contrato atualizado com sucesso',
        data: contrato
      });
    } catch (error) {
      console.error('Erro ao atualizar contrato:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Excluir contrato
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const contrato = await ClientePlano.findByPk(id);
      if (!contrato) {
        res.status(404).json({
          success: false,
          message: 'Contrato não encontrado'
        });
        return;
      }

      await contrato.destroy();

      res.json({
        success: true,
        message: 'Contrato excluído com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar contratos ativos
  static async getAtivos(req: Request, res: Response): Promise<void> {
    try {
      const contratos = await ClientePlano.findAll({
        where: { status: 'ativo' },
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { model: Banco, as: 'bancoBoleto' }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json(contratos);
    } catch (error) {
      console.error('Erro ao buscar contratos ativos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
