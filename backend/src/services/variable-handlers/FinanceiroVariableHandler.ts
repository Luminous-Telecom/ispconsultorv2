import { IVariableHandler, VariableContext, VariableSubstitutions, GrupoVariaveis } from './types';
import { Cliente } from '../../models/Cliente';
import { Titulo } from '../../models/Titulo';
import { Op } from 'sequelize';
import { Formatter } from './utils/Formatter';
import { VariableReplacer } from './utils/VariableReplacer';

interface CalculosFinanceiros {
  totalAberto: number;
  totalVencido: number;
  totalPago: number;
  quantidadeAbertos: number;
  quantidadeVencidos: number;
  maiorAtraso: number;
  totalJuros: number;
  totalMulta: number;
  valorComJurosMulta: number;
}

/**
 * Handler para processamento de variáveis financeiras
 */
export class FinanceiroVariableHandler implements IVariableHandler {
  private static readonly VARIABLES = [
    '#financeiro.total_aberto#',
    '#financeiro.total_vencido#',
    '#financeiro.total_pago#',
    '#financeiro.quantidade_titulos_abertos#',
    '#financeiro.quantidade_titulos_vencidos#',
    '#financeiro.maior_atraso_dias#',
    '#financeiro.total_juros#',
    '#financeiro.total_multa#',
    '#financeiro.valor_com_juros_multa#'
  ];

  canProcess(conteudo: string): boolean {
    return VariableReplacer.containsAny(conteudo, FinanceiroVariableHandler.VARIABLES);
  }

  getVariaveisDisponiveis(): GrupoVariaveis {
    return {
      titulo: 'Dados Financeiros',
      variaveis: [
        { variavel: '#financeiro.total_aberto#', descricao: 'Total de valores em aberto' },
        { variavel: '#financeiro.total_vencido#', descricao: 'Total de valores vencidos' },
        { variavel: '#financeiro.total_pago#', descricao: 'Total já pago' },
        { variavel: '#financeiro.quantidade_titulos_abertos#', descricao: 'Quantidade de títulos em aberto' },
        { variavel: '#financeiro.quantidade_titulos_vencidos#', descricao: 'Quantidade de títulos vencidos' },
        { variavel: '#financeiro.maior_atraso_dias#', descricao: 'Maior atraso em dias' },
        { variavel: '#financeiro.total_juros#', descricao: 'Total de juros acumulados' },
        { variavel: '#financeiro.total_multa#', descricao: 'Total de multa acumulada' },
        { variavel: '#financeiro.valor_com_juros_multa#', descricao: 'Valor total com juros e multa' }
      ]
    };
  }

  async process(conteudo: string, context: VariableContext): Promise<string> {
    if (!context.cliente) {
      return conteudo;
    }

    const dataRef = context.dataReferencia || new Date();
    const calculos = await this.calcularValoresFinanceiros(context.cliente, dataRef);
    const substitutions = this.buildSubstitutions(calculos);
    
    return VariableReplacer.replace(conteudo, substitutions);
  }

  /**
   * Busca títulos do cliente com status pendente ou vencido
   */
  private async buscarTitulos(cliente: Cliente): Promise<Titulo[]> {
    return Titulo.findAll({
      where: {
        cliente_id: cliente.id,
        status: { [Op.in]: ['pendente', 'vencido'] }
      }
    });
  }

  /**
   * Calcula valores financeiros agregados do cliente
   */
  private async calcularValoresFinanceiros(
    cliente: Cliente,
    dataRef: Date
  ): Promise<CalculosFinanceiros> {
    const titulos = await this.buscarTitulos(cliente);

    const calculos: CalculosFinanceiros = {
      totalAberto: 0,
      totalVencido: 0,
      totalPago: 0,
      quantidadeAbertos: 0,
      quantidadeVencidos: 0,
      maiorAtraso: 0,
      totalJuros: 0,
      totalMulta: 0,
      valorComJurosMulta: 0
    };

    for (const titulo of titulos) {
      const valor = titulo.valor || 0;
      const valorPago = titulo.valor_pago || 0;
      const saldo = valor - valorPago;

      calculos.totalPago += valorPago;

      if (saldo <= 0) {
        continue;
      }

      calculos.totalAberto += saldo;
      calculos.quantidadeAbertos++;

      const vencimento = titulo.data_vencimento ? new Date(titulo.data_vencimento) : null;
      
      if (!vencimento || vencimento >= dataRef) {
        this.adicionarJurosEMulta(titulo, valor, calculos);
        continue;
      }

      calculos.totalVencido += saldo;
      calculos.quantidadeVencidos++;

      const diasAtraso = Math.floor((dataRef.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diasAtraso > calculos.maiorAtraso) {
        calculos.maiorAtraso = diasAtraso;
      }

      this.adicionarJurosEMulta(titulo, valor, calculos);
    }

    calculos.valorComJurosMulta = calculos.totalAberto + calculos.totalJuros + calculos.totalMulta;

    return calculos;
  }

  /**
   * Adiciona juros e multa aos cálculos
   * Nota: Este método usa acrescimo_percentual e acrescimo_valor do título,
   * não os juros e multa padrão do banco
   */
  private adicionarJurosEMulta(
    titulo: Titulo,
    valor: number,
    calculos: CalculosFinanceiros
  ): void {
    const { FinancialCalculationsService } = require('../FinancialCalculationsService');
    
    const acrescimoResult = FinancialCalculationsService.calcularAcrescimo(valor, {
      acrescimo_percentual: titulo.acrescimo_percentual,
      acrescimo_valor: titulo.acrescimo_valor
    });

    // Separar juros (percentual) e multa (valor fixo) para compatibilidade
    const juros = titulo.acrescimo_percentual && titulo.acrescimo_percentual > 0
      ? acrescimoResult.valorAcrescimo - (titulo.acrescimo_valor || 0)
      : 0;
    
    const multa = titulo.acrescimo_valor || 0;

    calculos.totalJuros += juros;
    calculos.totalMulta += multa;
  }

  /**
   * Constrói o mapa de substituições para variáveis financeiras
   */
  private buildSubstitutions(calculos: CalculosFinanceiros): VariableSubstitutions {
    return {
      '#financeiro.total_aberto#': Formatter.formatarMoeda(calculos.totalAberto),
      '#financeiro.total_vencido#': Formatter.formatarMoeda(calculos.totalVencido),
      '#financeiro.total_pago#': Formatter.formatarMoeda(calculos.totalPago),
      '#financeiro.quantidade_titulos_abertos#': String(calculos.quantidadeAbertos),
      '#financeiro.quantidade_titulos_vencidos#': String(calculos.quantidadeVencidos),
      '#financeiro.maior_atraso_dias#': String(calculos.maiorAtraso),
      '#financeiro.total_juros#': Formatter.formatarMoeda(calculos.totalJuros),
      '#financeiro.total_multa#': Formatter.formatarMoeda(calculos.totalMulta),
      '#financeiro.valor_com_juros_multa#': Formatter.formatarMoeda(calculos.valorComJurosMulta)
    };
  }
}

