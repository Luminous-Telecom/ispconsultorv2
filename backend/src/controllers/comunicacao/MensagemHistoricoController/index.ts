import { Request, Response as ExpressResponse } from 'express';
import { Op } from 'sequelize';
import { MensagemHistorico } from '../../../models/comunicacao/MensagemHistorico';
import { Usuario } from '../../../models/cadastros/Usuario';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import type { AuthenticatedRequest } from '../../../types/auth';

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
        entidade_tipo,
        entidade_id,
        usuario_id,
        data_inicio,
        data_fim,
        sortColumn = 'created_at',
        sortDirection = 'desc'
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const where: any = {};

      if (tipo) {
        where.tipo = tipo;
      }

      if (status) {
        where.status = status;
      }

      if (destinatario) {
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
        where.created_at = {};
        if (data_inicio) {
          where.created_at[Op.gte] = new Date(data_inicio as string);
        }
        if (data_fim) {
          where.created_at[Op.lte] = new Date(data_fim as string);
        }
      }

      // Construir ordenação
      const order: any[] = [];
      const validSortColumns = ['id', 'tipo', 'destinatario', 'titulo', 'status', 'created_at', 'updated_at'];
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

      const result = {
        data: rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
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

      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows } = await MensagemHistorico.findAndCountAll({
        where: {
          entidade_tipo,
          entidade_id: Number(entidade_id)
        },
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

      const result = {
        data: rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      };

      sendSuccess(res, result, 'Mensagens da entidade listadas com sucesso');
    } catch (error) {
      logger.error('Erro ao buscar mensagens da entidade:', error);
      sendError(res, error, 'Erro ao buscar mensagens da entidade', 500, true);
    }
  }
}