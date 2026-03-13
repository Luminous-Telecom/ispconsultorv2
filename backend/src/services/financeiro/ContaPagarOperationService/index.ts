import { Transaction } from 'sequelize';
import { ContaPagar } from '../../../models/financeiro/ContaPagar';
import { ContaPagarService } from '../ContaPagarService';
import { logger } from '../../../utils/logger';
import { normalizeDateForDb } from '../../../utils/dateUtils';
import { registrarCriacao, registrarAtualizacao } from '../../sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import type { AuthenticatedRequest } from '../../../types/auth';
import type { Request } from 'express';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

interface PagamentoData {
  valor: number;
  data?: string | Date;
  tipo_pagamento: 'BOLETO' | 'DINHEIRO' | 'CARTAO' | 'DEPOSITO' | 'DEBITO_CONTA' | 'TRANSFERENCIA' | 'PIX';
  observacao?: string;
}

export class ContaPagarOperationService {
  /**
   * Registra pagamento de uma conta
   */
  static async registrarPagamento(
    contaId: number,
    pagamentoData: PagamentoData,
    req: Request,
    transaction: Transaction
  ): Promise<{ conta: ContaPagar; status: 'PAGO' | 'PARCIAL' }> {
    const conta = await ContaPagarService.getById(contaId, transaction);

    if (!conta) {
      throw new Error('Conta a pagar não encontrada');
    }

    if (conta.status === 'PAGO') {
      throw new Error('Conta já está paga');
    }

    if (conta.status === 'CANCELADO') {
      throw new Error('Não é possível pagar uma conta cancelada');
    }

    const saldoDevedor = conta.getSaldoDevedor();
    const valorPagamento = Number(pagamentoData.valor);

    if (valorPagamento > saldoDevedor) {
      throw new Error(`Valor do pagamento excede o saldo devedor. Saldo devedor: R$ ${saldoDevedor.toFixed(2)}`);
    }

    let dataPagamento = pagamentoData.data 
      ? (typeof pagamentoData.data === 'string' ? normalizeDateForDb(pagamentoData.data) : pagamentoData.data) 
      : new Date();
    if (!dataPagamento) {
      dataPagamento = new Date();
    }

    const dadosAnteriores = conta.toJSON() as Record<string, unknown>;
    const user = (req as AuthenticatedRequest).user;
    const usuarioId = user && typeof user === 'object' && 'id' in user ? (user as { id: number }).id : null;

    await ContaPagarService.createPagamento({
      conta_pagar_id: conta.id,
      empresa_id: conta.empresa_id ?? null,
      data: dataPagamento,
      valor: valorPagamento,
      tipo_pagamento: pagamentoData.tipo_pagamento,
      usuario_id: usuarioId,
      observacao: pagamentoData.observacao || null
    }, transaction);

    const novoValorPago = Number(conta.valor_pago) + valorPagamento;
    const novoStatus = novoValorPago >= Number(conta.valor) ? 'PAGO' : 'PARCIAL';

    await ContaPagarService.updateInstance(conta, {
      valor_pago: novoValorPago,
      status: novoStatus,
      data_pagamento: dataPagamento
    }, transaction);

    const dadosNovos = conta.toJSON() as Record<string, unknown>;
    setAuditData(req, dadosAnteriores, dadosNovos);

    try {
      const empresaIdAudit = getEmpresaIdOrNull(req) ?? conta.empresa_id ?? null;
      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'ContaPagar',
        conta.id,
        dadosAnteriores,
        dadosNovos,
        undefined,
        empresaIdAudit
      );
    } catch (auditError) {
      logger.warn('Erro ao registrar auditoria de pagamento', {
        conta_id: conta.id,
        error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
      });
    }

    return { conta, status: novoStatus };
  }

  /**
   * Cancela uma conta a pagar
   */
  static async cancelarConta(
    contaId: number,
    req: Request
  ): Promise<ContaPagar> {
    const conta = await ContaPagarService.getById(contaId);

    if (!conta) {
      throw new Error('Conta a pagar não encontrada');
    }

    if (conta.status === 'PAGO') {
      throw new Error('Não é possível cancelar uma conta já paga');
    }

    const dadosAnteriores = conta.toJSON() as Record<string, unknown>;
    await ContaPagarService.updateInstance(conta, { status: 'CANCELADO' });
    const dadosNovos = conta.toJSON() as Record<string, unknown>;
    
    setAuditData(req, dadosAnteriores, dadosNovos);

    try {
      const empresaIdAudit = getEmpresaIdOrNull(req) ?? conta.empresa_id ?? null;
      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'ContaPagar',
        conta.id,
        dadosAnteriores,
        dadosNovos,
        undefined,
        empresaIdAudit
      );
    } catch (auditError) {
      logger.warn('Erro ao registrar auditoria de cancelamento', {
        conta_id: conta.id,
        error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
      });
    }

    return conta;
  }

  /**
   * Duplica uma conta a pagar
   */
  static async duplicarConta(
    contaId: number,
    req: Request
  ): Promise<ContaPagar> {
    const contaOriginal = await ContaPagarService.getById(contaId);

    if (!contaOriginal) {
      throw new Error('Conta a pagar não encontrada');
    }

    const novaConta = await ContaPagarService.create({
      empresa_id: contaOriginal.empresa_id ?? null,
      fornecedor_id: contaOriginal.fornecedor_id,
      data_vencimento: contaOriginal.data_vencimento,
      valor: contaOriginal.valor,
      tipo_pagamento: contaOriginal.tipo_pagamento,
      numero_documento: contaOriginal.numero_documento,
      nota_fiscal: contaOriginal.nota_fiscal,
      descricao: contaOriginal.descricao,
      observacoes: contaOriginal.observacoes,
      linha_digitavel: contaOriginal.linha_digitavel,
      tipo_chave_pix: contaOriginal.tipo_chave_pix,
      chave_pix: contaOriginal.chave_pix,
      valor_pago: 0,
      status: 'A_PAGAR',
      data_pagamento: null,
      data_cadastro: new Date()
    });

    try {
      const empresaIdAudit = getEmpresaIdOrNull(req) ?? novaConta.empresa_id ?? null;
      await registrarCriacao(
        req as AuthenticatedRequest,
        'ContaPagar',
        novaConta.id,
        novaConta.toJSON() as Record<string, unknown>,
        undefined,
        empresaIdAudit
      );
      logger.info('Auditoria de duplicação registrada', {
        conta_original_id: contaId,
        conta_duplicada_id: novaConta.id
      });
    } catch (auditError) {
      logger.error('Erro ao registrar auditoria de duplicação', {
        conta_original_id: contaId,
        conta_duplicada_id: novaConta.id,
        error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
      });
    }

    return await ContaPagarService.getById(novaConta.id) as ContaPagar;
  }

  /**
   * Calcula resumo financeiro
   */
  static async calcularResumo(): Promise<{
    total_a_pagar: number;
    total_pago: number;
    total_vencido: number;
    total_hoje: number;
    total_contas: number;
  }> {
    const contas = await ContaPagarService.findAllWithAttributes([
      'id', 
      'valor', 
      'valor_pago', 
      'status', 
      'data_vencimento'
    ]);

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

    return {
      total_a_pagar: totalAPagar,
      total_pago: totalPago,
      total_vencido: totalVencido,
      total_hoje: totalHoje,
      total_contas: contas.length
    };
  }
}
