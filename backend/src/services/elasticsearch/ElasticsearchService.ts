/**
 * Serviço de Configuração do Elasticsearch
 * Gerencia conexão e configuração do cliente Elasticsearch
 * 
 * @module services/elasticsearch/ElasticsearchService
 */
import { Client } from '@elastic/elasticsearch';
import { logger } from '../../utils/logger';

class ElasticsearchService {
  private client: Client | null = null;
  private isConnected = false;
  private readonly indexName: string;

  constructor() {
    // Nome do índice padrão para auditoria
    this.indexName = process.env.ELASTICSEARCH_INDEX_NAME || 'backnet-auditoria';
  }

  /**
   * Inicializa e retorna o cliente Elasticsearch
   */
  getClient(): Client | null {
    if (this.client) {
      return this.client;
    }

    const node = process.env.ELASTICSEARCH_NODE;
    
    if (!node) {
      logger.warn('ELASTICSEARCH_NODE não configurado. Auditoria com Elasticsearch desabilitada.', {
        context: 'ElasticsearchService',
        action: 'getClient'
      });
      return null;
    }

    try {
      const clientConfig: any = {
        node,
      };

      // Configuração de autenticação (se necessário)
      if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
        clientConfig.auth = {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD,
        };
      }

      // Configuração de SSL/TLS (se necessário)
      if (process.env.ELASTICSEARCH_SSL === 'true') {
        clientConfig.ssl = {
          rejectUnauthorized: process.env.ELASTICSEARCH_SSL_REJECT_UNAUTHORIZED !== 'false',
        };
      }

      this.client = new Client(clientConfig);
      
      logger.info('Cliente Elasticsearch inicializado', {
        context: 'ElasticsearchService',
        action: 'getClient',
        node
      });

      return this.client;
    } catch (error) {
      logger.error('Erro ao inicializar cliente Elasticsearch', {
        context: 'ElasticsearchService',
        action: 'getClient',
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
      const response = await client.ping();
      this.isConnected = response;
      
      if (this.isConnected) {
        logger.debug('Conexão com Elasticsearch verificada', {
          context: 'ElasticsearchService',
          action: 'checkConnection'
        });
      }
      
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      logger.warn('Falha ao verificar conexão com Elasticsearch', {
        context: 'ElasticsearchService',
        action: 'checkConnection',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return false;
    }
  }

  /**
   * Cria o índice de auditoria se não existir
   */
  async ensureIndex(): Promise<void> {
    const client = this.getClient();
    
    if (!client) {
      return;
    }

    try {
      const exists = await client.indices.exists({ index: this.indexName });
      
      if (!exists) {
        await client.indices.create({
          index: this.indexName,
          mappings: {
            properties: {
              usuario_id: { type: 'integer' },
              usuario_nome: { type: 'keyword' },
              usuario_email: { type: 'keyword' },
              acao: { type: 'keyword' },
              entidade: { type: 'keyword' },
              entidade_id: { type: 'integer' },
              dados_anteriores: { type: 'object', enabled: true },
              dados_novos: { type: 'object', enabled: true },
              ip_address: { type: 'ip' },
              user_agent: { type: 'text' },
              rota: { type: 'keyword' },
              metodo_http: { type: 'keyword' },
              observacoes: { type: 'text' },
              timestamp: { type: 'date' }
            }
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0
          }
        });

        logger.info('Índice de auditoria criado no Elasticsearch', {
          context: 'ElasticsearchService',
          action: 'ensureIndex',
          index: this.indexName
        });
      }
    } catch (error) {
      logger.error('Erro ao criar índice de auditoria', {
        context: 'ElasticsearchService',
        action: 'ensureIndex',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        index: this.indexName
      });
    }
  }

  /**
   * Retorna o nome do índice
   */
  getIndexName(): string {
    return this.indexName;
  }

  /**
   * Retorna status da conexão
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let instance: ElasticsearchService | null = null;

export const getElasticsearchService = (): ElasticsearchService => {
  if (!instance) {
    instance = new ElasticsearchService();
  }
  return instance;
};

export default getElasticsearchService;

