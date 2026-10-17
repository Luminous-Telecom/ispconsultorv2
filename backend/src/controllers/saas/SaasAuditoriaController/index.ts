import { Response } from 'express';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { AuditoriaOperacionalMysqlService } from '../../../services/auditoria/AuditoriaOperacionalMysqlService';
import { enrichLogsWithClienteNome, enrichLogsWithEmpresaNome, enrichLogsWithSaasSuperUsuario, resolveSaasEmpresaRelatorioPdf } from '../../../services/auditoria/auditoriaEnrichService';
import { AuditoriaPDFService } from '../../../services/auditoria/AuditoriaPDFService';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../../../utils/responseUtils';
import { parseListQuery, queryString } from '../../../utils/listQuery';
import { buildPagination } from '../../../utils/pagination';
import { parseEmpresaIdQuery } from '../../../utils/tenantUtils';
import { parseAuditoriaListFilters } from '../../../utils/auditoriaQuery';

export class SaasAuditoriaController {
  static async listOperacional(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const empresaId = parseEmpresaIdQuery(req.query.empresa_id) ?? undefined;

      const { page, limit, search, searchField, sortColumn, sortDirection } = parseListQuery(req.query, {
        defaultLimit: 20,
      });
      const {
        acao,
        entidade,
        usuario_id,
        dataInicio,
        dataFim,
        comUsuarioObrigatorio,
        semUsuarioObrigatorio,
        origemAuditoria,
        moduloBlockdomi,
        painelSaasLogs,
        acessoPainelSaas,
      } = parseAuditoriaListFilters(req.query, true);

      const painelAggregate = empresaId == null || empresaId <= 0;
      const excludeSaasEntities = !painelSaasLogs;

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
        excludeSaasEntities,
        filterSaasOnly: false,
        filterPainelLogsSaasOnly: Boolean(painelSaasLogs && painelAggregate),
        filterAcessoUsuarioSuperSaas: Boolean(acessoPainelSaas && painelSaasLogs && painelAggregate),
        comUsuarioObrigatorio,
        semUsuarioObrigatorio,
        origemAuditoria,
      });

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
          const supers: Array<{ id: number; nome: string; email: string }> = [];
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
      await enrichLogsWithEmpresaNome(rawLogs, true, true);
      await enrichLogsWithSaasSuperUsuario(rawLogs);
      await enrichLogsWithClienteNome(rawLogs);

      sendSuccess(res, {
        data: logs,
        pagination: buildPagination(page, limit, total, { minLastPageWhenEmpty: 1, minLastPage: 1 }),
      });
    } catch (error) {
      sendError(res, error, 'Erro ao buscar logs operacionais', 500, true, {
        context: 'SaasAuditoriaController',
        action: 'listOperacional',
      });
    }
  }

  static async generatePdf(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    const entidade = queryString(req.query.entidade);
    const entidade_id = queryString(req.query.entidade_id);

    try {
      if (!entidade || !entidade_id) {
        sendValidationError(res, 'Parâmetros entidade e entidade_id são obrigatórios');
        return;
      }

      const logs = await AuditoriaOperacionalMysqlService.findByEntity({
        entidade,
        entidadeId: entidade_id,
        filterSaasOnly: false,
        sortDirection: 'asc',
        limit: 500,
      });

      if (logs.length === 0) {
        logger.warn('Nenhum log encontrado para PDF SaaS', {
          context: 'SaasAuditoriaController',
          entidade,
          entidade_id,
        });
        sendNotFound(res, 'Nenhum log de auditoria encontrado para este registro');
        return;
      }

      await enrichLogsWithEmpresaNome(logs, true);
      await enrichLogsWithSaasSuperUsuario(logs);

      const dadosEmpresaPdf = await resolveSaasEmpresaRelatorioPdf();
      const html = await AuditoriaPDFService.generateAuditPdfHtml(
        logs,
        entidade,
        dadosEmpresaPdf ?? undefined,
        undefined,
        true
      );
      const { PDFGenerationService } = await import('../../../services/pdf-generation/PDFGenerationService');
      const pdfBuffer = await PDFGenerationService.generateFromHtml(html, {
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        printBackground: true,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="auditoria-${entidade}-${entidade_id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      sendError(res, error, 'Erro ao gerar PDF de auditoria', 500, true, {
        context: 'SaasAuditoriaController',
        action: 'generatePdf',
      });
    }
  }
}
