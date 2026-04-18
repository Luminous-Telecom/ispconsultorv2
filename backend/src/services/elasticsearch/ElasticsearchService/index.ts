/**
 * Serviço de Configuração do Elasticsearch
 * Gerencia conexão e configuração do cliente Elasticsearch
 *
 * A criação de índices / data streams é responsabilidade do script
 * `src/scripts/setupElasticsearch.ts` (executar uma vez no deploy).
 *
 * @module services/elasticsearch/ElasticsearchService
 */
import { Client } from '@elastic/elasticsearch';
import { logger } from '../../../utils/logger';

class ElasticsearchService {
  private client: Client | null = null;
  private isConnected = false;

  /**
   * Inicializa e retorna o cliente Elasticsearch
   */
  getClient(): Client | null {
    if (this.client) {
      return this.client;
    }

    const node = process.env.ELASTICSEARCH_NODE;

    if (!node) {
      logger.warn('ELASTICSEARCH_NODE não configurado. Auditoria com Elasticsearch desabilitada.');
      return null;
    }

    try {
      const clientConfig: ConstructorParameters<typeof Client>[0] = {
        node,
        requestTimeout: 10000,
        pingTimeout: 10000
      };

      const username = process.env.ELASTICSEARCH_USERNAME;
      const password = process.env.ELASTICSEARCH_PASSWORD;

      if (username && password) {
        clientConfig.auth = {
          username: username.trim(),
          password: password.trim()
        };
      }

      this.client = new Client(clientConfig);
      return this.client;
    } catch (error) {
      logger.error('Erro ao inicializar cliente Elasticsearch', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    }
  }

  /**
   * Verifica conexão com Elasticsearch
   */
  async checkConnection(): Promise<boolean> {
    const client = this.getClient();

    if (!client) {
      return false;
    }

    try {
      await client.ping();
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.warn(`Falha ao verificar conexão com Elasticsearch - ${errorMessage}`);
      return false;
    }
  }

  /**
   * Retorna status da conexão (último ping bem-sucedido)
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

let instance: ElasticsearchService | null = null;

export const getElasticsearchService = (): ElasticsearchService => {
  if (!instance) {
    instance = new ElasticsearchService();
  }
  return instance;
};

export default getElasticsearchService;
