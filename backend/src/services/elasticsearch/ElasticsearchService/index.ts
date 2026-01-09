/**
 * Serviço de Configuração do Elasticsearch
 * Gerencia conexão e configuração do cliente Elasticsearch
 * 
 * @module services/elasticsearch/ElasticsearchService
 */
import { Client } from '@elastic/elasticsearch';
import { logger } from '../../../utils/logger';

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
      logger.warn('ELASTICSEARCH_NODE não configurado. Auditoria com Elasticsearch desabilitada.');
      return null;
    }

    try {
      const clientConfig: any = {
        node,
        requestTimeout: 10000,
        pingTimeout: 10000,
      };

      // Configuração de autenticação
      const username = process.env.ELASTICSEARCH_USERNAME;
      const password = process.env.ELASTICSEARCH_PASSWORD;
      
      if (username && password) {
        clientConfig.auth = {
          username: username.trim(),
          password: password.trim(),
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
            number_of_replicas: 0,
            // Aumentar limite de campos para 2000
            'index.mapping.total_fields.limit': 2000
          }
        });

        logger.info(`Índice de auditoria criado no Elasticsearch: ${this.indexName}`);
      } else {
        // Atualizar configurações do índice existente para aumentar limite de campos
        try {
          await client.indices.putSettings({
            index: this.indexName,
            body: {
              settings: {
                'index.mapping.total_fields.limit': 2000
              }
            }
          });
          logger.debug(`Configurações do índice ${this.indexName} atualizadas (limite de campos: 2000)`);
        } catch (updateError) {
          // Ignorar erro se não for possível atualizar (índice pode estar fechado ou em uso)
          logger.debug(`Não foi possível atualizar configurações do índice (pode estar em uso): ${updateError instanceof Error ? updateError.message : 'Erro desconhecido'}`);
        }
      }
    } catch (error) {
      logger.error(`Erro ao criar índice de auditoria: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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

