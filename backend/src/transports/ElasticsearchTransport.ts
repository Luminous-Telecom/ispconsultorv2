/**
 * Transport Winston que envia logs para Elasticsearch
 */
import Transport from 'winston-transport';
import { getElasticsearchService } from '../services/elasticsearch/ElasticsearchService';
import { ES_DATA_STREAM } from '../services/elasticsearch/dataStreams';
import { elasticsearchEventTimestamps } from '../services/elasticsearch/elasticsearchTimestamps';

function buildSafeMeta(info: Record<string, unknown>): Record<string, unknown> | null {
  const block = new Set(['level', 'message', 'timestamp', 'error', 'stack', 'splat']);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(info)) {
    if (block.has(k)) continue;
    if (v === null || v === undefined) continue;
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      out[k] = v;
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else {
      try {
        out[k] = JSON.parse(JSON.stringify(v)) as unknown;
      } catch {
        out[k] = String(v).slice(0, 4000);
      }
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

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
      const meta = buildSafeMeta(info);
      const ts = elasticsearchEventTimestamps(
        typeof info.timestamp === 'string' || info.timestamp instanceof Date
          ? new Date(info.timestamp as string | number | Date)
          : new Date()
      );
      const doc: Record<string, unknown> = {
        log_tipo: 'app',
        level: info.level,
        message: info.message,
        ...ts,
        ...(meta ? { meta } : {})
      };
      if (info.error) doc.error = String(info.error);
      if (info.stack) doc.stack = String(info.stack);

      await client.index({
        index: ES_DATA_STREAM.APP,
        document: doc
      });
    } catch {
      // Silencioso - não interromper o fluxo de logs
    }
  }
}
