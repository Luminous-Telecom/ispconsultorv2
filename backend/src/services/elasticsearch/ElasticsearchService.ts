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

      // Detectar HTTPS automaticamente na URL ou usar variável de ambiente
      const isHttps = node.toLowerCase().startsWith('https://');
      const useSsl = process.env.ELASTICSEARCH_SSL === 'true' || isHttps;

      // Configuração de SSL/TLS (se necessário ou se URL for HTTPS)
      if (useSsl) {
        // Por padrão, aceitar certificados auto-assinados quando usar HTTPS
        // Só rejeita se explicitamente configurado como 'true'
        const rejectUnauthorized = process.env.ELASTICSEARCH_SSL_REJECT_UNAUTHORIZED === 'true';
        
        clientConfig.ssl = {
          rejectUnauthorized: rejectUnauthorized,
        };
        
        // Log da configuração SSL (sem senha)
        logger.debug('Configuração SSL do Elasticsearch', {
          context: 'ElasticsearchService',
          action: 'getClient',
          isHttps,
          useSsl,
          rejectUnauthorized,
        });
      }
      
      // Configurar timeout de requisição
      clientConfig.requestTimeout = 10000; // 10 segundos
      clientConfig.pingTimeout = 10000; // 10 segundos

      this.client = new Client(clientConfig);
      
      // Log de configuração (sem senha por segurança)
      const hasAuth = !!(process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD);
      
      logger.info('Cliente Elasticsearch inicializado', {
        context: 'ElasticsearchService',
        action: 'getClient',
        node,
        hasAuth,
        hasSsl: useSsl,
        username: process.env.ELASTICSEARCH_USERNAME || 'não configurado'
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
      // Ping com timeout de 10 segundos (aumentado para dar mais tempo com SSL)
      const response = await Promise.race([
        client.ping(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao conectar com Elasticsearch após 10 segundos')), 10000)
        )
      ]) as boolean;
      
      this.isConnected = response;
      
      if (this.isConnected) {
        logger.info('Conexão com Elasticsearch verificada com sucesso', {
          context: 'ElasticsearchService',
          action: 'checkConnection',
          node: process.env.ELASTICSEARCH_NODE
        });
      }
      
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      // Extrair informações adicionais do erro
      let errorDetails: any = {
        message: errorMessage,
      };
      
      // Se for erro do Elasticsearch, extrair mais detalhes
      if (error && typeof error === 'object' && 'meta' in error) {
        const meta = (error as any).meta;
        if (meta) {
          errorDetails.meta = {
            statusCode: meta.statusCode,
            body: meta.body,
            headers: meta.headers,
          };
          
          // Verificar se é erro de autenticação
          if (meta.statusCode === 401) {
            errorDetails.authenticationError = true;
            errorDetails.message = 'Erro de autenticação: Credenciais inválidas ou não configuradas';
            errorDetails.hasUsername = !!process.env.ELASTICSEARCH_USERNAME;
            errorDetails.hasPassword = !!process.env.ELASTICSEARCH_PASSWORD;
          }
        }
      }
      
      // Se for erro de conexão, incluir informações de rede
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('ETIMEDOUT')) {
        errorDetails.connectionError = true;
        errorDetails.node = process.env.ELASTICSEARCH_NODE;
      }
      
      // Verificar erros relacionados a SSL/TLS
      if (errorMessage.includes('certificate') || errorMessage.includes('SSL') || errorMessage.includes('TLS') || 
          errorMessage.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') || errorMessage.includes('self signed') ||
          errorMessage.includes('CERT') || errorMessage.includes('EPROTO')) {
        errorDetails.sslError = true;
        errorDetails.suggestion = 'Verifique se ELASTICSEARCH_SSL_REJECT_UNAUTHORIZED está configurado como false para certificados auto-assinados';
      }
      
      // Verificar se é erro relacionado a autenticação na mensagem
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('authentication')) {
        errorDetails.authenticationError = true;
        errorDetails.hasUsername = !!process.env.ELASTICSEARCH_USERNAME;
        errorDetails.hasPassword = !!process.env.ELASTICSEARCH_PASSWORD;
      }
      
      // Incluir informações de configuração para debug
      const node = process.env.ELASTICSEARCH_NODE || 'não configurado';
      const isHttps = node.toLowerCase().startsWith('https://');
      const useSsl = process.env.ELASTICSEARCH_SSL === 'true' || isHttps;
      
      // Criar mensagem detalhada para o log
      const errorType = errorDetails.sslError ? 'SSL/TLS' : 
                       errorDetails.authenticationError ? 'Autenticação' :
                       errorDetails.connectionError ? 'Conexão' : 'Desconhecido';
      
      const detailsMessage = [
        `Tipo: ${errorType}`,
        `Node: ${node}`,
        `HTTPS: ${isHttps}`,
        `SSL habilitado: ${useSsl}`,
        `SSL rejectUnauthorized: ${process.env.ELASTICSEARCH_SSL_REJECT_UNAUTHORIZED || 'não configurado'}`,
        `Username: ${process.env.ELASTICSEARCH_USERNAME || 'não configurado'}`,
        `Has Password: ${!!process.env.ELASTICSEARCH_PASSWORD}`,
        `Erro: ${errorMessage}`,
        errorDetails.suggestion ? `Sugestão: ${errorDetails.suggestion}` : '',
        errorDetails.meta?.statusCode ? `HTTP Status: ${errorDetails.meta.statusCode}` : ''
      ].filter(Boolean).join(' | ');
      
      // Log mais detalhado
      logger.warn(`Falha ao verificar conexão com Elasticsearch - ${detailsMessage}`, {
        context: 'ElasticsearchService',
        action: 'checkConnection',
        node,
        isHttps,
        useSsl,
        sslRejectUnauthorized: process.env.ELASTICSEARCH_SSL_REJECT_UNAUTHORIZED,
        hasUsername: !!process.env.ELASTICSEARCH_USERNAME,
        hasPassword: !!process.env.ELASTICSEARCH_PASSWORD,
        username: process.env.ELASTICSEARCH_USERNAME || 'não configurado',
        error: errorDetails,
        errorMessage: errorMessage,
        errorName: error instanceof Error ? error.name : 'Unknown',
        stack: errorStack?.substring(0, 1000) // Primeiros 1000 chars do stack para mais detalhes
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

