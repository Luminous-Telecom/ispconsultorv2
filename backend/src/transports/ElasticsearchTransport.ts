/**
 * Transport Winston que envia logs para Elasticsearch
 */
import Transport from 'winston-transport';
import { getElasticsearchService } from '../services/elasticsearch/ElasticsearchService';

export class ElasticsearchTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(info: Record<string, unknown>, callback: () => void): void {
    setImmediate(() => {
      this.indexLog(info).catch(() => {}).finally(callback);
    });
  }

  private async indexLog(info: Record<string, unknown>): Promise<void> {
    const elasticsearchService = getElasticsearchService();
    const client = elasticsearchService.getClient();
    if (!client) return;
    const isConnected = await elasticsearchService.checkConnection();
    if (!isConnected) return;

    try {
      await elasticsearchService.ensureIndex();

      const rest = Object.fromEntries(
        Object.entries(info).filter(
          ([k]) => !['level', 'message', 'timestamp', 'error', 'stack'].includes(k)
        )
      ) as Record<string, unknown>;
      const doc: Record<string, unknown> = {
        log_tipo: 'app',
        level: info.level,
        message: info.message,
        timestamp: info.timestamp || new Date().toISOString(),
        ...rest
      };
      if (info.error) doc.error = String(info.error);
      if (info.stack) doc.stack = String(info.stack);

      await client.index({
        index: elasticsearchService.getIndexName(),
        document: doc
      });
    } catch {
      // Silencioso - não interromper o fluxo de logs
    }
  }
}
