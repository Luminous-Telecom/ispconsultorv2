import { VariableHandler, VariableContext, VariableSubstitutions, GrupoVariaveis } from './types';
import { Formatter } from './utils/Formatter';
import { VariableReplacer } from './utils/VariableReplacer';
import { DadosEmpresa } from '../../models/DadosEmpresa';

/**
 * Handler para processamento de variáveis do sistema
 */
export class SistemaVariableHandler implements VariableHandler {
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
        { variavel: '#assinatura_consultor#', descricao: 'Assinatura do responsável da empresa' },
        { variavel: '#assinatura_cliente#', descricao: 'Espaço para assinatura do cliente (vazio)' }
      ]
    };
  }

  async process(conteudo: string, context: VariableContext): Promise<string> {
    const dataRef = context.dataReferencia || new Date();
    const assinaturaHtml = await this.processarAssinatura(conteudo, context);
    const substitutions = this.buildSubstitutions(dataRef, assinaturaHtml);
    
    return VariableReplacer.replace(conteudo, substitutions);
  }

  /**
   * Processa assinatura do responsável
   */
  private async processarAssinatura(conteudo: string, context: VariableContext): Promise<string> {
    if (!conteudo.includes('#assinatura_consultor#')) {
      return '';
    }

    const empresa = await DadosEmpresa.findOne({
      order: [['id', 'DESC']]
    });

    if (!empresa || !empresa.responsavel_assinatura) {
      return '';
    }

    // Construir URL completa se necessário
    let assinaturaUrl = empresa.responsavel_assinatura;
    if (!assinaturaUrl.startsWith('http://') && !assinaturaUrl.startsWith('https://')) {
      const baseUrl = context.baseUrl || process.env.BASE_URL || 'http://localhost:3001';
      assinaturaUrl = `${baseUrl}${assinaturaUrl}`;
    }

    return `<img src="${assinaturaUrl}" alt="Assinatura do Responsável" style="max-width: 200px; height: auto;" />`;
  }

  /**
   * Constrói o mapa de substituições para variáveis do sistema
   */
  private buildSubstitutions(dataRef: Date, assinaturaHtml: string): VariableSubstitutions {
    return {
      '#sistema.data_atual#': Formatter.formatarData(dataRef),
      '#sistema.hora_atual#': Formatter.formatarHora(dataRef),
      '#sistema.data_hora_atual#': Formatter.formatarDataHora(dataRef),
      '#sistema.ano_atual#': String(dataRef.getFullYear()),
      '#sistema.mes_atual#': String(dataRef.getMonth() + 1).padStart(2, '0'),
      '#assinatura_consultor#': assinaturaHtml,
      '#assinatura_cliente#': ''
    };
  }
}

