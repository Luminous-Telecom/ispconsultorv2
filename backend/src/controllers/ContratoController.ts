import { Request, Response } from 'express';
import { Contrato } from '../models/Contrato';
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
    data_inicio: Joi.date().allow(null, '').optional(),
    data_fim: Joi.date().allow(null, '').optional(),
    status: Joi.string().valid('ativo', 'inativo', 'suspenso').default('ativo'),
    observacoes: Joi.string().allow(null, ''),
    isento_mensalidade: Joi.boolean().default(false),
    dia_vencimento: Joi.number().min(1).max(31).allow(null),
    conta_boleto: Joi.number().integer().min(1).allow(null),
    data_validade_desconto: Joi.date().allow(null, '').optional()
  });

  // Schema de validação para atualização
  private static updateSchema = Joi.object({
    plano_id: Joi.number().integer().min(1),
    desconto_percentual: Joi.number().min(0).max(100).allow(null),
    desconto_valor: Joi.number().min(0).allow(null),
    data_inicio: Joi.date().allow(null, '').optional(),
    data_fim: Joi.date().allow(null, '').optional(),
    status: Joi.string().valid('ativo', 'inativo', 'suspenso'),
    observacoes: Joi.string().allow(null, ''),
    isento_mensalidade: Joi.boolean(),
    dia_vencimento: Joi.number().min(1).max(31).allow(null),
    conta_boleto: Joi.number().integer().min(1).allow(null),
    data_validade_desconto: Joi.date().allow(null, '').optional()
  });

  // Listar contratos por cliente
  static async getByCliente(req: Request, res: Response): Promise<void> {
    try {
      const { clienteId } = req.params;
      
      const contratos = await Contrato.findAll({
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
      
      const contrato = await Contrato.findByPk(id, {
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

      // Normalizar strings vazias para null
      if (value.data_inicio === '') value.data_inicio = null;
      if (value.data_fim === '') value.data_fim = null;
      if (value.data_validade_desconto === '') value.data_validade_desconto = null;

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

      // Verificar se já existe um contrato para o mesmo cliente, plano e data
      const contratoExistente = await Contrato.findOne({
        where: {
          cliente_id: value.cliente_id,
          plano_id: value.plano_id,
          data_inicio: value.data_inicio
        }
      });

      if (contratoExistente) {
        res.status(409).json({
          success: false,
          message: 'Já existe um contrato para este cliente, plano e data de início'
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

      const contrato = await Contrato.create(value);

      res.status(201).json({
        success: true,
        message: 'Contrato criado com sucesso',
        data: contrato
      });
    } catch (error: any) {
      console.error('Erro ao criar contrato:', error);
      
      // Tratar erro de constraint de unicidade
      if (error.name === 'SequelizeUniqueConstraintError') {
        res.status(409).json({
          success: false,
          message: 'Já existe um contrato para este cliente, plano e data de início'
        });
        return;
      }
      
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
      
      // Log do body recebido para debug
      console.log('Update contrato - Body recebido:', JSON.stringify(req.body, null, 2));
      
      const { error, value } = ContratoController.updateSchema.validate(req.body, {
        stripUnknown: true // Ignorar campos não definidos no schema (como 'id')
      });
      
      if (error) {
        console.error('Erro de validação do contrato:', error.details);
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type
          }))
        });
        return;
      }

      // Normalizar strings vazias para null
      if (value.data_inicio === '') value.data_inicio = null;
      if (value.data_fim === '') value.data_fim = null;
      if (value.data_validade_desconto === '') value.data_validade_desconto = null;

      const contrato = await Contrato.findByPk(id);
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
      
      const contrato = await Contrato.findByPk(id);
      if (!contrato) {
        res.status(404).json({
          success: false,
          message: 'Contrato não encontrado'
        });
        return;
      }

      // Verificar se contrato tem títulos associados
      const { Titulo } = await import('../models/Titulo');
      const titulosCount = await Titulo.count({
        where: {
          contrato_id: id
        }
      });

      if (titulosCount > 0) {
        res.status(409).json({
          success: false,
          error: 'Não é possível excluir contrato',
          message: `Contrato possui ${titulosCount} título(s) financeiro(s) associado(s). Remova os títulos antes de excluir o contrato.`
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
      const contratos = await Contrato.findAll({
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
