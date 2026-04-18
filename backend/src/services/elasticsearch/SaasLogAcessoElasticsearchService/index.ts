/**
 * Serviço de logs de acesso ao painel SaaS no Elasticsearch
 * @module services/elasticsearch/SaasLogAcessoElasticsearchService
 */
import { getElasticsearchService } from '../ElasticsearchService';
import { ES_DATA_STREAM } from '../dataStreams';
import { elasticsearchEventTimestamps } from '../elasticsearchTimestamps';
import { logger } from '../../../utils/logger';

const LOG_TIPO = 'saas_acesso';

export interface RegistroSaasLogAcessoPayload {
  usuario_id: number;
  empresa_id?: number | null;
  acao: string;
  ip?: string | null;
  user_agent?: string | null;
}

export async function registrarLogAcessoSaasElasticsearch(payload: RegistroSaasLogAcessoPayload): Promise<void> {
  setImmediate(async () => {
    try {
      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();
      if (!client) return;
      const isConnected = await elasticsearchService.checkConnection();
      if (!isConnected) return;

      const doc = {
        log_tipo: LOG_TIPO,
        saas: true,
        usuario_id: payload.usuario_id,
        empresa_id: payload.empresa_id ?? null,
        acao: payload.acao,
        ip: payload.ip ?? null,
        user_agent: payload.user_agent ?? null,
        ...elasticsearchEventTimestamps(new Date())
      };

      await client.index({
        index: ES_DATA_STREAM.SAAS_ACESSO,
        document: doc
      });
    } catch (error) {
      logger.warn('Falha ao registrar log de acesso SaaS no Elasticsearch', {
        context: 'SaasLogAcessoElasticsearchService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
}
