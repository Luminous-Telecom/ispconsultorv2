import { IVariableHandler, VariableContext, VariableSubstitutions, GrupoVariaveis } from './types';
import { Formatter } from './utils/Formatter';
import { VariableReplacer } from './utils/VariableReplacer';

/**
 * Handler para processamento de variáveis do sistema
 */
export class SistemaVariableHandler implements IVariableHandler {
  private static readonly VARIABLES = [
    '#sistema.data_atual#',
    '#sistema.hora_atual#',
    '#sistema.data_hora_atual#',
    '#sistema.ano_atual#',
    '#sistema.mes_atual#',
    '#assinatura_consultor#',
    '#assinatura_cliente#'
  ];

  canProcess(conteudo: string): boolean {
    return VariableReplacer.containsAny(conteudo, SistemaVariableHandler.VARIABLES);
  }

  getVariaveisDisponiveis(): GrupoVariaveis {
    return {
      titulo: 'Dados do Sistema',
      variaveis: [
        { variavel: '#sistema.data_atual#', descricao: 'Data atual' },
        { variavel: '#sistema.hora_atual#', descricao: 'Hora atual' },
        { variavel: '#sistema.data_hora_atual#', descricao: 'Data e hora atual' },
        { variavel: '#sistema.ano_atual#', descricao: 'Ano atual' },
        { variavel: '#sistema.mes_atual#', descricao: 'Mês atual' },
        { variavel: '#assinatura_consultor#', descricao: 'Espaço para assinatura do consultor (vazio)' },
        { variavel: '#assinatura_cliente#', descricao: 'Espaço para assinatura do cliente (vazio)' }
      ]
    };
  }

  process(conteudo: string, context: VariableContext): string {
    const dataRef = context.dataReferencia || new Date();
    const substitutions = this.buildSubstitutions(dataRef);
    
    return VariableReplacer.replace(conteudo, substitutions);
  }

  /**
   * Constrói o mapa de substituições para variáveis do sistema
   */
  private buildSubstitutions(dataRef: Date): VariableSubstitutions {
    return {
      '#sistema.data_atual#': Formatter.formatarData(dataRef),
      '#sistema.hora_atual#': Formatter.formatarHora(dataRef),
      '#sistema.data_hora_atual#': Formatter.formatarDataHora(dataRef),
      '#sistema.ano_atual#': String(dataRef.getFullYear()),
      '#sistema.mes_atual#': String(dataRef.getMonth() + 1).padStart(2, '0'),
      '#assinatura_consultor#': '',
      '#assinatura_cliente#': ''
    };
  }
}

