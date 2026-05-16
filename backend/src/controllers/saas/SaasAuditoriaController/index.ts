import { Response } from 'express';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { getElasticsearchService } from '../../../services/elasticsearch/ElasticsearchService';
import { ES_DATA_STREAM } from '../../../services/elasticsearch/dataStreams';
import { AuditoriaQueryService } from '../../../services/auditoria/AuditoriaQueryService';
import { AuditoriaOperacionalMysqlService } from '../../../services/auditoria/AuditoriaOperacionalMysqlService';
import { AuditoriaPDFService } from '../../../services/auditoria/AuditoriaPDFService';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../../../utils/responseUtils';
import { SaasUsuarioSuper } from '../../../models/saas/SaasUsuarioSuper';

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
      const comUsuarioObrigatorio =
        req.query.com_usuario_obrigatorio === 'true' || req.query.comUsuarioObrigatorio === 'true';
      const semUsuarioObrigatorio =
        req.query.sem_usuario_obrigatorio === 'true' || req.query.semUsuarioObrigatorio === 'true';
      const origemAuditoria = req.query.origem_auditoria as string | undefined;
      const moduloBlockdomi =
        req.query.modulo_blockdomi === 'true' || req.query.moduloBlockdomi === 'true';

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
        excludeSaasEntities: false,
        filterSaasOnly: false,
        comUsuarioObrigatorio,
        semUsuarioObrigatorio,
        origemAuditoria
      });

      const lastPage = Math.min(Math.ceil(total / limit), maxLastPage);

      const rawLogs = logs as Record<string, unknown>[];
      await AuditoriaQueryService.enrichLogsWithEmpresaNome(rawLogs, true, true);
      await AuditoriaQueryService.enrichLogsWithClienteNome(rawLogs);

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
   * Lista logs operacionais (MySQL) para modais SaaS — detalhe completo via Elasticsearch getById.
   */
  static async listOperacional(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const queryEmpresaId = req.query.empresa_id as string | undefined;
      const empresaId = queryEmpresaId && !isNaN(parseInt(queryEmpresaId, 10))
        ? parseInt(queryEmpresaId, 10)
        : undefined;

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
      const comUsuarioObrigatorio =
        req.query.com_usuario_obrigatorio === 'true' || req.query.comUsuarioObrigatorio === 'true';
      const semUsuarioObrigatorio =
        req.query.sem_usuario_obrigatorio === 'true' || req.query.semUsuarioObrigatorio === 'true';
      const origemAuditoria = req.query.origem_auditoria as string | undefined;
      const moduloBlockdomi =
        req.query.modulo_blockdomi === 'true' || req.query.moduloBlockdomi === 'true';
      const painelSaasLogs =
        req.query.painel_saas === 'true' ||
        req.query.painelSaas === 'true';
      const acessoPainelSaas =
        req.query.acesso_painel_saas === 'true' ||
        req.query.acessoPainelSaas === 'true';

      const painelAggregate = empresaId == null || empresaId <= 0;

      const { logs, total } = await AuditoriaOperacionalMysqlService.list({
        page,
        limit,
        search,
        searchField,
        acao,
        entidade,
        moduloBlockdomi: moduloBlockdomi || undefined,
        usuario_id,
        dataInicio,
        dataFim,
        sortColumn,
        sortDirection,
        empresaId: empresaId ?? null,
        excludeSaasEntities: false,
        filterSaasOnly: false,
        filterPainelLogsSaasOnly: Boolean(painelSaasLogs && painelAggregate),
        filterAcessoUsuarioSuperSaas: Boolean(
          acessoPainelSaas && painelSaasLogs && painelAggregate
        ),
        comUsuarioObrigatorio,
        semUsuarioObrigatorio,
        origemAuditoria,
      });

      const lastPage = Math.max(1, Math.ceil(total / limit));
      const rawLogs = logs as Record<string, unknown>[];
      if (acessoPainelSaas && painelSaasLogs && painelAggregate && rawLogs.length > 0) {
        const uids = [
          ...new Set(
            rawLogs
              .map((l) => l.usuario_id)
              .filter((x): x is number => typeof x === 'number' && x > 0)
          ),
        ];
        if (uids.length > 0) {
          const supers = await SaasUsuarioSuper.findAll({
            where: { id: uids },
            attributes: ['id', 'nome', 'email'],
          });
          const map = new Map(supers.map((u) => [u.id, { nome: u.nome, email: u.email }]));
          for (const log of rawLogs) {
            const uid = log.usuario_id;
            if (typeof uid !== 'number') continue;
            const s = map.get(uid);
            if (s) {
              log.usuario_nome = s.nome;
              log.usuario_email = s.email;
            }
          }
        }
      }
      await AuditoriaQueryService.enrichLogsWithEmpresaNome(rawLogs, true, true);
      await AuditoriaQueryService.enrichLogsWithClienteNome(rawLogs);

      sendSuccess(res, {
        data: logs,
        pagination: {
          current_page: page,
          last_page: lastPage,
          per_page: limit,
          total,
          from: total > 0 ? (page - 1) * limit + 1 : 0,
          to: Math.min(page * limit, total),
        },
      });
    } catch (error) {
      sendError(res, error, 'Erro ao buscar logs operacionais', 500, true, {
        context: 'SaasAuditoriaController',
        action: 'listOperacional',
      });
    }
  }

  /**
   * Detalhe de um documento de auditoria no Elasticsearch (mesmo índice do ERP; autenticação SaaS).
   */
  static async getById(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
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
        id,
      });

      sendSuccess(res, {
        id: result._id,
        ...(result._source as Record<string, unknown>),
      });
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 404) {
        sendNotFound(res, 'Log de auditoria não encontrado');
        return;
      }

      sendError(res, error, 'Erro ao buscar log de auditoria', 500, true, {
        context: 'SaasAuditoriaController',
        action: 'getById',
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
