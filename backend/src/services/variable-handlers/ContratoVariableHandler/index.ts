import type { contratos, cadastros_planos } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { VariableHandler, VariableContext, VariableSubstitutions, GrupoVariaveis } from '../types';
import { Formatter } from '../utils/Formatter';
import { VariableReplacer } from '../utils/VariableReplacer';

interface ContratoWithPlano extends contratos {
  plano?: cadastros_planos | null;
  cadastros_planos?: cadastros_planos | null;
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
    contrato: contratos | (Partial<contratos> & { id: number; plano?: cadastros_planos | null })
  ): Promise<ContratoWithPlano> {
    if ('plano' in contrato && contrato.plano) {
      return contrato as ContratoWithPlano;
    }
    if ('cadastros_planos' in contrato && contrato.cadastros_planos) {
      return { ...contrato, plano: contrato.cadastros_planos } as ContratoWithPlano;
    }

    const contratoCompleto = await prisma.contratos.findUnique({
      where: { id: Number(contrato.id) },
      include: { cadastros_planos: true },
    });

    if (!contratoCompleto) {
      return contrato as ContratoWithPlano;
    }

    return { ...contratoCompleto, plano: contratoCompleto.cadastros_planos };
  }

  /**
   * Obtém o dia de vencimento do contrato
   */
  private async obterDiaVencimento(contrato: ContratoWithPlano): Promise<string> {
    if (!contrato.dia_vencimento_id) {
      return '';
    }

    try {
      const diaVencimento = await prisma.cadastros_dias_vencimento.findUnique({
        where: { id: Number(contrato.dia_vencimento_id) },
      });
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
      return Number(contrato.valor_final);
    }

    return Number(contrato.plano?.valor_mensal || 0);
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
      '#contrato.valor_mensal#': Formatter.formatarMoeda(Number(contrato.plano?.valor_mensal || 0)),
      '#contrato.valor_final#': Formatter.formatarMoeda(Number(contrato.valor_final || 0)),
      '#contrato.desconto_percentual#': `${Number(contrato.desconto_percentual || 0)}%`,
      '#contrato.desconto_valor#': Formatter.formatarMoeda(Number(contrato.desconto_valor || 0)),
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

