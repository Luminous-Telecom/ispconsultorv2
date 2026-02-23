import { Request, Response } from 'express';
import { Contrato } from '../../../models/contratos/Contrato';
import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { Banco } from '../../../models/cadastros/Banco';
import { ModeloDocumento } from '../../../models/documentos/ModeloDocumento';
import { ContratoPlanoAdicional } from '../../../models/contratos/ContratoPlanoAdicional';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { BancoService } from '../../../services/cadastros/BancoService';
import { PlanoService } from '../../../services/cadastros/PlanoService';
import { ContratoPlanoAdicionalService } from '../../../services/contratos/ContratoPlanoAdicionalService';
import { Transaction } from 'sequelize';
import * as Joi from 'joi';
import { logger } from '../../../utils/logger';
import { withTransaction } from '../../../utils/transaction';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendNotFound, sendValidationError, sendForbidden } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

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
    tipo_cobranca_contrato_id: Joi.number().integer().min(1).required(),
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
    tipo_cobranca_contrato_id: Joi.number().integer().min(1),
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
      const { page = 1, limit = 10, search = '', status, searchField, sortColumn, sortDirection, isento_mensalidade, plano_id, tipo_servico } = req.query;
      const empresaId = getEmpresaIdOrNull(req);
      const result = await ContratoService.list({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        status: status as string,
        searchField: searchField as string,
        sortColumn: sortColumn as string,
        sortDirection: sortDirection as string,
        isento_mensalidade: isento_mensalidade === 'true' ? true : isento_mensalidade === 'false' ? false : undefined,
        plano_id: plano_id ? Number(plano_id) : undefined,
        tipo_servico: tipo_servico as string | undefined,
        empresa_id: empresaId ?? undefined,
      });

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar contratos', 500, true, {
        context: 'ContratoController',
        action: 'index',
        query: req.query
      });
    }
  }

  // Listar contratos por cliente
  static async getByCliente(req: Request, res: Response): Promise<void> {
    try {
      const { clienteId } = req.params;
      const { sortColumn, sortDirection } = req.query;
      
      const result = await ContratoService.list({
        page: 1,
        limit: 1000,
        search: clienteId,
        searchField: 'cliente_id',
        sortColumn: sortColumn as string | undefined,
        sortDirection: (sortDirection as 'asc' | 'desc') || undefined
      });

      sendSuccess(res, result.data);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar contratos do cliente', 500, true, {
        context: 'ContratoController',
        action: 'getByCliente',
        clienteId: req.params.clienteId
      });
    }
  }

  // Buscar contrato por ID
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const contrato = await ContratoService.getById(id);
      
      if (!contrato) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      sendSuccess(res, contrato);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar contrato', 500, true, {
        context: 'ContratoController',
        action: 'show',
        contratoId: req.params.id
      });
    }
  }

  // Criar novo contrato
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = ContratoController.createSchema.validate(req.body);
      
      if (error) {
        // Converter para Record<string, string[]> esperado pelo sendValidationError
        const errorsByField: Record<string, string[]> = error.details.reduce((acc, detail) => {
          const field = detail.path.join('.') || 'general';
          if (!acc[field]) {
            acc[field] = [];
          }
          acc[field].push(detail.message);
          return acc;
        }, {} as Record<string, string[]>);
        sendValidationError(res, 'Dados inválidos', errorsByField);
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

      const empresaId = getEmpresaIdOrNull(req);
      if (empresaId !== null) {
        value.empresa_id = empresaId;
      }

      // Verificar se o cliente existe
      const cliente = await ClienteService.getById(value.cliente_id);
      if (!cliente) {
        sendNotFound(res, 'Cliente não encontrado');
        return;
      }

      // Verificar se o plano existe
      const plano = await PlanoService.getById(value.plano_id);
      if (!plano) {
        sendNotFound(res, 'Plano não encontrado');
        return;
      }

      // Verificar se o banco existe (se fornecido)
      if (value.conta_boleto) {
        const banco = await BancoService.getById(value.conta_boleto);
        if (!banco) {
          sendNotFound(res, 'Banco não encontrado');
          return;
        }
      }

      // Verificar se o modelo de documento existe (se fornecido)
      if (value.modelo_documento_id) {
        const { ModeloDocumentoService } = await import('../../../services/documentos/ModeloDocumentoService');
        const modeloDocumento = await ModeloDocumentoService.getById(value.modelo_documento_id);
        if (!modeloDocumento) {
          sendNotFound(res, 'Modelo de documento não encontrado');
          return;
        }
      }

      // Calcular valor_final se não fornecido
      if (!value.valor_final) {
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
        const contrato = await ContratoService.create(value, transaction);

        // Criar serviços adicionais se fornecidos
        const servicosCriados = [];
        if (temServicosAdicionais) {
          const { FinancialCalculationsService } = await import('../../../services/FinancialCalculationsService');
          
          for (const servicoData of servicosAdicionais) {
            // Validar plano do serviço adicional
            const planoAdicional = await PlanoService.getById(servicoData.plano_id, transaction);
            if (!planoAdicional) {
              throw new Error(`Plano adicional ${servicoData.plano_id} não encontrado`);
            }

            // Calcular valor final do serviço
            const valorFinal = FinancialCalculationsService.calcularValorFinal(
              parseFloat(planoAdicional.valor_mensal.toString()),
              {
                desconto_valor: servicoData.desconto_valor,
                desconto_percentual: servicoData.desconto_percentual
              }
            );

            // Criar serviço adicional
            const servico = await ContratoPlanoAdicionalService.create({
              contrato_id: contrato.id,
              plano_id: servicoData.plano_id,
              desconto_percentual: servicoData.desconto_percentual || null,
              desconto_valor: servicoData.desconto_valor || null,
              valor_final: valorFinal,
              status: servicoData.status || 'ativo',
              observacoes: servicoData.observacoes || null
            }, transaction);

            servicosCriados.push(servico);
          }
        }

        return { contrato, servicosAdicionais: servicosCriados };
      });

      // Registrar auditoria
      try {
        await registrarCriacao(
          req,
          'Contrato',
          resultado.contrato.id,
          resultado.contrato.toJSON() as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, {
        ...resultado.contrato.toJSON(),
        servicos_adicionais: resultado.servicosAdicionais
      }, `Contrato criado com sucesso${temServicosAdicionais ? ` e ${resultado.servicosAdicionais.length} serviço(s) adicional(is) vinculado(s)` : ''}`, 201);
    } catch (error: unknown) {
      // Tratar erro de constraint de unicidade
      if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
        logger.warn('Erro de constraint de unicidade ao criar contrato', {
          context: 'ContratoController',
          action: 'create'
        });
        sendError(res, error, 'Erro de constraint de unicidade no banco de dados', 409, false);
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
          sendNotFound(res, 'Modelo de documento não encontrado');
          return;
        }
      }
      
      sendError(res, error, 'Erro ao criar contrato', 500, true, {
        context: 'ContratoController',
        action: 'create',
        body: req.body
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
          action: 'update',
          details: error.details
        });
        // Converter para Record<string, string[]> esperado pelo sendValidationError
        const errorsByField: Record<string, string[]> = error.details.reduce((acc, detail) => {
          const field = detail.path.join('.') || 'general';
          if (!acc[field]) {
            acc[field] = [];
          }
          acc[field].push(detail.message);
          return acc;
        }, {} as Record<string, string[]>);
        sendValidationError(res, 'Dados inválidos', errorsByField);
        return;
      }

      const contrato = await ContratoService.getById(id);
      if (!contrato) {
        sendNotFound(res, 'Contrato não encontrado');
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

      let contratoAtualizado = await ContratoService.update(id, value);

      // Recalcular valor_final se plano ou descontos mudaram
      if (value.plano_id !== undefined || value.desconto_percentual !== undefined || value.desconto_valor !== undefined) {
        // Recalcular baseado no plano e descontos
        const plano = await contratoAtualizado.getPlano();
        let novoValorFinal = parseFloat(plano.valor_mensal.toString());

        // Sempre usar desconto em valor quando disponível (mais preciso)
        // Se não houver desconto em valor, calcular a partir do percentual
        if (contratoAtualizado.desconto_valor && contratoAtualizado.desconto_valor > 0) {
          const descontoValor = parseFloat(contratoAtualizado.desconto_valor.toString());
          novoValorFinal = Math.max(0, novoValorFinal - descontoValor);
        } else if (contratoAtualizado.desconto_percentual && contratoAtualizado.desconto_percentual > 0) {
          // Calcular valor do desconto a partir do percentual
          const descontoValor = novoValorFinal * (parseFloat(contratoAtualizado.desconto_percentual.toString()) / 100);
          novoValorFinal = Math.max(0, novoValorFinal - descontoValor);
        }

        // Arredondar para 2 casas decimais para evitar problemas de precisão
        const valorFinalArredondado = Math.round(novoValorFinal * 100) / 100;
        contratoAtualizado = await ContratoService.update(id, { valor_final: valorFinalArredondado });
      }
      
      // Registrar auditoria
      const dadosNovos = contratoAtualizado.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        await registrarAtualizacao(
          req,
          'Contrato',
          contrato.id,
          dadosAnteriores,
          dadosNovos
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, contrato, 'Contrato atualizado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar contrato', 500, true, {
        context: 'ContratoController',
        action: 'update',
        contratoId: req.params.id,
        body: req.body
      });
    }
  }

  // Excluir contrato
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const contrato = await ContratoService.getById(id);
      if (!contrato) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      // Verificar se contrato tem títulos associados
      const { TituloService } = await import('../../../services/financeiro/TituloService');
      const titulosCount = await TituloService.count({
        contrato_id: id
      });

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = contrato.toJSON() as Record<string, unknown>;

      if (titulosCount > 0) {
        sendForbidden(res, `Contrato possui ${titulosCount} título(s) financeiro(s) associado(s). Remova os títulos antes de excluir o contrato.`);
        return;
      }

      // Registrar auditoria
      try {
        await registrarExclusao(
          req,
          'Contrato',
          contrato.id,
          dadosAnteriores
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      await ContratoService.delete(id);

      sendSuccess(res, undefined, 'Contrato excluído com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir contrato', 500, true, {
        context: 'ContratoController',
        action: 'delete',
        contratoId: req.params.id
      });
    }
  }

  // Listar contratos ativos
  static async getAtivos(req: Request, res: Response): Promise<void> {
    try {
      const result = await ContratoService.list({
        page: 1,
        limit: 1000,
        status: 'ativo'
      });

      sendSuccess(res, result.data);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar contratos ativos', 500, true, {
        context: 'ContratoController',
        action: 'getAtivos'
      });
    }
  }
}
