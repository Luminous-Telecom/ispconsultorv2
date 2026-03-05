import type { Transaction } from 'sequelize';
import { logger } from '../../../../utils/logger';
import { normalizeDateForDb, formatDate } from '../../../../utils/dateUtils';
import { TituloGenerationHelper } from './TituloGenerationHelper';

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
    }
  ): boolean {
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
    const { SaasTitulo } = await import('../../../../models/saas/SaasTitulo');
    const plano = contrato.plano;
    const dataVencimentoNormalizada = normalizeDateForDb(dataVencimento) || dataVencimento;

    const titulo = await SaasTitulo.create(
      {
        empresa_id: contrato.empresa_id,
        plano_id: contrato.plano_id,
        banco_id: contrato.conta_boleto,
        contrato_id: contrato.id,
        valor: valorTitulo,
        valor_final: valorTitulo,
        data_vencimento: dataVencimentoNormalizada,
        status: 'pendente',
        pago: false,
        descricao: `${plano?.nome || 'Mensalidade'}\n${formatDate(dataVencimento) || ''}`,
        numero_titulo: numeroTitulo,
        is_avulso: false,
      },
      { transaction }
    );

    return titulo;
  }

  static async registerAuditForTitulos(
    titulos: Array<{ id: number; toJSON: () => Record<string, unknown> }>
  ): Promise<void> {
    for (const titulo of titulos) {
      try {
        logger.info('SaasTituloGenerationHelper - Título SaaS gerado pelo agendador', {
          titulo_id: titulo.id,
          context: 'SaasTituloGenerationHelper',
        });
      } catch (error) {
        logger.warn('Erro ao registrar log de título SaaS gerado', {
          titulo_id: titulo.id,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }
  }
}
