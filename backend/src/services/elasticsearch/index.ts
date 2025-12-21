/**
 * Exportações do módulo de Elasticsearch
 */
export { getElasticsearchService } from './ElasticsearchService';
export {
  registrarAuditoriaElasticsearch,
  registrarCriacaoElasticsearch,
  registrarAtualizacaoElasticsearch,
  registrarExclusaoElasticsearch,
  registrarLoginElasticsearch,
  registrarLogoutElasticsearch,
  type AcaoAuditoria
} from './ElasticsearchAuditService';

