import { Response } from 'express';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { getElasticsearchService } from '../../../services/elasticsearch/ElasticsearchService';
import { ES_DATA_STREAM } from '../../../services/elasticsearch/dataStreams';
import { AuditoriaQueryService } from '../../../services/auditoria/AuditoriaQueryService';
import { AuditoriaPDFService } from '../../../services/auditoria/AuditoriaPDFService';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../../../utils/responseUtils';

export class SaasAuditoriaController {
  /**
   * Listar logs de auditoria de um tenant específico (apenas para painel SaaS)
   */
  static async listByTenant(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const queryEmpresaId = req.query.empresa_id as string | undefined;
      const empresaId = queryEmpresaId && !isNaN(parseInt(queryEmpresaId, 10))
        ? parseInt(queryEmpresaId, 10)
        : undefined;

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
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const searchField = req.query.searchField as string;
      const acao = req.query.acao as string;
      const entidade = req.query.entidade as string;
      const usuario_id = req.query.usuario_id ? parseInt(req.query.usuario_id as string) : undefined;
      const dataInicio = req.query.data_inicio as string;
      const dataFim = req.query.data_fim as string;
      const sortColumn = req.query.sortColumn as string;
      const sortDirection = req.query.sortDirection as string;

      const maxResultWindow = 10000;
      const maxLastPage = Math.max(1, Math.floor(maxResultWindow / limit));
      const effectivePage = Math.min(page, maxLastPage);

      const { logs, total } = await AuditoriaQueryService.searchFromElasticsearch({
        page: effectivePage,
        limit,
        search,
        searchField,
        acao,
        entidade,
        usuario_id,
        dataInicio,
        dataFim,
        sortColumn,
        sortDirection,
        empresaId,
        excludeSaasEntities: false,
        filterSaasOnly: false
      });

      const lastPage = Math.min(Math.ceil(total / limit), maxLastPage);

      await AuditoriaQueryService.enrichLogsWithEmpresaNome(logs as Record<string, unknown>[], true, true);

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
        context: 'SaasAuditoriaController',
        action: 'listByTenant',
        elasticsearchError: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Gerar PDF de auditoria para entidade SaaS (usa saas_auth_token)
   */
  static async generatePdf(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    const { entidade, entidade_id } = req.query;

    try {
      if (!entidade || !entidade_id) {
        sendValidationError(res, 'Parâmetros entidade e entidade_id são obrigatórios');
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

      const must: Record<string, unknown>[] = [
        { term: { entidade: entidade as string } },
        { term: { entidade_id: parseInt(entidade_id as string) } }
      ];

      const result = await client.search({
        index: ES_DATA_STREAM.AUDITORIA,
        body: {
          query: { bool: { must } },
          sort: [{ timestamp: { order: 'desc' } }],
          size: 200
        }
      });

      const logs = [...result.hits.hits].reverse().map((hit: { _source?: unknown }) => hit._source);

      if (logs.length === 0) {
        logger.warn('Nenhum log encontrado para PDF SaaS', {
          context: 'SaasAuditoriaController',
          entidade: entidade as string,
          entidade_id: entidade_id as string
        });
        sendNotFound(res, 'Nenhum log de auditoria encontrado para este registro');
        return;
      }

      await AuditoriaQueryService.enrichLogsWithEmpresaNome(logs as Record<string, unknown>[], true);

      const html = await AuditoriaPDFService.generateAuditPdfHtml(logs, entidade as string, undefined, undefined, true);
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
        context: 'SaasAuditoriaController',
        action: 'generatePdf'
      });
    }
  }
}
