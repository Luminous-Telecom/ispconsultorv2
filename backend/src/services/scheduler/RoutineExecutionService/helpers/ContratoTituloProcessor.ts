import { withTransaction } from '../../../../utils/transaction';
import type { Transaction } from 'sequelize';
import { logger } from '../../../../utils/logger';
import { TituloGenerationHelper } from './TituloGenerationHelper';
import type Parametros from '../../../../models/sistema/Parametros';

type Periodicidade = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal' | null | undefined;

interface ContratoWithPlano {
  id: number;
  cliente_id: number;
  plano_id: number;
  conta_boleto: number;
  dia_vencimento_id: number;
  valor_final: number | null;
  desconto_valor: number | null;
  desconto_percentual: number | null;
  data_inicio: Date | null;
  isento_mensalidade?: boolean;
  plano?: {
    valor_mensal: number;
    nome_plano?: string;
    periodicidade?: Periodicidade;
  };
  tipoCobrancaContrato?: {
    quantidade_titulos: number;
    periodicidade: string;
  } | null;
}

interface TituloData {
  data_vencimento: Date;
  status?: string;
}

interface ContratoPlanoAdicionalWithPlano {
  plano?: {
    id: number;
    nome_plano?: string;
    valor_mensal: number;
  };
  valor_final?: number | null;
  desconto_valor?: number | null;
  desconto_percentual?: number | null;
  contrato_id: number;
}

export class ContratoTituloProcessor {
  /**
   * Processa um contrato e gera os títulos necessários
   */
  static async processContrato(
    contrato: ContratoWithPlano,
    titulosEmAberto: Array<TituloData>,
    todosTitulos: Array<TituloData>,
    diaVencimento: number,
    quantidadeMinimaTitulos: number,
    parametros: Parametros | null,
    servicosAdicionais: Array<ContratoPlanoAdicionalWithPlano>
  ): Promise<{ titulosGerados: number; titulosCriados: Array<any> }> {
    if (contrato.isento_mensalidade === true) {
      logger.info('ContratoTituloProcessor.processContrato - Contrato isento (taxa isenta), não gera títulos', {
        contratoId: contrato.id,
        clienteId: contrato.cliente_id
      });
      return { titulosGerados: 0, titulosCriados: [] };
    }

    const titulosGerar = quantidadeMinimaTitulos - titulosEmAberto.length;

    if (titulosGerar <= 0) {
      logger.info('ContratoTituloProcessor.processContrato - Quantidade de títulos já suficiente, nada a gerar', {
        contratoId: contrato.id,
        clienteId: contrato.cliente_id,
        quantidadeMinimaTitulos,
        titulosEmAberto: titulosEmAberto.length,
        titulosGerar
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

    const periodicidade: Periodicidade = (contrato.tipoCobrancaContrato?.periodicidade as Periodicidade) ?? (contrato.plano?.periodicidade as Periodicidade) ?? 'mensal';
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

    const titulosCriadosNaTransacao: Array<any> = [];
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
      let títulosCriadosNoContrato = 0;

      while (títulosCriadosNoContrato < titulosGerar && tentativas < 100) {
        tentativas++;
        
        const dataVencimento = await TituloGenerationHelper.calculateDataVencimento(
          anoAtual,
          mesAtual,
          diasIncrement > 0 ? diaAtual : diaVencimento,
          dataInicioContrato,
          hoje,
          parametros
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

        const podeGerar = !tituloExistente && 
          (!dataInicioContrato || dataVencimento >= dataInicioContrato) &&
          dataVencimento >= hoje;
        
        if (!podeGerar) {
          avancarPeriodo();
          continue;
        }
        
        if (podeGerar) {
          const valorTitulo = await TituloGenerationHelper.calculateValorTitulo(
            contrato,
            servicosAdicionais
          );

          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 100000);
          const numeroTitulo = `T${contrato.id}-${timestamp}-${títulosCriadosNoContrato}-${random}`;
          
          const titulo = await TituloGenerationHelper.createTitulo(
            contrato,
            dataVencimento,
            valorTitulo,
            numeroTitulo,
            transaction
          );

          titulosCriadosNaTransacao.push(titulo);
          titulosGerados++;
          títulosCriadosNoContrato++;
        }

        avancarPeriodo();
      }
    });

    await TituloGenerationHelper.registerAuditForTitulos(titulosCriadosNaTransacao);

    return { titulosGerados, titulosCriados: titulosCriadosNaTransacao };
  }
}
