import { Response as ExpressResponse } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../../../config/database';
import { MensagemHistorico } from '../../../models/comunicacao/MensagemHistorico';
import { Usuario } from '../../../models/cadastros/Usuario';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import type { AuthenticatedRequest } from '../../../types/auth';
import { getEmpresaIdOrNull, resolveListEmpresaId } from '../../../utils/tenantUtils';
import { buildListPagination } from '../../../utils/pagination';
import { HISTORICO_ORIGEM_ERP } from '../../../services/comunicacao/mensagemHistoricoOrigens';
import { parseListQuery, parseOptionalQueryInt, queryString } from '../../../utils/listQuery';

interface MensagemHistoricoFilters {
  tipo?: 'email' | 'whatsapp';
  status?: 'enviada' | 'erro';
  destinatario?: string;
  entidade_tipo?: string;
  entidade_id?: number;
  usuario_id?: number;
  data_inicio?: Date;
  data_fim?: Date;
}

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

      const where: Record<string, unknown> = {
        historico_origem: HISTORICO_ORIGEM_ERP,
        ...(listEmpresaId != null ? { empresa_id: listEmpresaId } : {}),
      };

      if (tipo) {
        where.tipo = tipo;
      }

      if (status) {
        where.status = status;
      }

      const searchTerm = (search as string)?.trim();
      const field = (searchField as string)?.trim() || 'destinatario';
      if (searchTerm) {
        if (field === 'id') {
          const num = parseInt(searchTerm, 10);
          if (!Number.isNaN(num) && String(num) === searchTerm) {
            where.id = num;
          } else {
            (where as Record<string | symbol, unknown>)[Op.and] = [
              sequelize.where(sequelize.cast(sequelize.col('id'), 'CHAR'), { [Op.like]: `%${searchTerm}%` })
            ];
          }
        } else if (field === 'tipo') {
          where.tipo = searchTerm;
        } else if (field === 'status') {
          where.status = searchTerm;
        } else if (['cliente_nome', 'titulo', 'destinatario', 'mensagem'].includes(field)) {
          (where as Record<string, unknown>)[field] = { [Op.like]: `%${searchTerm}%` };
        } else {
          where.destinatario = { [Op.like]: `%${searchTerm}%` };
        }
      } else if (destinatario) {
        where.destinatario = { [Op.like]: `%${destinatario}%` };
      }

      if (entidade_tipo) {
        where.entidade_tipo = entidade_tipo;
      }

      if (entidade_id) {
        where.entidade_id = entidade_id;
      }

      if (usuario_id) {
        where.usuario_id = usuario_id;
      }

      if (data_inicio || data_fim) {
        where.created_at = {
          ...(data_inicio && { [Op.gte]: new Date(data_inicio as string) }),
          ...(data_fim && { [Op.lte]: new Date(data_fim as string) })
        };
      }

      const validSortColumns = ['id', 'tipo', 'destinatario', 'titulo', 'status', 'created_at', 'updated_at', 'cliente_nome', 'mensagem'];
      const col = sortColumn && validSortColumns.includes(sortColumn) ? sortColumn : 'created_at';
      const order: [string, string][] = [[col, (sortDirection ?? 'desc') === 'asc' ? 'ASC' : 'DESC']];

      // Buscar mensagens
      const { count, rows } = await MensagemHistorico.findAndCountAll({
        where,
        include: [
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nome', 'email'],
            required: false
          }
        ],
        limit,
        offset,
        order,
        distinct: true
      });

      const result = {
        data: rows,
        pagination: buildListPagination(page, limit, count),
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

      const mensagem = await MensagemHistorico.findByPk(id, {
        include: [
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nome', 'email'],
            required: false
          }
        ]
      });

      if (!mensagem || mensagem.getDataValue('historico_origem') !== HISTORICO_ORIGEM_ERP) {
        sendError(res, null, 'Mensagem não encontrada', 404);
        return;
      }

      if (empresaId != null) {
        const msgEmpresaId = (mensagem as { empresa_id?: number | null }).empresa_id;
        if (msgEmpresaId != null && msgEmpresaId !== empresaId) {
          sendError(res, null, 'Mensagem não encontrada', 404);
          return;
        }
      }

      sendSuccess(res, mensagem, 'Mensagem encontrada');
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

      const where: Record<string, unknown> = {
        historico_origem: HISTORICO_ORIGEM_ERP,
        entidade_tipo,
        entidade_id: Number(entidade_id),
      };
      if (empresaId != null) {
        (where as Record<string, unknown>)[Op.or as unknown as string] = [{ empresa_id: empresaId }, { empresa_id: null }];
      }

      const { count, rows } = await MensagemHistorico.findAndCountAll({
        where,
        include: [
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nome', 'email'],
            required: false
          }
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      const result = {
        data: rows,
        pagination: buildListPagination(page, limit, count),
      };

      sendSuccess(res, result, 'Mensagens da entidade listadas com sucesso');
    } catch (error) {
      logger.error('Erro ao buscar mensagens da entidade:', error);
      sendError(res, error, 'Erro ao buscar mensagens da entidade', 500, true);
    }
  }
}