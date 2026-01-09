import axios from 'axios';
import { logger } from '../../../utils/logger';

export class HealthCheckService {
  private readonly backendUrl: string;

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl;
  }

  /**
   * Aguarda o backend estar pronto após PM2 reload
   */
  async waitForBackendReady(maxAttempts: number = 30, delayMs: number = 1000): Promise<boolean> {
    logger.info('Aguardando backend estar pronto após PM2 reload', {
      maxAttempts,
      delayMs,
      healthUrl: `${this.backendUrl}/health`,
    });

    for (let i = 0; i < maxAttempts; i++) {
      const healthEndpoints = [`${this.backendUrl}/health`, `${this.backendUrl}/api/health`];
      let healthCheckSuccess = false;
      
      for (const healthUrl of healthEndpoints) {
        try {
          const response = await axios.get(healthUrl, {
            timeout: 2000,
            validateStatus: (status) => status === 200,
          });

          if (response.status === 200 && (response.data?.status === 'ok' || response.data?.status === 'OK')) {
            logger.info('Backend está pronto após PM2 reload', {
              attempts: i + 1,
              maxAttempts,
              responseTime: `${(i + 1) * delayMs}ms`,
              healthUrl,
            });
            return true;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (i < maxAttempts - 1) {
        if (i === 0 || i === 4 || i === 9) {
          logger.debug('Backend ainda não está pronto, aguardando...', {
            attempt: i + 1,
            maxAttempts,
          });
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    logger.warn('Backend não respondeu após múltiplas tentativas', {
      maxAttempts,
      totalWaitTime: `${maxAttempts * delayMs}ms`,
      healthUrl: `${this.backendUrl}/health`,
    });
    return false;
  }
}
