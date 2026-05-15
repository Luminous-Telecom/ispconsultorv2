import { Response as ExpressResponse } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../../../config/database';
import { MensagemHistorico } from '../../../models/comunicacao/MensagemHistorico';
import { Usuario } from '../../../models/cadastros/Usuario';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import type { AuthenticatedRequest } from '../../../types/auth';
import { getEmpresaIdOrNull, resolveListEmpresaId } from '../../../utils/tenantUtils';

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
        page = 1,
        limit = 20,
        tipo,
        status,
        destinatario,
        search,
        searchField,
        entidade_tipo,
        entidade_id,
        usuario_id,
        data_inicio,
        data_fim,
        sortColumn = 'created_at',
        sortDirection = 'desc'
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const listEmpresaId = resolveListEmpresaId(req);
      if (listEmpresaId === false) {
        sendSuccess(res, { data: [], pagination: { page: Number(page), limit: Number(limit), total: 0, totalPages: 0 } });
        return;
      }

      const where: Record<string, unknown> = listEmpresaId != null ? { empresa_id: listEmpresaId } : {};

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

      // Construir ordenação
      const order: any[] = [];
      const validSortColumns = ['id', 'tipo', 'destinatario', 'titulo', 'status', 'created_at', 'updated_at', 'cliente_nome', 'mensagem'];
      const validSortDirections = ['asc', 'desc'];

      const sortDirectionStr = Array.isArray(sortDirection) ? sortDirection[0] : sortDirection;
      const sortDirectionValue = typeof sortDirectionStr === 'string' ? sortDirectionStr : 'desc';

      if (validSortColumns.includes(sortColumn as string) && validSortDirections.includes(sortDirectionValue)) {
        order.push([sortColumn, sortDirectionValue.toUpperCase()]);
      } else {
        order.push(['created_at', 'DESC']);
      }

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
        limit: Number(limit),
        offset,
        order,
        distinct: true
      });

      const totalPages = Math.ceil(count / Number(limit));
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const from = count > 0 ? offset + 1 : 0;
      const to = count > 0 ? Math.min(offset + limitNum, count) : 0;

      const result = {
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
          current_page: pageNum,
          per_page: limitNum,
          last_page: totalPages,
          from,
          to
        },
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

      if (!mensagem) {
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
      const { page = 1, limit = 10 } = req.query;
      const empresaId = req.user && typeof req.user === 'object' && req.user?.empresa_id ? Number(req.user.empresa_id) : undefined;

      const offset = (Number(page) - 1) * Number(limit);

      const where: Record<string, unknown> = { entidade_tipo, entidade_id: Number(entidade_id) };
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
        limit: Number(limit),
        offset,
        order: [['created_at', 'DESC']]
      });

      const totalPages = Math.ceil(count / Number(limit));
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const from = count > 0 ? offset + 1 : 0;
      const to = count > 0 ? Math.min(offset + limitNum, count) : 0;

      const result = {
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
          current_page: pageNum,
          per_page: limitNum,
          last_page: totalPages,
          from,
          to
        }
      };

      sendSuccess(res, result, 'Mensagens da entidade listadas com sucesso');
    } catch (error) {
      logger.error('Erro ao buscar mensagens da entidade:', error);
      sendError(res, error, 'Erro ao buscar mensagens da entidade', 500, true);
    }
  }
}