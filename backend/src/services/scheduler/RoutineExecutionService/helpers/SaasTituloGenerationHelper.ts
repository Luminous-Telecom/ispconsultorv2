import { toPlain } from '../../../../utils/toPlain';
import type { TransactionClient as Transaction } from '../../../../utils/transaction';
import type { Request } from 'express';
import { logger } from '../../../../utils/logger';
import { registrarCriacao } from '../../../sistema/AuditoriaRegistroService';

interface SaasContratoWithPlano {
  id: number;
  empresa_id: number;
  plano_id: number;
  conta_boleto: number;
  dia_vencimento_id: number;
  valor: number;
  data_inicio: string | Date;
  plano?: {
    valor_mensal: number;
    nome?: string;
  };
}

export class SaasTituloGenerationHelper {
  static validateContrato(
    contrato: {
      conta_boleto: number | null;
      dia_vencimento_id: number | null;
      isento_mensalidade?: boolean;
    }
  ): boolean {
    if (contrato.isento_mensalidade === true) return false;
    if (!contrato.conta_boleto) return false;
    if (!contrato.dia_vencimento_id) return false;
    return true;
  }

  static async createTitulo(
    contrato: SaasContratoWithPlano,
    dataVencimento: Date,
    valorTitulo: number,
    numeroTitulo: string,
    transaction: Transaction
  ) {
    void contrato;
    void dataVencimento;
    void valorTitulo;
    void numeroTitulo;
    void transaction;
    return null;
  }

  static async registerAuditForTitulos(
    titulos: Array<{ id: number; empresa_id?: number; toJSON: () => Record<string, unknown> }>
  ): Promise<void> {
    const reqSimulado = { headers: {}, socket: { remoteAddress: null }, user: undefined } as unknown as Request;
    for (const titulo of titulos) {
      try {
        const tituloData = toPlain(titulo) as Record<string, unknown>;
        await registrarCriacao(
          reqSimulado,
          'SaasTitulo',
          titulo.id,
          tituloData,
          'Título SaaS gerado automaticamente pelo agendador de tarefas',
          titulo.empresa_id ?? undefined,
          'agendador'
        );
      } catch (error) {
        logger.warn('Erro ao registrar auditoria de título SaaS gerado', {
          titulo_id: titulo.id,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }
  }
}
