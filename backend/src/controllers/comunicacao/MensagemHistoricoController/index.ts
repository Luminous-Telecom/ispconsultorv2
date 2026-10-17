import { Response as ExpressResponse } from 'express';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError, sendValidationError, sendForbidden } from '../../../utils/responseUtils';
import type { AuthenticatedRequest } from '../../../types/auth';
import { getEmpresaIdOrNull, resolveListEmpresaId } from '../../../utils/tenantUtils';
import { buildListPagination } from '../../../utils/pagination';
import { HISTORICO_ORIGEM_ERP } from '../../../services/comunicacao/mensagemHistoricoOrigens';
import { parseReenviarFalhasBody } from '../../../services/comunicacao/ReenviarNotificacoesCobrancaService/selecao';
import { ReenviarNotificacoesCobrancaService } from '../../../services/comunicacao/ReenviarNotificacoesCobrancaService';
import { parseListQuery, parseOptionalQueryInt, queryString } from '../../../utils/listQuery';
import {
  buscarMensagemHistorico,
  listarMensagensHistorico,
  type FiltroMensagemHistorico,
} from '../../../services/sistema/mensagemHistoricoLog';

export class MensagemHistoricoController {
  /**
   * Listar histórico de mensagens com paginação e filtros
   */
  static async list(req: AuthenticatedRequest, res: ExpressResponse): Promise<void> {
    try {
      const {
        page,
        limit,
        search,
        searchField,
        sortColumn = 'created_at',
        sortDirection = 'desc',
        data_inicio,
        data_fim,
      } = parseListQuery(req.query, { defaultLimit: 20 });
      const tipo = queryString(req.query.tipo);
      const status = queryString(req.query.status);
      const destinatario = queryString(req.query.destinatario);
      const entidade_tipo = queryString(req.query.entidade_tipo);
      const entidade_id = parseOptionalQueryInt(req.query.entidade_id);
      const usuario_id = parseOptionalQueryInt(req.query.usuario_id);

      const offset = (page - 1) * limit;
      const listEmpresaId = resolveListEmpresaId(req);
      if (listEmpresaId === false) {
        sendSuccess(res, {
          data: [],
          pagination: buildListPagination(page, limit, 0),
        });
        return;
      }

      const filtro: FiltroMensagemHistorico = {
        origens: [HISTORICO_ORIGEM_ERP],
        ...(listEmpresaId != null ? { empresaId: listEmpresaId } : {}),
        ...(tipo === 'email' || tipo === 'whatsapp' ? { canal: tipo } : {}),
        ...(status === 'enviada' || status === 'erro' ? { status } : {}),
        ...(entidade_tipo ? { entidadeTipo: entidade_tipo } : {}),
        ...(entidade_id ? { entidadeId: entidade_id } : {}),
        ...(usuario_id ? { usuarioId: usuario_id } : {}),
        ...(data_inicio ? { createdFrom: new Date(data_inicio as string) } : {}),
        ...(data_fim ? { createdTo: new Date(data_fim as string) } : {}),
      };

      const searchTerm = (search as string)?.trim();
      const field = (searchField as string)?.trim() || 'destinatario';
      if (searchTerm) {
        if (field === 'id') {
          const num = parseInt(searchTerm, 10);
          if (!Number.isNaN(num) && String(num) === searchTerm) filtro.id = num;
          else filtro.idInexistente = true;
        } else if (field === 'tipo' && (searchTerm === 'email' || searchTerm === 'whatsapp')) {
          filtro.canal = searchTerm;
        } else if (field === 'status' && (searchTerm === 'enviada' || searchTerm === 'erro')) {
          filtro.status = searchTerm;
        } else if (field === 'cliente_nome' || field === 'titulo' || field === 'destinatario' || field === 'mensagem') {
          filtro.textoCampo = field;
          filtro.texto = searchTerm;
        } else {
          filtro.textoCampo = 'destinatario';
          filtro.texto = searchTerm;
        }
      } else if (destinatario) {
        filtro.textoCampo = 'destinatario';
        filtro.texto = destinatario;
      }

      const validSortColumns = ['id', 'tipo', 'destinatario', 'titulo', 'status', 'created_at', 'updated_at', 'cliente_nome', 'mensagem'];
      const col = sortColumn && validSortColumns.includes(sortColumn) ? sortColumn : 'created_at';
      const direction = (sortDirection ?? 'desc') === 'asc' ? 'asc' : 'desc';

      const { total, rows } = await listarMensagensHistorico(filtro, {
        take: limit,
        skip: offset,
        sortColumn: col,
        sortDirection: direction,
      });

      const result = {
        data: rows.map(({ cadastros_usuarios, sistema_tenants: _empresa, ...rest }) => ({
          ...rest,
          usuario: cadastros_usuarios,
        })),
        pagination: buildListPagination(page, limit, total),
        filters: {
          tipo,
          status,
          destinatario,
          entidade_tipo,
          entidade_id,
          usuario_id,
          data_inicio,
          data_fim
        },
        sort: {
          column: sortColumn,
          direction: sortDirection
        }
      };

      sendSuccess(res, result, 'Histórico de mensagens listado com sucesso');
    } catch (error) {
      logger.error('Erro ao listar histórico de mensagens:', error);
      sendError(res, error, 'Erro ao listar histórico de mensagens', 500, true);
    }
  }

  /**
   * Buscar mensagem por ID
   */
  static async show(req: AuthenticatedRequest, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);

      const numericId = Number(id);
      const mensagem = Number.isInteger(numericId) ? await buscarMensagemHistorico(numericId) : null;

      if (!mensagem || mensagem.historico_origem !== HISTORICO_ORIGEM_ERP) {
        sendError(res, null, 'Mensagem não encontrada', 404);
        return;
      }

      if (empresaId != null) {
        const msgEmpresaId = mensagem.empresa_id;
        if (msgEmpresaId != null && msgEmpresaId !== empresaId) {
          sendError(res, null, 'Mensagem não encontrada', 404);
          return;
        }
      }

      const { cadastros_usuarios, sistema_tenants: _empresa, ...rest } = mensagem;
      sendSuccess(res, { ...rest, usuario: cadastros_usuarios }, 'Mensagem encontrada');
    } catch (error) {
      logger.error('Erro ao buscar mensagem:', error);
      sendError(res, error, 'Erro ao buscar mensagem', 500, true);
    }
  }

  /**
   * Buscar mensagens por entidade
   */
  static async getByEntity(req: AuthenticatedRequest, res: ExpressResponse): Promise<void> {
    try {
      const { entidade_tipo, entidade_id } = req.params;
      const { page, limit } = parseListQuery(req.query, { defaultLimit: 10 });
      const empresaId = req.user && typeof req.user === 'object' && req.user?.empresa_id ? Number(req.user.empresa_id) : undefined;

      const offset = (page - 1) * limit;

      const { total, rows } = await listarMensagensHistorico({
        origens: [HISTORICO_ORIGEM_ERP],
        entidadeTipo: entidade_tipo,
        entidadeId: Number(entidade_id),
        ...(empresaId != null ? { empresaId, empresaOuNulo: true } : {}),
      }, { take: limit, skip: offset, sortColumn: 'created_at', sortDirection: 'desc' });

      const result = {
        data: rows.map(({ cadastros_usuarios, sistema_tenants: _empresa, ...rest }) => ({
          ...rest,
          usuario: cadastros_usuarios,
        })),
        pagination: buildListPagination(page, limit, total),
      };

      sendSuccess(res, result, 'Mensagens da entidade listadas com sucesso');
    } catch (error) {
      logger.error('Erro ao buscar mensagens da entidade:', error);
      sendError(res, error, 'Erro ao buscar mensagens da entidade', 500, true);
    }
  }

  /**
   * Reenvia notificações de cobrança (título em aberto) que falharam.
   * empresa_id vem do token — admin sem filtro vê todos os tenants.
   */
  static async reenviarFalhas(req: AuthenticatedRequest, res: ExpressResponse): Promise<void> {
    try {
      const parsed = parseReenviarFalhasBody(req.body);
      if (!parsed.ok) {
        sendValidationError(res, parsed.message);
        return;
      }

      const empresaId = resolveListEmpresaId(req);
      if (empresaId === false) {
        sendForbidden(res, 'Sem acesso a este histórico');
        return;
      }

      const resultado = await ReenviarNotificacoesCobrancaService.reenviar({
        tipo: parsed.tipo,
        ids: parsed.ids,
        empresaId,
        origens: [HISTORICO_ORIGEM_ERP],
      });

      sendSuccess(res, resultado, 'Reenvio de cobranças processado.');
    } catch (error) {
      sendError(res, error, 'Erro ao reenviar notificações de cobrança', 500, true);
    }
  }
}