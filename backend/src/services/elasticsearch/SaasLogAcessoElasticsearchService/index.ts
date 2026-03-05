/**
 * Serviço de logs de acesso ao painel SaaS no Elasticsearch
 * @module services/elasticsearch/SaasLogAcessoElasticsearchService
 */
import { getElasticsearchService } from '../ElasticsearchService';
import { logger } from '../../../utils/logger';
import { safeFormatDateISOLocal } from '../../../utils/timezoneUtils';

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
      await elasticsearchService.ensureIndex();

      const doc = {
        log_tipo: LOG_TIPO,
        usuario_id: payload.usuario_id,
        empresa_id: payload.empresa_id ?? null,
        acao: payload.acao,
        ip: payload.ip ?? null,
        user_agent: payload.user_agent ?? null,
        timestamp: safeFormatDateISOLocal(new Date()) || new Date().toISOString()
      };

      await client.index({
        index: elasticsearchService.getIndexName(),
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
