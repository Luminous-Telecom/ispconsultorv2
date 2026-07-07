import { Request, Response } from 'express';
import { getEmpresaIdOrNull, parseEmpresaIdQuery } from '../../../utils/tenantUtils';
import {
  AuditoriaOperacionalMysqlService,
} from '../../../services/auditoria/AuditoriaOperacionalMysqlService';
import { enrichLogsWithClienteNome, enrichLogsWithEmpresaNome, enrichLogsWithUsuarioErp } from '../../../services/auditoria/auditoriaEnrichService';
import { ENTIDADES_SAAS } from '../../../services/auditoria/auditoriaConstants';
import { AuditoriaPDFService } from '../../../services/auditoria/AuditoriaPDFService';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendForbidden } from '../../../utils/responseUtils';
import { parseListQuery, queryString } from '../../../utils/listQuery';
import { buildPagination } from '../../../utils/pagination';
import { parseAuditoriaListFilters } from '../../../utils/auditoriaQuery';

export class AuditoriaController {
  static async listOperacional(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, sortColumn, sortDirection } = parseListQuery(req.query);
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
      } = parseAuditoriaListFilters(req.query);
      const authEmpresaId = getEmpresaIdOrNull(req);
      const queryEmpresaId = parseEmpresaIdQuery(req.query.empresa_id);
      if (queryEmpresaId != null && authEmpresaId != null) {
        sendForbidden(res, 'Acesso negado: não é permitido filtrar por outra empresa');
        return;
      }
      const empresaId = queryEmpresaId ?? authEmpresaId;

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
        excludeSaasEntities: authEmpresaId != null,
        filterSaasOnly: false,
        comUsuarioObrigatorio,
        semUsuarioObrigatorio,
        origemAuditoria,
      });

      await enrichLogsWithEmpresaNome(logs, false, empresaId == null);
      await enrichLogsWithClienteNome(logs);

      sendSuccess(res, {
        data: logs,
        pagination: buildPagination(page, limit, total, { minLastPageWhenEmpty: 1, minLastPage: 1 }),
      });
    } catch (error) {
      sendError(res, error, 'Erro ao buscar logs operacionais', 500, true, {
        context: 'AuditoriaController',
        action: 'listOperacional',
      });
    }
  }

  static async generatePdf(req: Request, res: Response): Promise<void> {
    const entidade = queryString(req.query.entidade);
    const entidade_id = queryString(req.query.entidade_id);

    try {
      if (!entidade || !entidade_id) {
        sendValidationError(res, 'Parâmetros entidade e entidade_id são obrigatórios');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      if (empresaId != null && (ENTIDADES_SAAS as readonly string[]).includes(entidade)) {
        sendForbidden(res, 'Acesso negado a auditoria de entidades SaaS');
        return;
      }

      const logs = await AuditoriaOperacionalMysqlService.findByEntity({
        entidade,
        entidadeId: entidade_id,
        empresaId,
        excludeSaasEntities: empresaId != null,
        sortDirection: 'asc',
        limit: 50000,
      });

      if (logs.length === 0) {
        logger.warn('Nenhum log encontrado', {
          context: 'AuditoriaController',
          action: 'generatePdf',
          entidade,
          entidade_id,
        });
        sendNotFound(res, 'Nenhum log de auditoria encontrado para este registro');
        return;
      }

      await enrichLogsWithEmpresaNome(logs, false);
      await enrichLogsWithUsuarioErp(logs);

      const html = await AuditoriaPDFService.generateAuditPdfHtml(logs, entidade, undefined, empresaId);
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
        context: 'AuditoriaController',
        action: 'generatePdf',
        entidade: entidade as string,
        entidade_id: entidade_id as string,
      });
    }
  }
}

export default AuditoriaController;
