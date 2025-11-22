import { formatDate } from '../../../utils/dateUtils';

/**
 * Classe utilitária para formatação de valores
 */
export class Formatter {
  /**
   * Formata valor numérico como moeda brasileira
   */
  static formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  /**
   * Formata data no formato brasileiro
   */
  static formatarData(data: Date): string {
    return formatDate(data) || '';
  }

  /**
   * Formata hora no formato brasileiro (HH:mm)
   */
  static formatarHora(data: Date): string {
    return data.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Formata data e hora no formato brasileiro
   */
  static formatarDataHora(data: Date): string {
    return `${this.formatarData(data)} ${this.formatarHora(data)}`;
  }

  /**
   * Converte UF para nome completo do estado
   */
  static obterNomeEstado(uf: string): string {
    const estados: Record<string, string> = {
      'AC': 'Acre',
      'AL': 'Alagoas',
      'AP': 'Amapá',
      'AM': 'Amazonas',
      'BA': 'Bahia',
      'CE': 'Ceará',
      'DF': 'Distrito Federal',
      'ES': 'Espírito Santo',
      'GO': 'Goiás',
      'MA': 'Maranhão',
      'MT': 'Mato Grosso',
      'MS': 'Mato Grosso do Sul',
      'MG': 'Minas Gerais',
      'PA': 'Pará',
      'PB': 'Paraíba',
      'PR': 'Paraná',
      'PE': 'Pernambuco',
      'PI': 'Piauí',
      'RJ': 'Rio de Janeiro',
      'RN': 'Rio Grande do Norte',
      'RS': 'Rio Grande do Sul',
      'RO': 'Rondônia',
      'RR': 'Roraima',
      'SC': 'Santa Catarina',
      'SP': 'São Paulo',
      'SE': 'Sergipe',
      'TO': 'Tocantins'
    };
    
    return estados[uf.toUpperCase()] || uf;
  }

  /**
   * Monta endereço completo a partir de componentes
   */
  static montarEnderecoCompleto(componentes: (string | null | undefined)[]): string {
    return componentes.filter(Boolean).join(', ');
  }
}

