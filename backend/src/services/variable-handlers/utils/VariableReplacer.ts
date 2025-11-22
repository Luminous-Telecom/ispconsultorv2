import { VariableSubstitutions } from '../types';

/**
 * Classe utilitária para substituição de variáveis em texto
 */
export class VariableReplacer {
  /**
   * Escapa caracteres especiais de regex
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Substitui todas as ocorrências de variáveis no conteúdo
   */
  static replace(conteudo: string, substitutions: VariableSubstitutions): string {
    let resultado = conteudo;

    for (const [variavel, valor] of Object.entries(substitutions)) {
      const pattern = new RegExp(this.escapeRegex(variavel), 'g');
      resultado = resultado.replace(pattern, valor);
    }

    return resultado;
  }

  /**
   * Verifica se o conteúdo contém alguma variável do conjunto fornecido
   */
  static containsAny(conteudo: string, variaveis: string[]): boolean {
    return variaveis.some(variavel => conteudo.includes(variavel));
  }
}

