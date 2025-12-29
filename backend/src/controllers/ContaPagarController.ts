import { Request, Response } from 'express';
import { ContaPagar } from '../models/ContaPagar';
import { ContaPagarPagamento } from '../models/ContaPagarPagamento';
import { Fornecedor } from '../models/Fornecedor';
import { Op, WhereOptions } from 'sequelize';
import { logger } from '../utils/logger';
import { contaPagarCreateSchema, contaPagarUpdateSchema, contaPagarPagamentoSchema } from '../validators/contaPagar.validator';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../services/AuditoriaService';
import { setAuditData } from '../middleware/auditMiddleware';
import { normalizeDateForDb } from '../utils/dateUtils';
import { Transaction } from 'sequelize';
import { sequelize } from '../config/database';

export class ContaPagarController {
  // Listar todas as contas a pagar
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const tipoPagamento = req.query.tipo_pagamento as string;
      const fornecedorId = req.query.fornecedor_id as string;
      const dataInicio = req.query.data_inicio as string;
      const dataFim = req.query.data_fim as string;

      const offset = (page - 1) * limit;

      const where: WhereOptions = {};
      
      if (status) {
        where.status = status;
      }

      if (tipoPagamento) {
        where.tipo_pagamento = tipoPagamento;
      }

      if (fornecedorId) {
        const fornecedorIdNum = parseInt(fornecedorId, 10);
        if (!isNaN(fornecedorIdNum)) {
          where.fornecedor_id = fornecedorIdNum;
        }
      }

      if (dataInicio || dataFim) {
        where.data_vencimento = {};
        if (dataInicio) {
          const dataInicioDate = normalizeDateForDb(dataInicio);
          if (dataInicioDate) {
            where.data_vencimento[Op.gte] = dataInicioDate;
          }
        }
        if (dataFim) {
          const dataFimDate = normalizeDateForDb(dataFim);
          if (dataFimDate) {
            where.data_vencimento[Op.lte] = dataFimDate;
          }
        }
      }

      const count = await ContaPagar.count({ where });
      
      const contas = await ContaPagar.findAll({
        where,
        include: [
          { association: 'fornecedor', required: false },
          { association: 'pagamentos', required: false, limit: 5, order: [['created_at', 'DESC']] },
          { association: 'arquivos', required: false, limit: 5 }
        ],
        order: [['data_vencimento', 'ASC'], ['created_at', 'DESC']],
        limit,
        offset
      });

      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: contas,
        pagination: {
          current_page: page,
          per_page: limit,
          total: count,
          last_page: totalPages,
          from: offset + 1,
          to: Math.min(offset + limit, count)
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao listar contas a pagar', {
        context: 'ContaPagarController',
        action: 'index',
        error: errorMessage
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Mostrar uma conta específica
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      const conta = await ContaPagar.findByPk(id, {
        include: [
          { association: 'fornecedor', required: false },
          { association: 'pagamentos', required: false, order: [['created_at', 'DESC']] },
          { association: 'arquivos', required: false }
        ]
      });

      if (!conta) {
        res.status(404).json({
          success: false,
          error: 'Conta a pagar não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: conta
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar conta a pagar', {
        context: 'ContaPagarController',
        action: 'show',
        error: errorMessage,
        contaId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Criar nova conta a pagar
  static async store(req: Request, res: Response): Promise<void> {
    const transaction = await sequelize.transaction();
    
    try {
      const { error, value } = contaPagarCreateSchema.validate(req.body);
      
      if (error) {
        await transaction.rollback();
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.details.map(d => d.message)
        });
        return;
      }

      // Verificar se fornecedor existe
      const fornecedor = await Fornecedor.findByPk(value.fornecedor_id);
      if (!fornecedor) {
        await transaction.rollback();
        res.status(404).json({
          success: false,
          error: 'Fornecedor não encontrado'
        });
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
          res.status(400).json({
            success: false,
            error: 'Datas inválidas',
            message: 'As datas de vencimento fornecidas são inválidas'
          });
          return;
        }

        if (dataInicial > dataFinal) {
          await transaction.rollback();
          res.status(400).json({
            success: false,
            error: 'Intervalo inválido',
            message: 'A data inicial deve ser anterior à data final'
          });
          return;
        }

        // Calcular intervalo de dias
        const totalDias = Math.ceil((dataFinal.getTime() - dataInicial.getTime()) / (1000 * 60 * 60 * 24));
        const quantidadeContas = totalDias + 1; // Incluir ambas as datas
        
        if (quantidadeContas > 365) {
          await transaction.rollback();
          res.status(400).json({
            success: false,
            error: 'Intervalo muito grande',
            message: 'O intervalo não pode exceder 365 dias'
          });
          return;
        }

        const contasCriadas = [];
        const dadosBase = {
          fornecedor_id: value.fornecedor_id,
          valor: value.valor,
          tipo_pagamento: value.tipo_pagamento,
          numero_documento: value.numero_documento,
          nota_fiscal: value.nota_fiscal,
          observacoes: value.observacoes,
          linha_digitavel: value.linha_digitavel,
          tipo_chave_pix: value.tipo_chave_pix,
          chave_pix: value.chave_pix,
          valor_pago: 0,
          status: 'A_PAGAR' as const,
          data_cadastro: new Date()
        };

        for (let i = 0; i < quantidadeContas; i++) {
          const dataVencimento = i === quantidadeContas - 1 
            ? new Date(dataFinal)
            : (() => {
                const data = new Date(dataInicial);
                data.setDate(data.getDate() + Math.round((i * totalDias) / (quantidadeContas - 1)));
                return data;
              })();

          const conta = await ContaPagar.create({
            ...dadosBase,
            data_vencimento: dataVencimento
          }, { transaction });

          try {
            await registrarCriacao(req, 'ContaPagar', conta.id, conta.toJSON() as Record<string, unknown>);
          } catch (auditError) {
            logger.error('Erro ao registrar auditoria', {
              context: 'ContaPagarController',
              action: 'store',
              conta_id: conta.id,
              error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
            });
          }

          contasCriadas.push(conta);
        }

        await transaction.commit();

        res.status(201).json({
          success: true,
          message: `${contasCriadas.length} conta(s) criada(s) com sucesso`,
          data: contasCriadas
        });
      } else {
        // Criar uma única conta
        if (!value.data_vencimento) {
          await transaction.rollback();
          res.status(400).json({
            success: false,
            error: 'Data de vencimento obrigatória',
            message: 'Data de vencimento é obrigatória para criação única'
          });
          return;
        }

        // Normalizar data de vencimento
        if (typeof value.data_vencimento === 'string') {
          value.data_vencimento = normalizeDateForDb(value.data_vencimento) || new Date(value.data_vencimento);
        }

        const conta = await ContaPagar.create({
          ...value,
          valor_pago: 0,
          status: 'A_PAGAR'
        }, { transaction });

        // Registrar auditoria
        try {
          await registrarCriacao(
            req,
            'ContaPagar',
            conta.id,
            conta.toJSON() as Record<string, unknown>
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

        res.status(201).json({
          success: true,
          message: 'Conta a pagar criada com sucesso',
          data: conta
        });
      }
    } catch (error) {
      await transaction.rollback();
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao criar conta a pagar', {
        context: 'ContaPagarController',
        action: 'store',
        error: errorMessage
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Duplicar conta a pagar
  static async duplicar(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      const contaOriginal = await ContaPagar.findByPk(id);

      if (!contaOriginal) {
        res.status(404).json({
          success: false,
          error: 'Conta a pagar não encontrada'
        });
        return;
      }

      // Criar nova conta com os mesmos dados, mas resetando campos de pagamento
      const novaConta = await ContaPagar.create({
        fornecedor_id: contaOriginal.fornecedor_id,
        data_vencimento: contaOriginal.data_vencimento,
        valor: contaOriginal.valor,
        tipo_pagamento: contaOriginal.tipo_pagamento,
        numero_documento: contaOriginal.numero_documento,
        nota_fiscal: contaOriginal.nota_fiscal,
        observacoes: contaOriginal.observacoes,
        linha_digitavel: contaOriginal.linha_digitavel,
        tipo_chave_pix: contaOriginal.tipo_chave_pix,
        chave_pix: contaOriginal.chave_pix,
        valor_pago: 0,
        status: 'A_PAGAR',
        data_pagamento: null,
        data_cadastro: new Date()
      });

      // Registrar auditoria
      try {
        await registrarCriacao(
          req,
          'ContaPagar',
          novaConta.id,
          novaConta.toJSON() as Record<string, unknown>
        );
        logger.info('Auditoria de duplicação registrada com sucesso', {
          context: 'ContaPagarController',
          action: 'duplicar',
          conta_original_id: id,
          conta_duplicada_id: novaConta.id
        });
      } catch (auditError) {
        logger.error('Erro ao registrar auditoria de duplicação', {
          context: 'ContaPagarController',
          action: 'duplicar',
          conta_original_id: id,
          conta_duplicada_id: novaConta.id,
          error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
          stack: auditError instanceof Error ? auditError.stack : undefined
        });
        // Não interromper o fluxo, mas logar o erro
      }

      // Buscar conta duplicada com relacionamentos
      const contaDuplicada = await ContaPagar.findByPk(novaConta.id, {
        include: [
          { association: 'fornecedor', required: false }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Conta a pagar duplicada com sucesso',
        data: contaDuplicada
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao duplicar conta a pagar', {
        context: 'ContaPagarController',
        action: 'duplicar',
        error: errorMessage,
        contaId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Atualizar conta a pagar
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      const { error, value } = contaPagarUpdateSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const conta = await ContaPagar.findByPk(id);

      if (!conta) {
        res.status(404).json({
          success: false,
          error: 'Conta a pagar não encontrada'
        });
        return;
      }

      // Não permitir alterar se já estiver paga
      if (conta.status === 'PAGO') {
        res.status(400).json({
          success: false,
          error: 'Não é possível alterar uma conta já paga'
        });
        return;
      }

      // Normalizar data de vencimento se fornecida
      if (value.data_vencimento && typeof value.data_vencimento === 'string') {
        value.data_vencimento = normalizeDateForDb(value.data_vencimento) || new Date(value.data_vencimento);
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = conta.toJSON() as Record<string, unknown>;
      
      await conta.update(value);
      
      // Recarregar conta para obter dados atualizados
      await conta.reload();
      
      // Registrar auditoria
      const dadosNovos = conta.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        await registrarAtualizacao(
          req,
          'ContaPagar',
          conta.id,
          dadosAnteriores,
          dadosNovos
        );
        logger.info('Auditoria de atualização registrada com sucesso', {
          context: 'ContaPagarController',
          action: 'update',
          conta_id: conta.id
        });
      } catch (auditError) {
        logger.error('Erro ao registrar auditoria de atualização', {
          context: 'ContaPagarController',
          action: 'update',
          conta_id: conta.id,
          error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
          stack: auditError instanceof Error ? auditError.stack : undefined
        });
        // Não interromper o fluxo, mas logar o erro
      }

      res.json({
        success: true,
        message: 'Conta a pagar atualizada com sucesso',
        data: conta
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao atualizar conta a pagar', {
        context: 'ContaPagarController',
        action: 'update',
        error: errorMessage,
        contaId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Deletar conta a pagar
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      const conta = await ContaPagar.findByPk(id);

      if (!conta) {
        res.status(404).json({
          success: false,
          error: 'Conta a pagar não encontrada'
        });
        return;
      }

      // Não permitir excluir se já tiver pagamentos
      if (conta.valor_pago > 0) {
        res.status(409).json({
          success: false,
          error: 'Não é possível excluir conta com pagamentos registrados',
          message: 'A conta possui pagamentos e não pode ser excluída. Use cancelar.'
        });
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = conta.toJSON() as Record<string, unknown>;
      
      await conta.destroy();

      // Registrar auditoria
      try {
        await registrarExclusao(
          req,
          'ContaPagar',
          id,
          dadosAnteriores
        );
        logger.info('Auditoria de exclusão registrada com sucesso', {
          context: 'ContaPagarController',
          action: 'destroy',
          conta_id: id
        });
      } catch (auditError) {
        logger.error('Erro ao registrar auditoria de exclusão', {
          context: 'ContaPagarController',
          action: 'destroy',
          conta_id: id,
          error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
          stack: auditError instanceof Error ? auditError.stack : undefined
        });
        // Não interromper o fluxo, mas logar o erro
      }

      res.json({
        success: true,
        message: 'Conta a pagar excluída com sucesso'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao excluir conta a pagar', {
        context: 'ContaPagarController',
        action: 'destroy',
        error: errorMessage,
        contaId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Registrar pagamento
  static async pagar(req: Request, res: Response): Promise<void> {
    const transaction: Transaction = await sequelize.transaction();
    
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        await transaction.rollback();
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      const { error, value } = contaPagarPagamentoSchema.validate(req.body);
      
      if (error) {
        await transaction.rollback();
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const conta = await ContaPagar.findByPk(id, { transaction });

      if (!conta) {
        await transaction.rollback();
        res.status(404).json({
          success: false,
          error: 'Conta a pagar não encontrada'
        });
        return;
      }

      if (conta.status === 'PAGO') {
        await transaction.rollback();
        res.status(400).json({
          success: false,
          error: 'Conta já está paga'
        });
        return;
      }

      if (conta.status === 'CANCELADO') {
        await transaction.rollback();
        res.status(400).json({
          success: false,
          error: 'Não é possível pagar uma conta cancelada'
        });
        return;
      }

      const saldoDevedor = conta.getSaldoDevedor();
      const valorPagamento = Number(value.valor);

      if (valorPagamento > saldoDevedor) {
        await transaction.rollback();
        res.status(400).json({
          success: false,
          error: 'Valor do pagamento excede o saldo devedor',
          message: `Saldo devedor: R$ ${saldoDevedor.toFixed(2)}`
        });
        return;
      }

      // Normalizar data de pagamento
      let dataPagamento = value.data ? (typeof value.data === 'string' ? normalizeDateForDb(value.data) : value.data) : new Date();
      if (!dataPagamento) {
        dataPagamento = new Date();
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = conta.toJSON() as Record<string, unknown>;

      // Registrar pagamento no histórico
      const usuarioId = (req as any).user?.id || null;
      await ContaPagarPagamento.create({
        conta_pagar_id: conta.id,
        data: dataPagamento,
        valor: valorPagamento,
        tipo_pagamento: value.tipo_pagamento,
        usuario_id: usuarioId,
        observacao: value.observacao || null
      }, { transaction });

      // Atualizar conta
      const novoValorPago = Number(conta.valor_pago) + valorPagamento;
      const novoStatus = novoValorPago >= Number(conta.valor) ? 'PAGO' : 'PARCIAL';

      await conta.update({
        valor_pago: novoValorPago,
        status: novoStatus,
        data_pagamento: dataPagamento // Sempre salvar a data de pagamento, mesmo em pagamentos parciais
      }, { transaction });

      await transaction.commit();

      // Recarregar conta com relacionamentos
      const contaAtualizada = await ContaPagar.findByPk(id, {
        include: [
          { association: 'fornecedor', required: false },
          { association: 'pagamentos', required: false, order: [['created_at', 'DESC']] }
        ]
      });

      // Registrar auditoria de pagamento (atualização)
      if (contaAtualizada) {
        const dadosNovos = contaAtualizada.toJSON() as Record<string, unknown>;
        setAuditData(req, dadosAnteriores, dadosNovos);
        
        try {
          await registrarAtualizacao(
            req,
            'ContaPagar',
            contaAtualizada.id,
            dadosAnteriores,
            dadosNovos
          );
          logger.info('Auditoria de pagamento registrada com sucesso', {
            context: 'ContaPagarController',
            action: 'pagar',
            conta_id: contaAtualizada.id,
            novo_status: novoStatus
          });
        } catch (auditError) {
          logger.error('Erro ao registrar auditoria de pagamento', {
            context: 'ContaPagarController',
            action: 'pagar',
            conta_id: contaAtualizada.id,
            error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
            stack: auditError instanceof Error ? auditError.stack : undefined
          });
          // Não interromper o fluxo, mas logar o erro
        }
      }

      res.json({
        success: true,
        message: novoStatus === 'PAGO' ? 'Conta paga com sucesso' : 'Pagamento parcial registrado com sucesso',
        data: contaAtualizada
      });
    } catch (error) {
      await transaction.rollback();
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao registrar pagamento', {
        context: 'ContaPagarController',
        action: 'pagar',
        error: errorMessage,
        contaId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Cancelar conta
  static async cancelar(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      const conta = await ContaPagar.findByPk(id);

      if (!conta) {
        res.status(404).json({
          success: false,
          error: 'Conta a pagar não encontrada'
        });
        return;
      }

      if (conta.status === 'PAGO') {
        res.status(400).json({
          success: false,
          error: 'Não é possível cancelar uma conta já paga'
        });
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = conta.toJSON() as Record<string, unknown>;
      
      await conta.update({ status: 'CANCELADO' });
      
      // Recarregar conta para obter dados atualizados
      await conta.reload();
      
      // Registrar auditoria
      const dadosNovos = conta.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        await registrarAtualizacao(
          req,
          'ContaPagar',
          conta.id,
          dadosAnteriores,
          dadosNovos
        );
        logger.info('Auditoria de cancelamento registrada com sucesso', {
          context: 'ContaPagarController',
          action: 'cancelar',
          conta_id: conta.id
        });
      } catch (auditError) {
        logger.error('Erro ao registrar auditoria de cancelamento', {
          context: 'ContaPagarController',
          action: 'cancelar',
          conta_id: conta.id,
          error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
          stack: auditError instanceof Error ? auditError.stack : undefined
        });
        // Não interromper o fluxo, mas logar o erro
      }

      res.json({
        success: true,
        message: 'Conta cancelada com sucesso',
        data: conta
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao cancelar conta', {
        context: 'ContaPagarController',
        action: 'cancelar',
        error: errorMessage,
        contaId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Dashboard/Resumo
  static async resumo(req: Request, res: Response): Promise<void> {
    try {
      const contas = await ContaPagar.findAll({
        attributes: ['id', 'valor', 'valor_pago', 'status', 'data_vencimento']
      });

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let totalAPagar = 0;
      let totalPago = 0;
      let totalVencido = 0;
      let totalHoje = 0;

      contas.forEach(conta => {
        const valor = Number(conta.valor);
        const valorPago = Number(conta.valor_pago || 0);
        const saldo = valor - valorPago;

        if (conta.status === 'A_PAGAR' || conta.status === 'PARCIAL') {
          totalAPagar += saldo;
        }

        if (conta.status === 'PAGO') {
          totalPago += valor;
        }

        if (conta.status !== 'PAGO' && conta.status !== 'CANCELADO') {
          const vencimento = new Date(conta.data_vencimento);
          vencimento.setHours(0, 0, 0, 0);

          if (vencimento < hoje) {
            totalVencido += saldo;
          } else if (vencimento.getTime() === hoje.getTime()) {
            totalHoje += saldo;
          }
        }
      });

      res.json({
        success: true,
        data: {
          total_a_pagar: totalAPagar,
          total_pago: totalPago,
          total_vencido: totalVencido,
          total_hoje: totalHoje,
          total_contas: contas.length
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar resumo', {
        context: 'ContaPagarController',
        action: 'resumo',
        error: errorMessage
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }
}

