import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { ContaPagarService } from '../ContaPagarService';
import { logger } from '../../../utils/logger';
import { formatCreatedAt, normalizeDateForDb } from '../../../utils/dateUtils';
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

function saldoDevedor(conta: { valor: unknown; valor_pago: unknown }): number {
  return Number(conta.valor) - Number(conta.valor_pago || 0);
}

function contaParaAuditoria(conta: { valor: unknown; valor_pago: unknown; created_at?: unknown }) {
  return {
    ...conta,
    created_at_formatada: formatCreatedAt(conta.created_at),
    saldo_devedor: saldoDevedor(conta),
  };
}

export class ContaPagarOperationService {
  static async registrarPagamento(
    contaId: number,
    pagamentoData: PagamentoData,
    req: Request,
    _transaction?: unknown
  ): Promise<{ conta: Awaited<ReturnType<typeof ContaPagarService.getById>>; status: 'PAGO' | 'PARCIAL' }> {
    return prisma.$transaction(async (tx) => {
      const conta = await tx.financeiro_contas_pagar.findUnique({
        where: { id: contaId },
        include: {
          financeiro_fornecedores: true,
          financeiro_conta_pagar_pagamentos: { orderBy: { created_at: 'desc' } },
        },
      });
      if (!conta) throw new Error('Conta a pagar não encontrada');
      if (conta.status === 'PAGO') throw new Error('Conta já está paga');
      if (conta.status === 'CANCELADO') throw new Error('Não é possível pagar uma conta cancelada');

      const saldo = saldoDevedor(conta);
      const valorPagamento = Number(pagamentoData.valor);
      if (valorPagamento > saldo) {
        throw new Error(`Valor do pagamento excede o saldo devedor. Saldo devedor: R$ ${saldo.toFixed(2)}`);
      }

      let dataPagamento = pagamentoData.data
        ? (typeof pagamentoData.data === 'string' ? normalizeDateForDb(pagamentoData.data) : pagamentoData.data)
        : new Date();
      if (!dataPagamento) dataPagamento = new Date();

      const dadosAnteriores = contaParaAuditoria(conta);
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
      }, tx);

      const novoValorPago = Number(conta.valor_pago) + valorPagamento;
      const novoStatus = novoValorPago >= Number(conta.valor) ? 'PAGO' : 'PARCIAL';
      const atualizada = await ContaPagarService.updateInstance(conta, {
        valor_pago: novoValorPago,
        status: novoStatus,
        data_pagamento: dataPagamento
      }, tx);

      const dadosNovos = contaParaAuditoria(atualizada);
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

      return { conta: atualizada, status: novoStatus };
    });
  }

  static async cancelarConta(contaId: number, req: Request) {
    const conta = await ContaPagarService.getById(contaId);
    if (!conta) throw new Error('Conta a pagar não encontrada');
    if (conta.status === 'PAGO') throw new Error('Não é possível cancelar uma conta já paga');

    const dadosAnteriores = contaParaAuditoria(conta);
    const atualizada = await ContaPagarService.updateInstance(conta, { status: 'CANCELADO' });
    const dadosNovos = contaParaAuditoria(atualizada);
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

    return atualizada;
  }

  static async duplicarConta(contaId: number, req: Request) {
    const contaOriginal = await ContaPagarService.getById(contaId);
    if (!contaOriginal) throw new Error('Conta a pagar não encontrada');

    const novaConta = await ContaPagarService.create({
      empresa_id: contaOriginal.empresa_id ?? null,
      fornecedor_id: contaOriginal.fornecedor_id,
      data_vencimento: contaOriginal.data_vencimento,
      valor: contaOriginal.valor as Prisma.financeiro_contas_pagarUncheckedCreateInput['valor'],
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
        contaParaAuditoria(novaConta),
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

    return ContaPagarService.getById(novaConta.id);
  }

  static async calcularResumo(): Promise<{
    total_a_pagar: number;
    total_pago: number;
    total_vencido: number;
    total_hoje: number;
    total_contas: number;
  }> {
    const contas = await ContaPagarService.findAllWithAttributes([
      'id', 'valor', 'valor_pago', 'status', 'data_vencimento'
    ]);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let totalAPagar = 0;
    let totalPago = 0;
    let totalVencido = 0;
    let totalHoje = 0;

    contas.forEach((conta) => {
      const valor = Number(conta.valor);
      const valorPago = Number(conta.valor_pago || 0);
      const saldo = valor - valorPago;

      if (conta.status === 'A_PAGAR' || conta.status === 'PARCIAL') totalAPagar += saldo;
      if (conta.status === 'PAGO') totalPago += valor;

      if (conta.status !== 'PAGO' && conta.status !== 'CANCELADO') {
        const vencimento = new Date(conta.data_vencimento);
        vencimento.setHours(0, 0, 0, 0);
        if (vencimento < hoje) totalVencido += saldo;
        else if (vencimento.getTime() === hoje.getTime()) totalHoje += saldo;
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
