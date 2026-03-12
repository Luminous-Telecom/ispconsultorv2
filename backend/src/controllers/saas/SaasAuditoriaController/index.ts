import { Response } from 'express';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { getElasticsearchService } from '../../../services/elasticsearch/ElasticsearchService';
import { AuditoriaQueryService } from '../../../services/auditoria/AuditoriaQueryService';
import { sendSuccess, sendError, sendValidationError } from '../../../utils/responseUtils';

export class SaasAuditoriaController {
  /**
   * Listar logs de auditoria de um tenant específico (apenas para painel SaaS)
   */
  static async listByTenant(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const empresaId = req.query.empresa_id ? parseInt(req.query.empresa_id as string) : undefined;
      if (!empresaId || isNaN(empresaId)) {
        sendValidationError(res, 'empresa_id é obrigatório');
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

      await elasticsearchService.ensureIndex();

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const acao = req.query.acao as string;
      const entidade = req.query.entidade as string;
      const usuario_id = req.query.usuario_id ? parseInt(req.query.usuario_id as string) : undefined;
      const dataInicio = req.query.data_inicio as string;
      const dataFim = req.query.data_fim as string;
      const sortColumn = req.query.sortColumn as string;
      const sortDirection = req.query.sortDirection as string;

      const maxResultWindow = 50000;
      const maxLastPage = Math.max(1, Math.floor(maxResultWindow / limit));
      const effectivePage = Math.min(page, maxLastPage);

      const { logs, total } = await AuditoriaQueryService.searchFromElasticsearch({
        page: effectivePage,
        limit,
        search,
        acao,
        entidade,
        usuario_id,
        dataInicio,
        dataFim,
        sortColumn,
        sortDirection,
        empresaId,
        excludeSaasEntities: false
      });

      const lastPage = Math.min(Math.ceil(total / limit), maxLastPage);

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
}
