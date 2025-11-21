import { Parametro } from '../models/Parametro';
import { logger } from '../utils/logger';

export class ParametroService {
  /**
   * Obter valor de um parâmetro específico
   */
  static async getParametro(chave: string): Promise<string | null> {
    try {
      const parametro = await Parametro.findOne({
        where: { chave, ativo: true }
      });
      
      return parametro ? parametro.valor : null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter parâmetro', {
        context: 'ParametroService',
        action: 'getParametro',
        chave,
        error: errorMessage,
        stack: errorStack
      });
      return null;
    }
  }

  /**
   * Obter valor booleano de um parâmetro
   */
  static async getParametroBoolean(chave: string): Promise<boolean> {
    const valor = await this.getParametro(chave);
    return valor === 'true' || valor === '1';
  }

  /**
   * Obter valor numérico de um parâmetro
   */
  static async getParametroNumber(chave: string): Promise<number> {
    const valor = await this.getParametro(chave);
    return valor ? parseInt(valor, 10) : 0;
  }

  /**
   * Verificar se auto parcelas está habilitado
   */
  static async isAutoParcelasEnabled(): Promise<boolean> {
    return await this.getParametroBoolean('auto_parcelas_carne');
  }

  /**
   * Obter número de parcelas padrão para auto geração
   */
  static async getNumeroParcelasPadrao(): Promise<number> {
    const numeroParcelas = await this.getParametroNumber('numero_parcelas_padrao');
    return numeroParcelas > 0 ? numeroParcelas : 12; // Default 12 parcelas
  }

  /**
   * Verificar se geração automática de carnê está habilitada
   */
  static async isGeracaoAutomaticaCarneEnabled(): Promise<boolean> {
    return await this.getParametroBoolean('geracao_automatica_carne');
  }

  /**
   * Verificar se deve manter sempre um carnê para o cliente
   */
  static async isManterCarneClienteEnabled(): Promise<boolean> {
    return await this.getParametroBoolean('manter_carnes_cliente');
  }
}

export default ParametroService;
