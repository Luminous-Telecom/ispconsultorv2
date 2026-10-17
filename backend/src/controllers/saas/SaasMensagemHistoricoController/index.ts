import { Response as ExpressResponse } from 'express';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError, sendValidationError } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { buildListPagination } from '../../../utils/pagination';
import { isQueryFlagTrue, parseListQuery, parseOptionalQueryInt, queryString } from '../../../utils/listQuery';
import {
  HISTORICO_ORIGEM_ERP,
  HISTORICO_ORIGEM_SAAS,
  type HistoricoOrigem,
} from '../../../services/comunicacao/mensagemHistoricoOrigens';
import { parseReenviarFalhasBody } from '../../../services/comunicacao/ReenviarNotificacoesCobrancaService/selecao';
import { ReenviarNotificacoesCobrancaService } from '../../../services/comunicacao/ReenviarNotificacoesCobrancaService';
import {
  buscarMensagemHistorico,
  listarMensagensHistorico,
  type FiltroMensagemHistorico,
} from '../../../services/sistema/mensagemHistoricoLog';

const VALID_SORT_COLUMNS = [
  'id',
  'empresa_id',
  'tipo',
  'destinatario',
  'titulo',
  'status',
  'created_at',
  'updated_at',
  'cliente_nome',
  'mensagem',
];

function buildWhereFromQuery(req: SaasAuthenticatedRequest): FiltroMensagemHistorico {
  const {
    data_inicio,
    data_fim,
    empresa_id,
  } = parseListQuery(req.query, { defaultLimit: 20 });
  const tipo = queryString(req.query.tipo);
  const status = queryString(req.query.status);
  const destinatario = queryString(req.query.destinatario);
  const entidade_tipo = queryString(req.query.entidade_tipo);
  const entidade_id = parseOptionalQueryInt(req.query.entidade_id);
  const search = queryString(req.query.search);
  const searchField = queryString(req.query.searchField) || 'destinatario';

  const where: FiltroMensagemHistorico = {};

  if (tipo === 'email' || tipo === 'whatsapp') where.canal = tipo;
  if (status === 'enviada' || status === 'erro') where.status = status;

  const searchTerm = search?.trim();
  if (searchTerm) {
    if (searchField === 'id') {
      const num = parseInt(searchTerm, 10);
      if (!Number.isNaN(num) && String(num) === searchTerm) where.id = num;
      else where.idInexistente = true;
    } else if (searchField === 'tipo' && (searchTerm === 'email' || searchTerm === 'whatsapp')) {
      where.canal = searchTerm;
    } else if (searchField === 'status' && (searchTerm === 'enviada' || searchTerm === 'erro')) {
      where.status = searchTerm;
    } else if (searchField === 'cliente_nome' || searchField === 'titulo' || searchField === 'destinatario' || searchField === 'mensagem') {
      where.textoCampo = searchField;
      where.texto = searchTerm;
    } else {
      where.textoCampo = 'destinatario';
      where.texto = searchTerm;
    }
  } else if (destinatario) {
    where.textoCampo = 'destinatario';
    where.texto = destinatario;
  }

  if (entidade_tipo) where.entidadeTipo = entidade_tipo;
  if (entidade_id) where.entidadeId = entidade_id;
  if (empresa_id) where.empresaId = Number(empresa_id);
  if (data_inicio) where.createdFrom = new Date(data_inicio);
  if (data_fim) where.createdTo = new Date(data_fim);

  return where;
}


function mapHistoricoRow(row: {
  sistema_tenants?: unknown;
  cadastros_usuarios?: unknown;
  historico_origem?: string | null;
  [key: string]: unknown;
}, origem: HistoricoOrigem): Record<string, unknown> {
  const { sistema_tenants, cadastros_usuarios, ...rest } = row;
  return {
    ...rest,
    empresa: sistema_tenants ?? null,
    usuario: cadastros_usuarios ?? null,
    historico_origem: origem,
  };
}

export class SaasMensagemHistoricoController {
  /**
   * Lista histórico SaaS. Com `incluir_erp=true`: inclui registros ERP na mesma tabela.
   */
  static async list(req: SaasAuthenticatedRequest, res: ExpressResponse): Promise<void> {
    try {
      const {
        page,
        limit,
        sortColumn = 'created_at',
        sortDirection = 'desc',
        data_inicio,
        data_fim,
        empresa_id,
      } = parseListQuery(req.query, { defaultLimit: 20 });
      const incluirErp = isQueryFlagTrue(req.query, 'incluir_erp', 'incluirErp');
      const tipo = queryString(req.query.tipo);
      const status = queryString(req.query.status);
      const destinatario = queryString(req.query.destinatario);
      const entidade_tipo = queryString(req.query.entidade_tipo);
      const entidade_id = parseOptionalQueryInt(req.query.entidade_id);

      const offset = (page - 1) * limit;
      const where = buildWhereFromQuery(req);

      where.origens = incluirErp
        ? [HISTORICO_ORIGEM_SAAS, HISTORICO_ORIGEM_ERP]
        : [HISTORICO_ORIGEM_SAAS];

      const col = sortColumn && VALID_SORT_COLUMNS.includes(sortColumn) ? sortColumn : 'created_at';
      const { total, rows } = await listarMensagensHistorico(where, {
        take: limit,
        skip: offset,
        sortColumn: col,
        sortDirection: (sortDirection ?? 'desc') === 'asc' ? 'asc' : 'desc',
      });

      const data = rows.map((row) => {
        const origem = (row.historico_origem as HistoricoOrigem) ?? HISTORICO_ORIGEM_SAAS;
        return mapHistoricoRow(row as never, origem);
      });

      sendSuccess(
        res,
        {
          data,
          pagination: buildListPagination(page, limit, total),
          filters: { tipo, status, destinatario, entidade_tipo, entidade_id, empresa_id, data_inicio, data_fim },
          sort: { column: sortColumn, direction: sortDirection },
        },
        'Histórico de mensagens listado com sucesso'
      );
    } catch (error) {
      logger.error('Erro ao listar histórico de mensagens SaaS:', error);
      sendError(res, error, 'Erro ao listar histórico de mensagens', 500, true);
    }
  }

  static async show(req: SaasAuthenticatedRequest, res: ExpressResponse): Promise<void> {
    try {
      const idNum = Number(req.params.id);
      if (!Number.isFinite(idNum)) {
        sendError(res, null, 'Mensagem não encontrada', 404);
        return;
      }

      const mensagem = Number.isInteger(idNum) ? await buscarMensagemHistorico(idNum) : null;

      if (!mensagem) {
        sendError(res, null, 'Mensagem não encontrada', 404);
        return;
      }

      const origem = (mensagem.historico_origem as HistoricoOrigem) ?? HISTORICO_ORIGEM_SAAS;
      sendSuccess(res, mapHistoricoRow(mensagem as never, origem), 'Mensagem encontrada');
    } catch (error) {
      logger.error('Erro ao buscar mensagem SaaS:', error);
      sendError(res, error, 'Erro ao buscar mensagem', 500, true);
    }
  }

  static async getByEntity(req: SaasAuthenticatedRequest, res: ExpressResponse): Promise<void> {
    try {
      const { entidade_tipo, entidade_id } = req.params;
      const { page, limit, empresa_id } = parseListQuery(req.query, { defaultLimit: 10 });
      const offset = (page - 1) * limit;

      const { total, rows } = await listarMensagensHistorico({
        origens: [HISTORICO_ORIGEM_SAAS],
        entidadeTipo: entidade_tipo,
        entidadeId: Number(entidade_id),
        ...(empresa_id ? { empresaId: Number(empresa_id) } : {}),
      }, { take: limit, skip: offset, sortColumn: 'created_at', sortDirection: 'desc' });

      sendSuccess(
        res,
        {
          data: rows.map((row) => mapHistoricoRow(row as never, HISTORICO_ORIGEM_SAAS)),
          pagination: buildListPagination(page, limit, total),
        },
        'Mensagens da entidade listadas com sucesso'
      );
    } catch (error) {
      logger.error('Erro ao buscar mensagens da entidade SaaS:', error);
      sendError(res, error, 'Erro ao buscar mensagens da entidade', 500, true);
    }
  }

  static async reenviarFalhas(req: SaasAuthenticatedRequest, res: ExpressResponse): Promise<void> {
    try {
      const parsed = parseReenviarFalhasBody(req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed.message);
        return;
      }

      const origens = parsed.incluirErp
        ? [HISTORICO_ORIGEM_SAAS, HISTORICO_ORIGEM_ERP]
        : [HISTORICO_ORIGEM_SAAS];

      const resultado = await ReenviarNotificacoesCobrancaService.reenviar({
        tipo: parsed.tipo,
        ids: parsed.ids,
        empresaId: null,
        origens,
      });

      sendSuccess(res, resultado, 'Reenvio de cobranças processado.');
    } catch (error) {
      sendError(res, error, 'Erro ao reenviar notificações de cobrança', 500, true);
    }
  }
}
