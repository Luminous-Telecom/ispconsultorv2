import { Request, Response } from 'express';
import { Contrato } from '../../../models/contratos/Contrato';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { BancoService } from '../../../services/cadastros/BancoService';
import { PlanoService } from '../../../services/cadastros/PlanoService';
import { ContratoPlanoAdicionalService } from '../../../services/contratos/ContratoPlanoAdicionalService';
import { Transaction } from 'sequelize';
import * as Joi from 'joi';
import { logger } from '../../../utils/logger';
import { divergenciasUpdateNoOp } from '../../../services/sistema/SistemaLogOperacionalService';
import { withTransaction } from '../../../utils/transaction';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendNotFound, sendValidationError, sendForbidden } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { SaasPlanoLimitesService } from '../../../services/saas/SaasPlanoLimitesService';
import {
  isQueryFlagTrue,
  parseListQuery,
  parseOptionalQueryInt,
  parseTriStateBoolean,
  queryString,
} from '../../../utils/listQuery';
import { joiErrorsToFieldMap } from '../../../utils/validationUtils';
import { ContratoDataLoader } from '../../../services/scheduler/RoutineExecutionService/helpers/ContratoDataLoader';
import { ContratoTituloProcessor } from '../../../services/scheduler/RoutineExecutionService/helpers/ContratoTituloProcessor';
import { TituloGenerationHelper } from '../../../services/scheduler/RoutineExecutionService/helpers/TituloGenerationHelper';

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

  /** Compara desconto/valor vindo do body vs instância (DECIMAL/string/number; null ≈ 0) */
  private static valoresMonetariosOuDecimaisEquivalentes(a: unknown, b: unknown): boolean {
    const norm = (x: unknown): number | null => {
      if (x === null || x === undefined || x === '') return 0;
      const n = Number(String(x).trim().replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const na = norm(a);
    const nb = norm(b);
    if (na === null || nb === null) {
      return String(a ?? '').trim() === String(b ?? '').trim();
    }
    return Math.abs(na - nb) < 1e-6;
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
      const {
        page,
        limit,
        search,
        status,
        searchField,
        sortColumn,
        sortDirection,
      } = parseListQuery(req.query, { defaultLimit: 10 });
      const emAtrasoFlag = isQueryFlagTrue(req.query, 'em_atraso');
      const empresaId = getEmpresaIdOrNull(req);
      const result = await ContratoService.list({
        page,
        limit,
        search: search ?? '',
        status: emAtrasoFlag ? undefined : status,
        searchField,
        sortColumn,
        sortDirection,
        isento_mensalidade: parseTriStateBoolean(req.query.isento_mensalidade),
        plano_id: parseOptionalQueryInt(req.query.plano_id),
        cliente_id: parseOptionalQueryInt(req.query.cliente_id),
        tipo_servico: queryString(req.query.tipo_servico),
        em_atraso: emAtrasoFlag,
        excluir_em_atraso: isQueryFlagTrue(req.query, 'excluir_em_atraso') && !emAtrasoFlag,
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
      const { sortColumn, sortDirection } = parseListQuery(req.query);
      const empresaId = getEmpresaIdOrNull(req);

      const result = await ContratoService.list({
        page: 1,
        limit: 1000,
        search: clienteId,
        searchField: 'cliente_id',
        sortColumn,
        sortDirection,
        empresa_id: empresaId ?? undefined,
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
      const empresaId = getEmpresaIdOrNull(req);
      
      const contrato = await ContratoService.getById(id);
      
      if (!contrato) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      if (empresaId !== null && contrato.empresa_id !== empresaId) {
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
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
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

      const limitError = await SaasPlanoLimitesService.validateLimiteCreate(
        empresaId,
        'cadastros_limite_contratos'
      );
      if (limitError) {
        sendForbidden(res, limitError);
        return;
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

      // Verificar se o modelo de documento existe e pertence à empresa (se fornecido)
      if (value.modelo_documento_id) {
        const { ModeloDocumentoService } = await import('../../../services/documentos/ModeloDocumentoService');
        const modeloDocumento = await ModeloDocumentoService.getById(value.modelo_documento_id);
        const empresaId = getEmpresaIdOrNull(req);
        const pertenceEmpresa = (doc: { empresa_id?: number | null }) =>
          empresaId == null || doc.empresa_id === empresaId || doc.empresa_id === null;
        if (!modeloDocumento || !pertenceEmpresa(modeloDocumento)) {
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
              empresa_id: contrato.empresa_id ?? null,
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
        const empresaId = getEmpresaIdOrNull(req) ?? resultado.contrato.empresa_id ?? null;
        await registrarCriacao(
          req,
          'Contrato',
          resultado.contrato.id,
          resultado.contrato.toJSON() as Record<string, unknown>,
          undefined,
          empresaId
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
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }

      const contrato = await ContratoService.getById(id);
      if (!contrato) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      // Verificar modelo de documento (se estiver sendo atualizado)
      if (value.modelo_documento_id != null) {
        const { ModeloDocumentoService } = await import('../../../services/documentos/ModeloDocumentoService');
        const modeloDocumento = await ModeloDocumentoService.getById(value.modelo_documento_id);
        const empresaId = getEmpresaIdOrNull(req);
        const pertenceEmpresa = (doc: { empresa_id?: number | null }) =>
          empresaId == null || doc.empresa_id === empresaId || doc.empresa_id === null;
        if (!modeloDocumento || !pertenceEmpresa(modeloDocumento)) {
          sendNotFound(res, 'Modelo de documento não encontrado');
          return;
        }
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

      // Normalizar só datas enviadas (campos omitidos não viram null no update)
      if ('data_inicio' in value) {
        value.data_inicio = ContratoController.normalizeDate(
          value.data_inicio as string | Date | null | undefined
        );
      }
      if ('data_fim' in value) {
        value.data_fim = ContratoController.normalizeDate(
          value.data_fim as string | Date | null | undefined
        );
      }
      if ('data_validade_desconto' in value) {
        value.data_validade_desconto = ContratoController.normalizeDate(
          value.data_validade_desconto as string | Date | null | undefined
        );
      }

      let contratoAtualizado = await ContratoService.update(id, value);

      const planoIdMudou =
        value.plano_id !== undefined && Number(value.plano_id) !== Number(contrato.plano_id);
      const descontoPctMudou =
        value.desconto_percentual !== undefined &&
        !ContratoController.valoresMonetariosOuDecimaisEquivalentes(
          value.desconto_percentual,
          contrato.desconto_percentual
        );
      const descontoValorMudou =
        value.desconto_valor !== undefined &&
        !ContratoController.valoresMonetariosOuDecimaisEquivalentes(
          value.desconto_valor,
          contrato.desconto_valor
        );

      // Recalcular valor_final só se plano ou descontos mudaram de fato
      if (planoIdMudou || descontoPctMudou || descontoValorMudou) {
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

      const auditoriaLogUpdateDiff =
        process.env.AUDITORIA_LOG_UPDATE_DIFF === '1' ||
        process.env.AUDITORIA_LOG_UPDATE_DIFF === 'true';
      if (auditoriaLogUpdateDiff) {
        logger.info({
          message: 'AUDITORIA_UPDATE: Contrato — estado antes de registrarAtualizacao',
          context: 'ContratoController',
          action: 'update',
          contratoId: contrato.id,
          planoIdMudou,
          descontoPctMudou,
          descontoValorMudou,
          bodyKeys: Object.keys(value),
          divergencias: divergenciasUpdateNoOp(dadosAnteriores, dadosNovos, { max: 35, maxDepth: 8 }),
        });
      }

      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        const empresaId = getEmpresaIdOrNull(req) ?? contratoAtualizado.empresa_id ?? null;
        await registrarAtualizacao(
          req,
          'Contrato',
          contrato.id,
          dadosAnteriores,
          dadosNovos,
          undefined,
          empresaId
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, contratoAtualizado, 'Contrato atualizado com sucesso');
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
        const empresaId = getEmpresaIdOrNull(req) ?? contrato.empresa_id ?? null;
        await registrarExclusao(
          req,
          'Contrato',
          contrato.id,
          dadosAnteriores,
          undefined,
          empresaId
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

  /**
   * Gera títulos do contrato manualmente (dispara a mesma lógica da rotina agendada para um único contrato)
   */
  static async gerarTitulos(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const contratoId = parseInt(id, 10);
      if (isNaN(contratoId) || contratoId < 1) {
        sendValidationError(res, 'ID do contrato inválido');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const { Plano: PlanoModel } = await import('../../../models/cadastros/Plano');
      const { Cliente: ClienteModel } = await import('../../../models/clientes/Cliente');
      const { TipoCobrancaContrato } = await import('../../../models/cadastros/TipoCobrancaContrato');
      const { default: Parametros } = await import('../../../models/sistema/Parametros');

      const contrato = await Contrato.findByPk(contratoId, {
        include: [
          { model: PlanoModel, as: 'plano', attributes: ['id', 'nome_plano', 'valor_mensal', 'periodicidade'] },
          { model: ClienteModel, as: 'cliente', attributes: ['id', 'ativo'] },
          { model: TipoCobrancaContrato, as: 'tipoCobrancaContrato', attributes: ['id', 'quantidade_titulos', 'periodicidade'], required: false }
        ]
      });

      if (!contrato) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      if (empresaId !== null && (contrato as unknown as { empresa_id?: number | null }).empresa_id !== empresaId) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      const contratoAny = contrato as unknown as { status: string; dia_vencimento_id?: number | null; conta_boleto?: number | null };
      if (contratoAny.status !== 'ativo') {
        sendValidationError(res, 'Apenas contratos ativos podem ter títulos gerados');
        return;
      }

      if (!TituloGenerationHelper.validateContrato(contrato as unknown as Parameters<typeof TituloGenerationHelper.validateContrato>[0])) {
        sendValidationError(res, 'Contrato não possui dados suficientes para geração de títulos (dia de vencimento, banco, cliente ativo)');
        return;
      }

      const contratoValidado = contrato as unknown as {
        id: number;
        dia_vencimento_id: number;
        conta_boleto: number;
        tipoCobrancaContrato?: { quantidade_titulos: number } | null;
      };

      const diaVencimentoIds = [contratoValidado.dia_vencimento_id].filter(Boolean);
      const { titulosEmAbertoTodos, todosTitulosTodos, diasVencimentoTodos, servicosAdicionaisTodos } =
        await ContratoDataLoader.loadRelatedData([contratoId], diaVencimentoIds);

      const { titulosEmAbertoPorContrato, todosTitulosPorContrato, diasVencimentoPorId, servicosAdicionaisPorContrato } =
        ContratoDataLoader.groupDataByContrato(
          titulosEmAbertoTodos,
          todosTitulosTodos,
          diasVencimentoTodos,
          servicosAdicionaisTodos
        );

      const titulosEmAberto = titulosEmAbertoPorContrato.get(contratoId) || [];
      const todosTitulos = todosTitulosPorContrato.get(contratoId) || [];
      const diaVencimentoConfig = diasVencimentoPorId.get(contratoValidado.dia_vencimento_id);
      const diaVencimento = (diaVencimentoConfig && 'dia' in diaVencimentoConfig && typeof diaVencimentoConfig.dia === 'number')
        ? diaVencimentoConfig.dia
        : 15;
      const servicosAdicionais = (servicosAdicionaisPorContrato.get(contratoId) || []) as Parameters<typeof ContratoTituloProcessor.processContrato>[6];
      const parametros = await Parametros.findOne();
      const quantidadeTitulos = contratoValidado.tipoCobrancaContrato?.quantidade_titulos ?? 12;

      const contratoWithPlano = contrato as unknown as Parameters<typeof ContratoTituloProcessor.processContrato>[0] & { conta_boleto: number; dia_vencimento_id: number };
      const resultado = await ContratoTituloProcessor.processContrato(
        contratoWithPlano,
        titulosEmAberto,
        todosTitulos,
        diaVencimento,
        quantidadeTitulos,
        parametros,
        servicosAdicionais
      );

      sendSuccess(res, {
        titulos_gerados: resultado.titulosGerados,
        message: resultado.titulosGerados > 0
          ? `${resultado.titulosGerados} título(s) gerado(s) com sucesso`
          : 'Nenhum título novo gerado. O contrato já possui a quantidade configurada em aberto.'
      });
    } catch (error) {
      sendError(res, error, 'Erro ao gerar títulos do contrato', 500, true, {
        context: 'ContratoController',
        action: 'gerarTitulos',
        contratoId: req.params.id
      });
    }
  }

  // Listar contratos ativos
  static async getAtivos(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const result = await ContratoService.list({
        page: 1,
        limit: 1000,
        status: 'ativo',
        empresa_id: empresaId ?? undefined,
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
