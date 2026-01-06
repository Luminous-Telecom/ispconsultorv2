import { Request, Response } from 'express';
import { Contrato } from '../../../models/Contrato';
import { Cliente } from '../../../models/Cliente';
import { Plano } from '../../../models/Plano';
import { Banco } from '../../../models/Banco';
import { ModeloDocumento } from '../../../models/ModeloDocumento';
import { ContratoPlanoAdicional } from '../../../models/ContratoPlanoAdicional';
import { Op, WhereOptions, Transaction } from 'sequelize';
import { sequelize } from '../../../config/database';
import * as Joi from 'joi';
import { logger } from '../../../utils/logger';
import { withTransaction } from '../../../utils/transaction';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { setAuditData } from '../../../middleware/auditMiddleware';

export class ContratoController {
  // Função auxiliar para normalizar data (evitar problemas de timezone)
  private static normalizeDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    
    if (typeof value === 'string') {
      // Parsear string YYYY-MM-DD diretamente para evitar conversão de timezone
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      // Fallback para Date normal se formato diferente
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    
    return null;
  }

  // Schema de validação para criação
  private static createSchema = Joi.object({
    cliente_id: Joi.number().integer().min(1).required(),
    plano_id: Joi.number().integer().min(1).required(),
    desconto_percentual: Joi.number().min(0).max(100).allow(null),
    desconto_valor: Joi.number().min(0).allow(null),
    // Aceitar string (YYYY-MM-DD) ou Date para evitar conversão de timezone pelo Joi
    data_inicio: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, '').optional(),
    data_fim: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, '').optional(),
    status: Joi.string().valid('ativo', 'inativo', 'suspenso').default('ativo'),
    observacoes: Joi.string().allow(null, ''),
    isento_mensalidade: Joi.boolean().default(false),
    dia_vencimento_id: Joi.number().integer().min(1).required(),
    conta_boleto: Joi.number().integer().min(1).required(),
    data_validade_desconto: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, '').optional(),
    modelo_documento_id: Joi.number().integer().min(1).required(),
    endereco: Joi.string().max(255).allow(null, '').optional(),
    numero: Joi.string().max(20).allow(null, '').optional(),
    complemento: Joi.string().max(100).allow(null, '').optional(),
    bairro: Joi.string().max(100).allow(null, '').optional(),
    cidade: Joi.string().max(100).allow(null, '').optional(),
    estado: Joi.string().length(2).allow(null, '').optional(),
    usar_endereco_cliente: Joi.boolean().default(false).optional()
  });

  // Schema de validação para atualização
  private static updateSchema = Joi.object({
    plano_id: Joi.number().integer().min(1),
    desconto_percentual: Joi.number().min(0).max(100).allow(null),
    desconto_valor: Joi.number().min(0).allow(null),
    // Aceitar string (YYYY-MM-DD) ou Date para evitar conversão de timezone pelo Joi
    data_inicio: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, '').optional(),
    data_fim: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, '').optional(),
    status: Joi.string().valid('ativo', 'inativo', 'suspenso'),
    observacoes: Joi.string().allow(null, ''),
    isento_mensalidade: Joi.boolean(),
    dia_vencimento_id: Joi.number().integer().min(1),
    conta_boleto: Joi.number().integer().min(1),
    data_validade_desconto: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, '').optional(),
    modelo_documento_id: Joi.number().integer().min(1),
    endereco: Joi.string().max(255).allow(null, '').optional(),
    numero: Joi.string().max(20).allow(null, '').optional(),
    complemento: Joi.string().max(100).allow(null, '').optional(),
    bairro: Joi.string().max(100).allow(null, '').optional(),
    cidade: Joi.string().max(100).allow(null, '').optional(),
    estado: Joi.string().length(2).allow(null, '').optional(),
    usar_endereco_cliente: Joi.boolean().allow(null).optional()
  });

  // Listar todos os contratos com paginação
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, search = '', status, searchField } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      const whereClause: WhereOptions = {};
      
      if (search) {
        const searchString = typeof search === 'string' ? search : String(search);
        const searchPattern = `%${searchString}%`;
        const escapedSearch = searchString.replace(/'/g, "''");
        // Se um campo específico foi selecionado, buscar apenas nele
        if (searchField && typeof searchField === 'string') {
          // Buscar em um campo específico
          if (searchField === 'cliente') {
            (whereClause as Record<symbol, unknown>)[Op.or] = [
              sequelize.literal(`EXISTS (SELECT 1 FROM clientes WHERE clientes.id = contratos.cliente_id AND clientes.razao_social LIKE '${escapedSearch}')`)
            ];
          } else if (searchField === 'plano') {
            (whereClause as Record<symbol, unknown>)[Op.or] = [
              sequelize.literal(`EXISTS (SELECT 1 FROM planos WHERE planos.id = contratos.plano_id AND planos.nome_plano LIKE '${escapedSearch}')`)
            ];
          } else {
            // Para outros campos diretos
            (whereClause as Record<symbol, unknown>)[Op.or] = [
              { [searchField]: { [Op.like]: searchPattern } }
            ];
          }
        } else {
          // Buscar em múltiplos campos se nenhum campo específico for fornecido
          (whereClause as Record<symbol, unknown>)[Op.or] = [
            { id: { [Op.like]: searchPattern } },
            { status: { [Op.like]: searchPattern } },
            { valor_final: { [Op.like]: searchPattern } },
            sequelize.literal(`EXISTS (SELECT 1 FROM clientes WHERE clientes.id = contratos.cliente_id AND clientes.razao_social LIKE '${escapedSearch}')`),
            sequelize.literal(`EXISTS (SELECT 1 FROM planos WHERE planos.id = contratos.plano_id AND planos.nome_plano LIKE '${escapedSearch}')`)
          ];
        }
      }

      if (status) {
        whereClause.status = status;
      }

      const { count, rows } = await Contrato.findAndCountAll({
        where: whereClause,
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { model: Banco, as: 'bancoBoleto' }
        ],
        order: [['id', 'DESC']], // Maior ID para o menor
        limit: limitNum,
        offset
      });

      res.json({
        data: rows,
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao listar contratos', {
        context: 'ContratoController',
        action: 'index',
        error: errorMessage,
        stack: errorStack,
        query: req.query
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar contratos do cliente', {
        context: 'ContratoController',
        action: 'getByCliente',
        error: errorMessage,
        stack: errorStack,
        clienteId: req.params.clienteId
      });
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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar contrato', {
        context: 'ContratoController',
        action: 'show',
        error: errorMessage,
        stack: errorStack,
        contratoId: req.params.id
      });
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

      // Normalizar datas para evitar problemas de timezone
      value.data_inicio = ContratoController.normalizeDate(value.data_inicio);
      value.data_fim = ContratoController.normalizeDate(value.data_fim);
      value.data_validade_desconto = ContratoController.normalizeDate(value.data_validade_desconto);

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

      // Verificar se o modelo de documento existe (se fornecido)
      if (value.modelo_documento_id) {
        const modeloDocumento = await ModeloDocumento.findByPk(value.modelo_documento_id);
        if (!modeloDocumento) {
          res.status(404).json({
            success: false,
            message: 'Modelo de documento não encontrado'
          });
          return;
        }
      }

      // Calcular valor_final se não fornecido
      if (!value.valor_final) {
        const plano = await Plano.findByPk(value.plano_id);
        if (plano) {
          let valorFinal = parseFloat(plano.valor_mensal.toString());
          
          // Sempre usar desconto em valor quando disponível (mais preciso)
          // Se não houver desconto em valor, calcular a partir do percentual
          if (value.desconto_valor && parseFloat(value.desconto_valor.toString()) > 0) {
            const descontoValor = parseFloat(value.desconto_valor.toString());
            valorFinal = valorFinal - descontoValor;
          } else if (value.desconto_percentual && value.desconto_percentual > 0) {
            // Calcular valor do desconto a partir do percentual
            const descontoValor = valorFinal * (parseFloat(value.desconto_percentual.toString()) / 100);
            valorFinal = valorFinal - descontoValor;
          }
          
          // Garantir que o valor não seja negativo
          if (valorFinal < 0) {
            valorFinal = 0;
          }
          
          // Arredondar para 2 casas decimais para evitar problemas de precisão
          value.valor_final = Math.round(valorFinal * 100) / 100;
        }
      }

      // Verificar se há serviços adicionais para criar junto
      const servicosAdicionais = req.body.servicos_adicionais;
      const temServicosAdicionais = Array.isArray(servicosAdicionais) && servicosAdicionais.length > 0;

      // Criar contrato e serviços adicionais dentro de uma transação
      const resultado = await withTransaction(async (transaction: Transaction) => {
        // Criar contrato
        const contrato = await Contrato.create(value, { transaction });

        // Criar serviços adicionais se fornecidos
        const servicosCriados = [];
        if (temServicosAdicionais) {
          for (const servicoData of servicosAdicionais) {
            // Validar plano do serviço adicional
            const planoAdicional = await Plano.findByPk(servicoData.plano_id, { transaction });
            if (!planoAdicional) {
              throw new Error(`Plano adicional ${servicoData.plano_id} não encontrado`);
            }

            // Calcular valor final do serviço
            let valorFinal = parseFloat(planoAdicional.valor_mensal.toString());
            if (servicoData.desconto_valor && servicoData.desconto_valor > 0) {
              valorFinal = Math.max(0, valorFinal - parseFloat(servicoData.desconto_valor.toString()));
            } else if (servicoData.desconto_percentual && servicoData.desconto_percentual > 0) {
              const descontoValor = valorFinal * (parseFloat(servicoData.desconto_percentual.toString()) / 100);
              valorFinal = Math.max(0, valorFinal - descontoValor);
            }
            valorFinal = Math.round(valorFinal * 100) / 100;

            // Criar serviço adicional
            const servico = await ContratoPlanoAdicional.create({
              contrato_id: contrato.id,
              plano_id: servicoData.plano_id,
              desconto_percentual: servicoData.desconto_percentual || null,
              desconto_valor: servicoData.desconto_valor || null,
              valor_final: valorFinal,
              status: servicoData.status || 'ativo',
              observacoes: servicoData.observacoes || null
            }, { transaction });

            servicosCriados.push(servico);
          }
        }

        return { contrato, servicosAdicionais: servicosCriados };
      });

      // Registrar auditoria
      await registrarCriacao(
        req,
        'Contrato',
        resultado.contrato.id,
        resultado.contrato.toJSON() as Record<string, unknown>
      );

      res.status(201).json({
        success: true,
        message: `Contrato criado com sucesso${temServicosAdicionais ? ` e ${resultado.servicosAdicionais.length} serviço(s) adicional(is) vinculado(s)` : ''}`,
        data: {
          ...resultado.contrato.toJSON(),
          servicos_adicionais: resultado.servicosAdicionais
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : undefined;
      
      // Tratar erro de constraint de unicidade
      if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
        logger.warn('Erro de constraint de unicidade ao criar contrato', {
          context: 'ContratoController',
          action: 'create',
          error: errorMessage
        });
        res.status(409).json({
          success: false,
          message: 'Erro de constraint de unicidade no banco de dados'
        });
        return;
      }
      
      // Tratar erro de constraint de chave estrangeira
      if (error instanceof Error && error.name === 'SequelizeForeignKeyConstraintError') {
        interface ForeignKeyError extends Error {
          table?: string;
          fields?: string[];
        }
        const fkError = error as ForeignKeyError;
        if (fkError.table === 'modelo_documento' || fkError.fields?.includes('modelo_documento_id')) {
          logger.warn('Modelo de documento não encontrado ao criar contrato', {
            context: 'ContratoController',
            action: 'create',
            table: fkError.table,
            fields: fkError.fields
          });
          res.status(404).json({
            success: false,
            message: 'Modelo de documento não encontrado'
          });
          return;
        }
      }
      
      logger.error('Erro ao criar contrato', {
        context: 'ContratoController',
        action: 'create',
        error: errorMessage,
        stack: errorStack,
        name: errorName,
        body: req.body
      });
      
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
      
      const { error, value } = ContratoController.updateSchema.validate(req.body, {
        stripUnknown: true // Ignorar campos não definidos no schema (como 'id')
      });
      
      if (error) {
        logger.warn('Erro de validação do contrato', {
          context: 'ContratoController',
          action: 'create',
          details: error.details
        });
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

      const contrato = await Contrato.findByPk(id);
      if (!contrato) {
        res.status(404).json({
          success: false,
          message: 'Contrato não encontrado'
        });
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = contrato.toJSON() as Record<string, unknown>;

      // Normalizar datas inválidas para null
      if (value.data_fim === 'Invalid date' || value.data_fim === '' || (typeof value.data_fim === 'string' && isNaN(Date.parse(value.data_fim)))) {
        delete value.data_fim;
      }
      if (value.data_validade_desconto === 'Invalid date' || value.data_validade_desconto === '' || (typeof value.data_validade_desconto === 'string' && isNaN(Date.parse(value.data_validade_desconto)))) {
        delete value.data_validade_desconto;
      }

      // Normalizar datas para evitar problemas de timezone
      value.data_inicio = ContratoController.normalizeDate(value.data_inicio);
      value.data_fim = ContratoController.normalizeDate(value.data_fim);
      value.data_validade_desconto = ContratoController.normalizeDate(value.data_validade_desconto);

      await contrato.update(value);

      // Recalcular valor_final se plano ou descontos mudaram
      if (value.plano_id !== undefined || value.desconto_percentual !== undefined || value.desconto_valor !== undefined) {
        // Recarregar contrato para pegar valores atualizados
        await contrato.reload();
        
        // Recalcular baseado no plano e descontos
        const plano = await contrato.getPlano();
        let novoValorFinal = parseFloat(plano.valor_mensal.toString());

        // Sempre usar desconto em valor quando disponível (mais preciso)
        // Se não houver desconto em valor, calcular a partir do percentual
        if (contrato.desconto_valor && contrato.desconto_valor > 0) {
          const descontoValor = parseFloat(contrato.desconto_valor.toString());
          novoValorFinal = Math.max(0, novoValorFinal - descontoValor);
        } else if (contrato.desconto_percentual && contrato.desconto_percentual > 0) {
          // Calcular valor do desconto a partir do percentual
          const descontoValor = novoValorFinal * (parseFloat(contrato.desconto_percentual.toString()) / 100);
          novoValorFinal = Math.max(0, novoValorFinal - descontoValor);
        }

        // Arredondar para 2 casas decimais para evitar problemas de precisão
        const valorFinalArredondado = Math.round(novoValorFinal * 100) / 100;
        await contrato.update({ valor_final: valorFinalArredondado });
      }

      // Recarregar contrato para obter dados atualizados
      await contrato.reload();
      
      // Registrar auditoria
      const dadosNovos = contrato.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      await registrarAtualizacao(
        req,
        'Contrato',
        contrato.id,
        dadosAnteriores,
        dadosNovos
      );

      res.json({
        success: true,
        message: 'Contrato atualizado com sucesso',
        data: contrato
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao atualizar contrato', {
        context: 'ContratoController',
        action: 'update',
        error: errorMessage,
        stack: errorStack,
        contratoId: req.params.id,
        body: req.body
      });
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
      const { Titulo } = await import('../../../models/Titulo');
      const titulosCount = await Titulo.count({
        where: {
          contrato_id: id
        }
      });

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = contrato.toJSON() as Record<string, unknown>;

      if (titulosCount > 0) {
        res.status(409).json({
          success: false,
          error: 'Não é possível excluir contrato',
          message: `Contrato possui ${titulosCount} título(s) financeiro(s) associado(s). Remova os títulos antes de excluir o contrato.`
        });
        return;
      }

      // Registrar auditoria
      await registrarExclusao(
        req,
        'Contrato',
        contrato.id,
        dadosAnteriores
      );

      await contrato.destroy();

      res.json({
        success: true,
        message: 'Contrato excluído com sucesso'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao excluir contrato', {
        context: 'ContratoController',
        action: 'delete',
        error: errorMessage,
        stack: errorStack,
        contratoId: req.params.id
      });
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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar contratos ativos', {
        context: 'ContratoController',
        action: 'getAtivos',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
