import { Request, Response } from 'express';
import { ContaPagar } from '../../../models/financeiro/ContaPagar';
import { ContaPagarService } from '../../../services/financeiro/ContaPagarService';
import { ContaPagarOperationService } from '../../../services/financeiro/ContaPagarOperationService';
import { FornecedorService } from '../../../services/financeiro/FornecedorService';
import { logger } from '../../../utils/logger';
import { normalizeDateForDb } from '../../../utils/dateUtils';
import { contaPagarCreateSchema, contaPagarUpdateSchema, contaPagarPagamentoSchema } from '../../../validators/contaPagar.validator';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { Transaction } from 'sequelize';
import { sequelize } from '../../../config/database';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendNotFound, sendValidationError, sendForbidden } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { parseListQuery, queryString } from '../../../utils/listQuery';

export class ContaPagarController {
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, status, sortColumn, sortDirection } = parseListQuery(req.query);
      const tipoPagamento = queryString(req.query.tipo_pagamento);
      const fornecedorId = queryString(req.query.fornecedor_id);
      const dataInicio = queryString(req.query.data_inicio);
      const dataFim = queryString(req.query.data_fim);

      const empresaId = getEmpresaIdOrNull(req);

      const result = await ContaPagarService.list({
        page,
        limit,
        search,
        searchField,
        status,
        tipo_pagamento: tipoPagamento,
        fornecedor_id: fornecedorId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        sortColumn,
        sortDirection,
        empresa_id: empresaId ?? undefined,
      });

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar contas a pagar', 500, true, {
        context: 'ContaPagarController',
        action: 'index',
        query: req.query
      });
    }
  }

  static async show(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        sendValidationError(res, 'ID inválido');
        return;
      }

      const conta = await ContaPagarService.getById(id);

      if (!conta) {
        sendNotFound(res, 'Conta a pagar não encontrada');
        return;
      }

      sendSuccess(res, conta);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar conta a pagar', 500, true, {
        context: 'ContaPagarController',
        action: 'show',
        contaId: req.params.id
      });
    }
  }

  static async store(req: Request, res: Response): Promise<void> {
    const transaction = await sequelize.transaction();
    
    try {
      const { error, value } = contaPagarCreateSchema.validate(req.body);
      
      if (error) {
        await transaction.rollback();
        const errors: Record<string, string[]> = {};
        error.details.forEach(detail => {
          const path = detail.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(detail.message);
        });
        sendValidationError(res, 'Dados inválidos', errors);
        return;
      }

      // Verificar se fornecedor existe
      const fornecedor = await FornecedorService.getById(value.fornecedor_id, false);
      if (!fornecedor) {
        await transaction.rollback();
        sendNotFound(res, 'Fornecedor não encontrado');
        return;
      }

      // Verificar se é criação em lote
      const isLote = value.data_vencimento_inicial && value.data_vencimento_final;
      
      if (isLote) {
        // Criar múltiplas contas em lote
        const dataInicial = normalizeDateForDb(value.data_vencimento_inicial);
        const dataFinal = normalizeDateForDb(value.data_vencimento_final);

        if (!dataInicial || !dataFinal) {
          await transaction.rollback();
          sendValidationError(res, 'As datas de vencimento fornecidas são inválidas');
          return;
        }

        if (dataInicial > dataFinal) {
          await transaction.rollback();
          sendValidationError(res, 'A data inicial deve ser anterior à data final');
          return;
        }

        // Calcular quantidade de meses entre as datas
        const quantidadeMeses = (dataFinal.getFullYear() - dataInicial.getFullYear()) * 12 + 
                                 (dataFinal.getMonth() - dataInicial.getMonth()) + 1;
        
        if (quantidadeMeses > 120) {
          await transaction.rollback();
          sendValidationError(res, 'O intervalo não pode exceder 120 meses (10 anos)');
          return;
        }

        const contasCriadas = [];
        const empresaId = getEmpresaIdOrNull(req);
        const dadosBase = {
          empresa_id: empresaId ?? fornecedor.empresa_id ?? null,
          fornecedor_id: value.fornecedor_id,
          valor: value.valor,
          tipo_pagamento: value.tipo_pagamento,
          numero_documento: value.numero_documento,
          nota_fiscal: value.nota_fiscal,
          descricao: value.descricao,
          observacoes: value.observacoes,
          linha_digitavel: value.linha_digitavel,
          tipo_chave_pix: value.tipo_chave_pix,
          chave_pix: value.chave_pix,
          valor_pago: 0,
          status: 'A_PAGAR' as const,
          data_cadastro: new Date()
        };

        const diaVencimento = dataInicial.getDate();

        for (let i = 0; i < quantidadeMeses; i++) {
          let dataVencimento = new Date(dataInicial.getFullYear(), dataInicial.getMonth() + i, diaVencimento);
          
          // Ajustar se o dia não existir no mês (ex: 31 em fevereiro)
          const ultimoDiaDoMes = new Date(dataVencimento.getFullYear(), dataVencimento.getMonth() + 1, 0).getDate();
          if (diaVencimento > ultimoDiaDoMes) {
            dataVencimento.setDate(ultimoDiaDoMes);
          }
          
          // Último mês usa a data final
          if (i === quantidadeMeses - 1) {
            dataVencimento = new Date(dataFinal);
          }

          const conta = await ContaPagarService.create({
            ...dadosBase,
            data_vencimento: dataVencimento
          }, transaction);

          contasCriadas.push(conta);
        }

        await transaction.commit();

        // Registrar auditoria para cada conta criada (após commit)
        for (const conta of contasCriadas) {
          try {
            const contaData = conta.toJSON() as Record<string, unknown>;
            const empresaIdAudit = getEmpresaIdOrNull(req) ?? conta.empresa_id ?? null;
            await registrarCriacao(
              req as AuthenticatedRequest,
              'ContaPagar',
              conta.id,
              contaData,
              undefined,
              empresaIdAudit
            );
            logger.info('Auditoria de criação em lote registrada com sucesso', {
              context: 'ContaPagarController',
              action: 'store',
              conta_id: conta.id
            });
          } catch (auditError) {
            logger.error('Erro ao registrar auditoria de criação em lote', {
              context: 'ContaPagarController',
              action: 'store',
              conta_id: conta.id,
              error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
              stack: auditError instanceof Error ? auditError.stack : undefined
            });
          }
        }

        sendSuccess(res, contasCriadas, `${contasCriadas.length} conta(s) criada(s) com sucesso`, 201);
      } else {
        // Criar uma única conta
        if (!value.data_vencimento) {
          await transaction.rollback();
          sendValidationError(res, 'Data de vencimento é obrigatória para criação única');
          return;
        }

        // Normalizar data de vencimento
        if (typeof value.data_vencimento === 'string') {
          value.data_vencimento = normalizeDateForDb(value.data_vencimento) || new Date(value.data_vencimento);
        }

        const empresaIdSingle = getEmpresaIdOrNull(req);
        const conta = await ContaPagarService.create({
          ...value,
          empresa_id: empresaIdSingle ?? fornecedor.empresa_id ?? null,
          valor_pago: 0,
          status: 'A_PAGAR'
        }, transaction);

        // Registrar auditoria
        try {
          const empresaIdAudit = getEmpresaIdOrNull(req) ?? conta.empresa_id ?? null;
          await registrarCriacao(
            req,
            'ContaPagar',
            conta.id,
            conta.toJSON() as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
          logger.info('Auditoria de criação registrada com sucesso', {
            context: 'ContaPagarController',
            action: 'store',
            conta_id: conta.id
          });
        } catch (auditError) {
          logger.error('Erro ao registrar auditoria de criação', {
            context: 'ContaPagarController',
            action: 'store',
            conta_id: conta.id,
            error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
            stack: auditError instanceof Error ? auditError.stack : undefined
          });
        }

        await transaction.commit();

        sendSuccess(res, conta, 'Conta a pagar criada com sucesso', 201);
      }
    } catch (error) {
      await transaction.rollback();
      sendError(res, error, 'Erro ao criar conta a pagar', 500, true, {
        context: 'ContaPagarController',
        action: 'store'
      });
    }
  }

  // Duplicar conta a pagar
  static async duplicar(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        sendValidationError(res, 'ID inválido');
        return;
      }

      const contaDuplicada = await ContaPagarOperationService.duplicarConta(id, req);
      sendSuccess(res, contaDuplicada, 'Conta a pagar duplicada com sucesso', 201);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Conta a pagar não encontrada') {
          sendNotFound(res, error.message);
          return;
        }
      }
      sendError(res, error, 'Erro ao duplicar conta a pagar', 500, true, {
        context: 'ContaPagarController',
        action: 'duplicar',
        contaId: req.params.id
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        sendValidationError(res, 'ID inválido');
        return;
      }

      const { error, value } = contaPagarUpdateSchema.validate(req.body);
      
      if (error) {
        const errors: Record<string, string[]> = {};
        error.details.forEach(detail => {
          const path = detail.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(detail.message);
        });
        sendValidationError(res, 'Dados inválidos', errors);
        return;
      }

      const conta = await ContaPagarService.getById(id);

      if (!conta) {
        sendNotFound(res, 'Conta a pagar não encontrada');
        return;
      }

      // Não permitir alterar se já estiver paga
      if (conta.status === 'PAGO') {
        sendForbidden(res, 'Não é possível alterar uma conta já paga');
        return;
      }

      // Normalizar data de vencimento se fornecida
      if (value.data_vencimento && typeof value.data_vencimento === 'string') {
        value.data_vencimento = normalizeDateForDb(value.data_vencimento) || new Date(value.data_vencimento);
      }

      // Capturar dados anteriores para auditoria - buscar novamente do banco para garantir todos os campos
      const contaCompleta = await ContaPagar.findByPk(id);
      if (!contaCompleta) {
        sendNotFound(res, 'Conta a pagar não encontrada');
        return;
      }
      const dadosAnteriores = contaCompleta.toJSON() as Record<string, unknown>;
      
      const contaAtualizada = await ContaPagarService.update(id, value);
      
      // Registrar auditoria - buscar novamente do banco para garantir todos os campos
      const contaAtualizadaCompleta = await ContaPagar.findByPk(contaAtualizada.id);
      if (!contaAtualizadaCompleta) {
        sendNotFound(res, 'Conta a pagar não encontrada após atualização');
        return;
      }
      const dadosNovos = contaAtualizadaCompleta.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? contaAtualizadaCompleta.empresa_id ?? null;
        await registrarAtualizacao(
          req,
          'ContaPagar',
          contaAtualizada.id,
          dadosAnteriores,
          dadosNovos,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo, mas logar o erro
      }

      sendSuccess(res, contaAtualizada, 'Conta a pagar atualizada com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar conta a pagar', 500, true, {
        context: 'ContaPagarController',
        action: 'update',
        contaId: req.params.id
      });
    }
  }

  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        sendValidationError(res, 'ID inválido');
        return;
      }

      const conta = await ContaPagarService.getById(id);

      if (!conta) {
        sendNotFound(res, 'Conta a pagar não encontrada');
        return;
      }

      // Não permitir excluir se já tiver pagamentos
      if (conta.valor_pago > 0) {
        sendForbidden(res, 'A conta possui pagamentos e não pode ser excluída. Use cancelar.');
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = conta.toJSON() as Record<string, unknown>;
      
      await ContaPagarService.delete(id);

      // Registrar auditoria
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? conta.empresa_id ?? null;
        await registrarExclusao(
          req,
          'ContaPagar',
          id,
          dadosAnteriores,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo, mas logar o erro
      }

      sendSuccess(res, undefined, 'Conta a pagar excluída com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir conta a pagar', 500, true, {
        context: 'ContaPagarController',
        action: 'destroy',
        contaId: req.params.id
      });
    }
  }

  static async pagar(req: Request, res: Response): Promise<void> {
    const transaction: Transaction = await sequelize.transaction();
    
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        await transaction.rollback();
        sendValidationError(res, 'ID inválido');
        return;
      }

      const { error, value } = contaPagarPagamentoSchema.validate(req.body);
      
      if (error) {
        await transaction.rollback();
        const errors: Record<string, string[]> = {};
        error.details.forEach(detail => {
          const path = detail.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(detail.message);
        });
        sendValidationError(res, 'Dados inválidos', errors);
        return;
      }

      const { conta, status } = await ContaPagarOperationService.registrarPagamento(id, value, req, transaction);
      await transaction.commit();

      const contaAtualizada = await ContaPagarService.getById(id);
      if (!contaAtualizada) {
        sendNotFound(res, 'Conta a pagar não encontrada após atualização');
        return;
      }

      const message = status === 'PAGO' ? 'Conta paga com sucesso' : 'Pagamento parcial registrado com sucesso';
      sendSuccess(res, contaAtualizada, message);
    } catch (error) {
      await transaction.rollback();
      
      if (error instanceof Error) {
        if (error.message === 'Conta a pagar não encontrada') {
          sendNotFound(res, error.message);
          return;
        }
        if (error.message.includes('já está paga') || error.message.includes('cancelada')) {
          sendForbidden(res, error.message);
          return;
        }
        if (error.message.includes('excede o saldo')) {
          sendValidationError(res, error.message);
          return;
        }
      }
      
      sendError(res, error, 'Erro ao registrar pagamento', 500, true, {
        context: 'ContaPagarController',
        action: 'pagar',
        contaId: req.params.id
      });
    }
  }

  // Cancelar conta
  static async cancelar(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        sendValidationError(res, 'ID inválido');
        return;
      }

      const conta = await ContaPagarOperationService.cancelarConta(id, req);
      sendSuccess(res, conta, 'Conta cancelada com sucesso');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Conta a pagar não encontrada') {
          sendNotFound(res, error.message);
          return;
        }
        if (error.message.includes('já paga')) {
          sendForbidden(res, error.message);
          return;
        }
      }
      sendError(res, error, 'Erro ao cancelar conta', 500, true, {
        context: 'ContaPagarController',
        action: 'cancelar',
        contaId: req.params.id
      });
    }
  }

  static async resumo(req: Request, res: Response): Promise<void> {
    try {
      const resumo = await ContaPagarOperationService.calcularResumo();
      sendSuccess(res, resumo);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar resumo', 500, true, {
        context: 'ContaPagarController',
        action: 'resumo'
      });
    }
  }
}

