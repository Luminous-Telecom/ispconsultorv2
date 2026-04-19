import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../types/auth';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { getElasticsearchService } from '../../../services/elasticsearch/ElasticsearchService';
import { ES_DATA_STREAM } from '../../../services/elasticsearch/dataStreams';
import { AuditoriaQueryService } from '../../../services/auditoria/AuditoriaQueryService';
import { AuditoriaPDFService } from '../../../services/auditoria/AuditoriaPDFService';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendForbidden } from '../../../utils/responseUtils';

export class AuditoriaController {
  /**
   * Listar logs de auditoria
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        sendError(res, new Error('Elasticsearch não está configurado'), 'Elasticsearch não está configurado', 503, false);
        return;
      }

      const isConnected = await elasticsearchService.checkConnection();
      if (!isConnected) {
        sendError(res, new Error('Elasticsearch não está disponível'), 'Elasticsearch não está disponível', 503, false);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const searchField = req.query.searchField as string;
      const acao = req.query.acao as string;
      const entidade = req.query.entidade as string;
      const usuario_id = req.query.usuario_id ? parseInt(req.query.usuario_id as string) : undefined;
      const dataInicio = req.query.data_inicio as string;
      const dataFim = req.query.data_fim as string;
      const sortColumn = req.query.sortColumn as string;
      const sortDirection = req.query.sortDirection as string;
      const comUsuarioObrigatorio = req.query.com_usuario_obrigatorio === 'true' || req.query.comUsuarioObrigatorio === 'true';
      const semUsuarioObrigatorio = req.query.sem_usuario_obrigatorio === 'true' || req.query.semUsuarioObrigatorio === 'true';
      const origemAuditoria = req.query.origem_auditoria as string | undefined;
      const moduloBlockdomi =
        req.query.modulo_blockdomi === 'true' || req.query.moduloBlockdomi === 'true';
      const authEmpresaId = getEmpresaIdOrNull(req);
      const queryEmpresaId = req.query.empresa_id ? parseInt(req.query.empresa_id as string) : undefined;
      // Usuários só podem ver auditoria da própria empresa
      if (queryEmpresaId != null && authEmpresaId != null) {
        sendForbidden(res, 'Acesso negado: não é permitido filtrar por outra empresa');
        return;
      }
      const empresaId = queryEmpresaId ?? authEmpresaId;

      const maxResultWindow = 10000;
      const maxLastPage = Math.max(1, Math.floor(maxResultWindow / limit));
      const effectivePage = Math.min(page, maxLastPage);

      const { logs, total } = await AuditoriaQueryService.searchFromElasticsearch({
        page: effectivePage,
        limit,
        search,
        searchField,
        acao,
        entidade: moduloBlockdomi ? undefined : entidade,
        moduloBlockdomi: moduloBlockdomi || undefined,
        usuario_id,
        dataInicio,
        dataFim,
        sortColumn,
        sortDirection,
        empresaId,
        excludeSaasEntities: authEmpresaId != null,
        comUsuarioObrigatorio,
        semUsuarioObrigatorio,
        origemAuditoria
      });

      const lastPage = Math.min(Math.ceil(total / limit), maxLastPage);

      await AuditoriaQueryService.enrichLogsWithEmpresaNome(logs, false, empresaId == null);

      sendSuccess(res, {
        data: logs,
        pagination: {
          current_page: effectivePage,
          last_page: lastPage,
          per_page: limit,
          total,
          from: total > 0 ? (effectivePage - 1) * limit + 1 : 0,
          to: Math.min(effectivePage * limit, total)
        }
      });
    } catch (error) {
      sendError(res, error, 'Erro ao buscar logs de auditoria', 500, true, {
        context: 'AuditoriaController',
        action: 'list',
        elasticsearchError: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Buscar log específico por ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        sendError(res, new Error('Elasticsearch não está configurado'), 'Elasticsearch não está configurado', 503, false);
        return;
      }

      const result = await client.get({
        index: ES_DATA_STREAM.AUDITORIA,
        id
      });

      sendSuccess(res, {
        id: result._id,
        ...(result._source as Record<string, unknown>)
      });
    } catch (error: any) {
      if (error.statusCode === 404) {
        sendNotFound(res, 'Log de auditoria não encontrado');
        return;
      }

      sendError(res, error, 'Erro ao buscar log de auditoria', 500, true, {
        context: 'AuditoriaController',
        action: 'getById'
      });
    }
  }

  /**
   * Obter estatísticas de auditoria
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        sendError(res, new Error('Elasticsearch não está configurado'), 'Elasticsearch não está configurado', 503, false);
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const query: Record<string, unknown> = empresaId != null && empresaId > 0
        ? { bool: { must: [{ term: { empresa_id: empresaId } }], must_not: [{ terms: { entidade: AuditoriaQueryService.ENTIDADES_SAAS } }] } }
        : { match_all: {} };

      // Agregações para estatísticas
      const result = await client.search({
        index: ES_DATA_STREAM.AUDITORIA,
        body: {
          query,
          size: 0,
          aggs: {
            acoes: {
              terms: { field: 'acao', size: 10 }
            },
            entidades: {
              terms: { field: 'entidade', size: 10 }
            },
            usuarios: {
              terms: { field: 'usuario_id', size: 10 }
            }
          }
        }
      });

      const total = typeof result.hits.total === 'number' 
        ? result.hits.total 
        : (result.hits.total as any)?.value || 0;

      // Fazer cast das agregações para o tipo correto
      const acoesAgg = result.aggregations?.acoes as any;
      const entidadesAgg = result.aggregations?.entidades as any;
      const usuariosAgg = result.aggregations?.usuarios as any;

      sendSuccess(res, {
        total,
        acoes: acoesAgg?.buckets || [],
        entidades: entidadesAgg?.buckets || [],
        usuarios: usuariosAgg?.buckets || []
      });
    } catch (error) {
      sendError(res, error, 'Erro ao buscar estatísticas de auditoria', 500, true, {
        context: 'AuditoriaController',
        action: 'getStats'
      });
    }
  }

  /**
   * Buscar logs de auditoria por entidade e entidade_id
   */
  static async getByEntity(req: Request, res: Response): Promise<void> {
    try {
      const { entidade, entidade_id } = req.query;
      
      if (!entidade || !entidade_id) {
        sendValidationError(res, 'Parâmetros entidade e entidade_id são obrigatórios');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      if (empresaId != null && AuditoriaQueryService.ENTIDADES_SAAS.includes(entidade as string)) {
        sendForbidden(res, 'Acesso negado a auditoria de entidades SaaS');
        return;
      }

      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        sendError(res, new Error('Elasticsearch não está configurado'), 'Elasticsearch não está configurado', 503, false);
        return;
      }

      const isConnected = await elasticsearchService.checkConnection();
      if (!isConnected) {
        sendError(res, new Error('Elasticsearch não está disponível'), 'Elasticsearch não está disponível', 503, false);
        return;
      }

      const entidadeIdStr = String(entidade_id).trim();
      const isUuid = /^[a-f0-9-]{36}$/i.test(entidadeIdStr);

      const mustBase: Record<string, unknown>[] = [
        { term: { entidade: entidade as string } },
        ...(isUuid
          ? [{ term: { entidade_id: 0 } }, { term: { related_entity_ids: entidadeIdStr } }]
          : [{ term: { entidade_id: parseInt(entidade_id as string) } }])
      ];
      if (empresaId != null && empresaId > 0) {
        mustBase.push({ term: { empresa_id: empresaId } });
      }

      const boolQuery = { bool: { must: mustBase } };
      let hits = await AuditoriaQueryService.fetchAuditSourcesWithPit({
        client,
        boolQuery,
        sortDirection: 'asc',
        pageSize: 500,
        maxDocuments: 10000
      });

      if (hits.length === 0 && isUuid) {
        const mustFallback: Record<string, unknown>[] = [
          { term: { entidade: entidade as string } },
          { term: { entidade_id: 0 } }
        ];
        if (empresaId != null && empresaId > 0) {
          mustFallback.push({
            bool: {
              should: [
                { term: { empresa_id: empresaId } },
                { bool: { must_not: { exists: { field: 'empresa_id' } } } }
              ],
              minimum_should_match: 1
            }
          });
        }
        const result = await client.search({
          index: ES_DATA_STREAM.AUDITORIA,
          body: {
            query: { bool: { must: mustFallback } },
            sort: [{ timestamp: { order: 'asc' } }],
            size: 1000
          }
        });
        const allHits = result.hits.hits.map((hit: any) => ({ id: hit._id, ...hit._source }));
        const matchEntityId = (d: any) => d && (d.entity_id_str === entidadeIdStr || String(d.entity_id_str) === entidadeIdStr);
        const matchEmpresa = (log: any) => empresaId == null || log?.empresa_id === empresaId || log?.empresa_id == null;
        hits = allHits.filter((log: any) => (matchEntityId(log?.dados_novos) || matchEntityId(log?.dados_anteriores)) && matchEmpresa(log));
      }

      sendSuccess(res, hits);
    } catch (error) {
      sendError(res, error, error instanceof Error ? error.message : 'Erro ao buscar logs de auditoria', 500, true, {
        context: 'AuditoriaController',
        action: 'getByEntity'
      });
    }
  }

  /**
   * Gerar PDF de auditoria para uma entidade específica
   */
  static async generatePdf(req: Request, res: Response): Promise<void> {
    const { entidade, entidade_id } = req.query as { entidade?: string; entidade_id?: string };
    
    try {
      if (!entidade || !entidade_id) {
        sendValidationError(res, 'Parâmetros entidade e entidade_id são obrigatórios');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      if (empresaId != null && AuditoriaQueryService.ENTIDADES_SAAS.includes(entidade as string)) {
        sendForbidden(res, 'Acesso negado a auditoria de entidades SaaS');
        return;
      }

      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        sendError(res, new Error('Elasticsearch não está configurado'), 'Elasticsearch não está configurado', 503, false);
        return;
      }

      const isConnected = await elasticsearchService.checkConnection();
      if (!isConnected) {
        sendError(res, new Error('Elasticsearch não está disponível'), 'Elasticsearch não está disponível', 503, false);
        return;
      }

      const entidadeIdStr = String(entidade_id).trim();
      const isUuid = /^[a-f0-9-]{36}$/i.test(entidadeIdStr);

      const mustBase: Record<string, unknown>[] = [
        { term: { entidade: entidade as string } },
        ...(isUuid
          ? [{ term: { entidade_id: 0 } }, { term: { related_entity_ids: entidadeIdStr } }]
          : [{ term: { entidade_id: parseInt(entidade_id as string) } }])
      ];
      if (empresaId != null && empresaId > 0) {
        mustBase.push({ term: { empresa_id: empresaId } });
      }

      const boolQuery = { bool: { must: mustBase } };
      let hits = await AuditoriaQueryService.fetchAuditSourcesWithPit({
        client,
        boolQuery,
        sortDirection: 'desc',
        pageSize: 500,
        maxDocuments: 50000
      });

      let logs = [...hits].reverse();

      if (logs.length === 0 && isUuid) {
        const mustFallback: Record<string, unknown>[] = [
          { term: { entidade: entidade as string } }
        ];
        const result = await client.search({
          index: ES_DATA_STREAM.AUDITORIA,
          body: {
            query: { bool: { must: mustFallback } },
            sort: [{ timestamp: { order: 'desc' } }],
            size: 500
          }
        });
        const allLogs = [...result.hits.hits].reverse().map((hit: any) => ({ id: hit._id, ...hit._source }));

        const matchEntityId = (d: any) => d && (d.entity_id_str === entidadeIdStr || String(d.entity_id_str) === entidadeIdStr);
        const matchEmpresa = (log: any) => empresaId == null || log?.empresa_id === empresaId || log?.empresa_id == null;
        logs = allLogs.filter((log: any) => (matchEntityId(log?.dados_novos) || matchEntityId(log?.dados_anteriores)) && matchEmpresa(log));
      }

      if (logs.length === 0) {
        logger.warn('Nenhum log encontrado', {
          context: 'AuditoriaController',
          action: 'generatePdf',
          entidade: entidade as string,
          entidade_id: entidade_id as string
        });
        sendNotFound(res, 'Nenhum log de auditoria encontrado para este registro');
        return;
      }

      await AuditoriaQueryService.enrichLogsWithEmpresaNome(logs, false);

      const html = await AuditoriaPDFService.generateAuditPdfHtml(logs, entidade as string, undefined, empresaId);
      const { PDFGenerationService } = await import('../../../services/pdf-generation/PDFGenerationService');
      const pdfBuffer = await PDFGenerationService.generateFromHtml(
        html,
        {
          format: 'A4',
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true
        }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="auditoria-${entidade}-${entidade_id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      sendError(res, error, 'Erro ao gerar PDF de auditoria', 500, true, {
        context: 'AuditoriaController',
        action: 'generatePdf',
        entidade: entidade as string,
        entidade_id: entidade_id as string
      });
    }
  }
}

export default AuditoriaController;

