import { VariableHandler, VariableContext, VariableSubstitutions, GrupoVariaveis } from '../types';
import { Contrato } from '../../../models/contratos/Contrato';
import { Plano } from '../../../models/cadastros/Plano';
import { DiasVencimento } from '../../../models/cadastros/DiasVencimento';
import { Formatter } from '../utils/Formatter';
import { VariableReplacer } from '../utils/VariableReplacer';

interface ContratoWithPlano extends Contrato {
  plano?: Plano;
}

/**
 * Handler para processamento de variáveis relacionadas ao Contrato
 */
export class ContratoVariableHandler implements VariableHandler {
  private static readonly VARIABLES = [
    '#contrato.id#',
    '#contrato.plano#',
    '#contrato.valor_contrato#',
    '#contrato.valor_mensal#',
    '#contrato.valor_final#',
    '#contrato.desconto_percentual#',
    '#contrato.desconto_valor#',
    '#contrato.data_inicio#',
    '#contrato.data_fim#',
    '#contrato.data_validade_desconto#',
    '#contrato.status#',
    '#contrato.dia_vencimento#',
    '#contrato.isento_mensalidade#'
  ];

  canProcess(conteudo: string): boolean {
    return VariableReplacer.containsAny(conteudo, ContratoVariableHandler.VARIABLES);
  }

  getVariaveisDisponiveis(): GrupoVariaveis {
    return {
      titulo: 'Dados do Contrato',
      variaveis: [
        { variavel: '#contrato.id#', descricao: 'ID do contrato' },
        { variavel: '#contrato.plano#', descricao: 'Nome do plano' },
        { variavel: '#contrato.valor_contrato#', descricao: 'Valor do contrato' },
        { variavel: '#contrato.valor_mensal#', descricao: 'Valor mensal do plano' },
        { variavel: '#contrato.valor_final#', descricao: 'Valor final com descontos' },
        { variavel: '#contrato.desconto_percentual#', descricao: 'Desconto percentual (%)' },
        { variavel: '#contrato.desconto_valor#', descricao: 'Desconto em valor (R$)' },
        { variavel: '#contrato.data_inicio#', descricao: 'Data de início do contrato' },
        { variavel: '#contrato.data_fim#', descricao: 'Data de fim do contrato' },
        { variavel: '#contrato.data_validade_desconto#', descricao: 'Validade do desconto' },
        { variavel: '#contrato.status#', descricao: 'Status do contrato' },
        { variavel: '#contrato.dia_vencimento#', descricao: 'Dia de vencimento' },
        { variavel: '#contrato.isento_mensalidade#', descricao: 'Isento de mensalidade (Sim/Não)' }
      ]
    };
  }

  async process(conteudo: string, context: VariableContext): Promise<string> {
    if (!context.contrato) {
      return conteudo;
    }

    const contratoCompleto = await this.ensureContratoWithPlano(context.contrato);
    const diaVencimento = await this.obterDiaVencimento(contratoCompleto);
    const substitutions = this.buildSubstitutions(contratoCompleto, diaVencimento);
    
    return VariableReplacer.replace(conteudo, substitutions);
  }

  /**
   * Garante que o contrato tenha o plano carregado
   */
  private async ensureContratoWithPlano(
    contrato: Contrato | (Partial<Contrato> & { id: number })
  ): Promise<ContratoWithPlano> {
    if ('plano' in contrato && contrato.plano) {
      return contrato as ContratoWithPlano;
    }

    const contratoCompleto = await Contrato.findByPk(contrato.id, {
      include: [{ model: Plano, as: 'plano' }]
    });

    if (!contratoCompleto) {
      return contrato as ContratoWithPlano;
    }

    return contratoCompleto as ContratoWithPlano;
  }

  /**
   * Obtém o dia de vencimento do contrato
   */
  private async obterDiaVencimento(contrato: ContratoWithPlano): Promise<string> {
    if (!contrato.dia_vencimento_id) {
      return '';
    }

    try {
      const diaVencimento = await DiasVencimento.findByPk(contrato.dia_vencimento_id);
      return diaVencimento?.dia != null ? String(diaVencimento.dia) : '';
    } catch {
      return '';
    }
  }

  /**
   * Calcula o valor do contrato
   */
  private calcularValorContrato(contrato: ContratoWithPlano): number {
    if (contrato.valor_final) {
      return contrato.valor_final;
    }

    return contrato.plano?.valor_mensal || 0;
  }

  /**
   * Constrói o mapa de substituições para variáveis de contrato
   */
  private buildSubstitutions(
    contrato: ContratoWithPlano,
    diaVencimento: string
  ): VariableSubstitutions {
    const valorContrato = this.calcularValorContrato(contrato);

    return {
      '#contrato.id#': String(contrato.id),
      '#contrato.plano#': contrato.plano?.nome_plano || '',
      '#contrato.valor_contrato#': Formatter.formatarMoeda(valorContrato),
      '#contrato.valor_mensal#': Formatter.formatarMoeda(contrato.plano?.valor_mensal || 0),
      '#contrato.valor_final#': Formatter.formatarMoeda(contrato.valor_final || 0),
      '#contrato.desconto_percentual#': `${contrato.desconto_percentual || 0}%`,
      '#contrato.desconto_valor#': Formatter.formatarMoeda(contrato.desconto_valor || 0),
      '#contrato.data_inicio#': contrato.data_inicio 
        ? Formatter.formatarData(new Date(contrato.data_inicio)) 
        : '',
      '#contrato.data_fim#': contrato.data_fim 
        ? Formatter.formatarData(new Date(contrato.data_fim)) 
        : '',
      '#contrato.data_validade_desconto#': contrato.data_validade_desconto 
        ? Formatter.formatarData(new Date(contrato.data_validade_desconto)) 
        : '',
      '#contrato.status#': contrato.status || '',
      '#contrato.dia_vencimento#': diaVencimento,
      '#contrato.isento_mensalidade#': contrato.isento_mensalidade ? 'Sim' : 'Não'
    };
  }
}

