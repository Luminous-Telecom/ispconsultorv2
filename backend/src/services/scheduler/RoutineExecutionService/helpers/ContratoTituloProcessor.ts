import { withTransaction } from '../../../../utils/transaction';
import type { Transaction } from 'sequelize';
import { TituloGenerationHelper } from './TituloGenerationHelper';
import type Parametros from '../../../../models/sistema/Parametros';

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
  plano?: {
    valor_mensal: number;
    nome_plano?: string;
  };
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
    const titulosGerar = quantidadeMinimaTitulos - titulosEmAberto.length;

    if (titulosGerar <= 0) {
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

    let mesAtual: number;
    let anoAtual: number;
    
    if (dataInicioContrato && dataInicioContrato > hoje) {
      mesAtual = dataInicioContrato.getMonth();
      anoAtual = dataInicioContrato.getFullYear();
    } else {
      mesAtual = hoje.getMonth();
      anoAtual = hoje.getFullYear();
    }

    const titulosCriadosNaTransacao: Array<any> = [];
    let titulosGerados = 0;

    await withTransaction(async (transaction: Transaction) => {
      let tentativas = 0;
      let títulosCriadosNoContrato = 0;

      while (títulosCriadosNoContrato < titulosGerar && tentativas < 100) {
        tentativas++;
        
        const dataVencimento = await TituloGenerationHelper.calculateDataVencimento(
          anoAtual,
          mesAtual,
          diaVencimento,
          dataInicioContrato,
          hoje,
          parametros
        );

        const tituloExistente = TituloGenerationHelper.hasTituloForMonth(todosTitulos, anoAtual, mesAtual);

        const podeGerar = !tituloExistente && 
          (!dataInicioContrato || dataVencimento >= dataInicioContrato) &&
          dataVencimento >= hoje;
        
        if (!podeGerar) {
          mesAtual++;
          if (mesAtual > 11) {
            mesAtual = 0;
            anoAtual++;
          }
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

        mesAtual++;
        if (mesAtual > 11) {
          mesAtual = 0;
          anoAtual++;
        }
      }
    });

    await TituloGenerationHelper.registerAuditForTitulos(titulosCriadosNaTransacao);

    return { titulosGerados, titulosCriados: titulosCriadosNaTransacao };
  }
}
