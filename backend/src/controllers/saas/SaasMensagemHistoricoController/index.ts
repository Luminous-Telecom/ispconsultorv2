import { Response as ExpressResponse } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../../../config/database';
import { SaasMensagemHistorico } from '../../../models/saas/SaasMensagemHistorico';
import { SaasDadosEmpresa } from '../../../models/saas/SaasDadosEmpresa';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';

export class SaasMensagemHistoricoController {
  /**
   * Listar histórico de mensagens do SaaS com paginação e filtros
   */
  static async list(req: SaasAuthenticatedRequest, res: ExpressResponse): Promise<void> {
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
        empresa_id,
        data_inicio,
        data_fim,
        sortColumn = 'created_at',
        sortDirection = 'desc',
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const where: Record<string, unknown> = {};

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
        where.entidade_id = Number(entidade_id);
      }
      if (empresa_id) {
        where.empresa_id = Number(empresa_id);
      }
      if (data_inicio || data_fim) {
        const createdAt: { [key: symbol]: Date } = {};
        if (data_inicio) {
          createdAt[Op.gte] = new Date(data_inicio as string);
        }
        if (data_fim) {
          createdAt[Op.lte] = new Date(data_fim as string);
        }
        where.created_at = createdAt;
      }

      const order: [string, string][] = [];
      const validSortColumns = ['id', 'tipo', 'destinatario', 'titulo', 'status', 'created_at', 'updated_at', 'empresa_id', 'cliente_nome', 'mensagem'];
      const validSortDirections = ['asc', 'desc'];
      const sortDirectionStr = Array.isArray(sortDirection) ? sortDirection[0] : sortDirection;
      const sortDirectionValue = typeof sortDirectionStr === 'string' ? sortDirectionStr : 'desc';

      if (validSortColumns.includes(sortColumn as string) && validSortDirections.includes(sortDirectionValue)) {
        order.push([sortColumn as string, sortDirectionValue.toUpperCase()]);
      } else {
        order.push(['created_at', 'DESC']);
      }

      const { count, rows } = await SaasMensagemHistorico.findAndCountAll({
        where,
        include: [
          {
            model: SaasDadosEmpresa,
            as: 'empresa',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'nome_empresa'],
            required: false,
          },
        ],
        limit: Number(limit),
        offset,
        order,
        distinct: true,
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
          to,
        },
        filters: { tipo, status, destinatario, entidade_tipo, entidade_id, empresa_id, data_inicio, data_fim },
        sort: { column: sortColumn, direction: sortDirection },
      };

      sendSuccess(res, result, 'Histórico de mensagens listado com sucesso');
    } catch (error) {
      logger.error('Erro ao listar histórico de mensagens SaaS:', error);
      sendError(res, error, 'Erro ao listar histórico de mensagens', 500, true);
    }
  }

  /**
   * Buscar mensagem por ID
   */
  static async show(req: SaasAuthenticatedRequest, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;

      const mensagem = await SaasMensagemHistorico.findByPk(id, {
        include: [
          {
            model: SaasDadosEmpresa,
            as: 'empresa',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'nome_empresa', 'email', 'telefone'],
            required: false,
          },
        ],
      });

      if (!mensagem) {
        sendError(res, null, 'Mensagem não encontrada', 404);
        return;
      }

      sendSuccess(res, mensagem, 'Mensagem encontrada');
    } catch (error) {
      logger.error('Erro ao buscar mensagem SaaS:', error);
      sendError(res, error, 'Erro ao buscar mensagem', 500, true);
    }
  }

  /**
   * Buscar mensagens por entidade
   */
  static async getByEntity(req: SaasAuthenticatedRequest, res: ExpressResponse): Promise<void> {
    try {
      const { entidade_tipo, entidade_id } = req.params;
      const { page = 1, limit = 10, empresa_id } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const where: Record<string, unknown> = {
        entidade_tipo,
        entidade_id: Number(entidade_id),
      };
      if (empresa_id) {
        where.empresa_id = Number(empresa_id);
      }

      const { count, rows } = await SaasMensagemHistorico.findAndCountAll({
        where,
        include: [
          {
            model: SaasDadosEmpresa,
            as: 'empresa',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'nome_empresa'],
            required: false,
          },
        ],
        limit: Number(limit),
        offset,
        order: [['created_at', 'DESC']],
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
          to,
        },
      };

      sendSuccess(res, result, 'Mensagens da entidade listadas com sucesso');
    } catch (error) {
      logger.error('Erro ao buscar mensagens da entidade SaaS:', error);
      sendError(res, error, 'Erro ao buscar mensagens da entidade', 500, true);
    }
  }
}
