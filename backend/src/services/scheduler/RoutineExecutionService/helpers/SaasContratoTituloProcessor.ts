import { withTransaction } from '../../../../utils/transaction';
import type { Transaction } from 'sequelize';
import { logger } from '../../../../utils/logger';
import { TituloGenerationHelper } from './TituloGenerationHelper';
import { SaasTituloGenerationHelper } from './SaasTituloGenerationHelper';

type Periodicidade = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | null | undefined;

export interface SaasContratoWithPlano {
  id: number;
  empresa_id: number;
  plano_id: number;
  conta_boleto: number;
  dia_vencimento_id: number;
  valor: number;
  desconto_percentual?: number | null;
  desconto_valor?: number | null;
  data_validade_desconto?: string | Date | null;
  data_inicio: string | Date;
  tipo: string;
  plano?: {
    valor_mensal: number;
    nome?: string;
  };
}

interface TituloData {
  data_vencimento: Date;
  status?: string;
}

export class SaasContratoTituloProcessor {
  static async processContrato(
    contrato: SaasContratoWithPlano,
    titulosEmAberto: TituloData[],
    todosTitulos: TituloData[],
    diaVencimento: number,
    quantidadeMinimaTitulos: number
  ): Promise<{ titulosGerados: number; titulosCriados: Array<unknown> }> {
    const titulosGerar = quantidadeMinimaTitulos - titulosEmAberto.length;

    if (titulosGerar <= 0) {
      logger.info('SaasContratoTituloProcessor - Quantidade de títulos já suficiente', {
        contratoId: contrato.id,
        empresaId: contrato.empresa_id,
        quantidadeMinimaTitulos,
        titulosEmAberto: titulosEmAberto.length,
      });
      return { titulosGerados: 0, titulosCriados: [] };
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let dataInicioContrato: Date | null = null;
    if (contrato.data_inicio) {
      const dataRaw = new Date(contrato.data_inicio);
      dataInicioContrato = new Date(dataRaw.getFullYear(), dataRaw.getMonth(), dataRaw.getDate());
      dataInicioContrato.setHours(0, 0, 0, 0);
    }

    const periodicidade: Periodicidade =
      contrato.tipo === 'anual' ? 'anual' : 'mensal';
    const mesesIncrement = TituloGenerationHelper.getMesesIncrement(periodicidade);
    const diasIncrement = TituloGenerationHelper.getDiasIncrement(periodicidade);

    let mesAtual: number;
    let anoAtual: number;
    let diaAtual = diaVencimento;

    if (dataInicioContrato && dataInicioContrato > hoje) {
      mesAtual = dataInicioContrato.getMonth();
      anoAtual = dataInicioContrato.getFullYear();
    } else {
      mesAtual = hoje.getMonth();
      anoAtual = hoje.getFullYear();
    }

    const titulosCriadosNaTransacao: Array<unknown> = [];
    let titulosGerados = 0;

    const avancarPeriodo = (): void => {
      if (diasIncrement > 0) {
        const d = new Date(anoAtual, mesAtual, diaAtual);
        d.setDate(d.getDate() + diasIncrement);
        anoAtual = d.getFullYear();
        mesAtual = d.getMonth();
        diaAtual = d.getDate();
      } else {
        mesAtual += mesesIncrement;
        while (mesAtual > 11) {
          mesAtual -= 12;
          anoAtual++;
        }
      }
    };

    await withTransaction(async (transaction: Transaction) => {
      let tentativas = 0;
      let titulosCriadosNoContrato = 0;

      while (titulosCriadosNoContrato < titulosGerar && tentativas < 100) {
        tentativas++;

        const dataVencimento = await TituloGenerationHelper.calculateDataVencimento(
          anoAtual,
          mesAtual,
          diasIncrement > 0 ? diaAtual : diaVencimento,
          dataInicioContrato,
          hoje,
          null
        );

        const anoVenc = dataVencimento.getFullYear();
        const mesVenc = dataVencimento.getMonth();
        const diaVenc = dataVencimento.getDate();

        const tituloExistente = TituloGenerationHelper.hasTituloForPeriod(
          todosTitulos,
          anoVenc,
          mesVenc,
          diaVenc,
          periodicidade
        );

        const podeGerar =
          !tituloExistente &&
          (!dataInicioContrato || dataVencimento >= dataInicioContrato) &&
          dataVencimento >= hoje;

        if (!podeGerar) {
          avancarPeriodo();
          continue;
        }

        const isDescontoVigente = TituloGenerationHelper.isDescontoVigente(
          contrato.data_validade_desconto,
          dataVencimento
        );
        let valorTitulo = isDescontoVigente ? Number(contrato.valor) || 0 : 0;

        if (valorTitulo <= 0 && contrato.plano?.valor_mensal) {
          const { FinancialCalculationsService } = await import('../../../FinancialCalculationsService');
          valorTitulo = FinancialCalculationsService.calcularValorFinal(
            Number(contrato.plano.valor_mensal),
            isDescontoVigente
              ? {
                  desconto_valor: contrato.desconto_valor,
                  desconto_percentual: contrato.desconto_percentual,
                }
              : undefined
          );
        }

        if (valorTitulo <= 0) {
          valorTitulo = Number(contrato.valor) || Number(contrato.plano?.valor_mensal) || 0;
        }

        if (valorTitulo <= 0) {
          avancarPeriodo();
          continue;
        }

        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 100000);
        const numeroTitulo = `T${contrato.id}-${timestamp}-${titulosCriadosNoContrato}-${random}`;

        const titulo = await SaasTituloGenerationHelper.createTitulo(
          contrato,
          dataVencimento,
          valorTitulo,
          numeroTitulo,
          transaction
        );

        titulosCriadosNaTransacao.push(titulo);
        titulosGerados++;
        titulosCriadosNoContrato++;

        avancarPeriodo();
      }
    });

    await SaasTituloGenerationHelper.registerAuditForTitulos(
      titulosCriadosNaTransacao as Array<{ id: number; toJSON: () => Record<string, unknown> }>
    );

    return { titulosGerados, titulosCriados: titulosCriadosNaTransacao };
  }
}
