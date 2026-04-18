/**
 * Exportações do módulo de Elasticsearch
 */
export { getElasticsearchService } from './ElasticsearchService';
export {
  ES_DATA_STREAM,
  ES_DATA_STREAMS_PATTERN,
  ES_ALL_DATA_STREAMS,
  resolveDataStreamFromSource
} from './dataStreams';
export {
  registrarAuditoriaElasticsearch,
  registrarCriacaoElasticsearch,
  registrarAtualizacaoElasticsearch,
  registrarExclusaoElasticsearch,
  registrarLoginElasticsearch,
  registrarLogoutElasticsearch,
  type AcaoAuditoria
} from './ElasticsearchAuditService';

