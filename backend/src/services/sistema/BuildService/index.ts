import { logger } from '../../../utils/logger';
import type { CommandResult } from '../GitUpdateService';

export class BuildService {
  /**
   * Executa o build da aplicação
   * Em produção, o código já vem compilado, então sempre retorna sucesso
   */
  async build(): Promise<CommandResult> {
    logger.debug('Build pulado: código já está compilado em produção');
    return {
      success: true,
      stdout: 'Build pulado: código já está compilado',
      stderr: '',
    };
  }
}
