import { Response as ExpressResponse } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../../../config/database';
import { SaasMensagemHistorico } from '../../../models/saas/SaasMensagemHistorico';
import { MensagemHistorico } from '../../../models/comunicacao/MensagemHistorico';
import { Usuario } from '../../../models/cadastros/Usuario';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';

/** Evita colisão de `id` na UI ao mesclar duas tabelas com auto increment independente (resposta JSON apenas). */
const ERP_HISTORICO_ID_BIAS = 5_000_000_000;

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

      const sortDirectionStr = Array.isArray(sortDirection) ? sortDirection[0] : sortDirection;
      const sortDirectionValue = typeof sortDirectionStr === 'string' ? sortDirectionStr : 'desc';
      const sortAsc = String(sortDirectionValue).toLowerCase() === 'asc';

      const [miniSaas, miniErp] = await Promise.all([
        SaasMensagemHistorico.findAll({
          where,
          attributes: ['id', 'created_at'],
          raw: true,
        }),
        MensagemHistorico.findAll({
          where,
          attributes: ['id', 'created_at'],
          raw: true,
        }),
      ]);

      type Mini = { id: number; created_at: Date | string; src: 'saas' | 'erp' };
      const mergedMini: Mini[] = [
        ...miniSaas.map((r) => ({ ...r, src: 'saas' as const })),
        ...miniErp.map((r) => ({ ...r, src: 'erp' as const })),
      ].sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return sortAsc ? ta - tb : tb - ta;
      });

      const total = mergedMini.length;
      const pageSlice = mergedMini.slice(offset, offset + Number(limit));

      const saasIds = pageSlice.filter((x) => x.src === 'saas').map((x) => x.id);
      const erpIds = pageSlice.filter((x) => x.src === 'erp').map((x) => x.id);

      const [fullSaas, fullErp] = await Promise.all([
        saasIds.length
          ? SaasMensagemHistorico.findAll({
              where: { id: saasIds },
              include: [
                {
                  model: DadosEmpresa,
                  as: 'empresa',
                  attributes: ['id', 'razao_social', 'nome_fantasia'],
                  required: false,
                },
              ],
            })
          : [],
        erpIds.length
          ? MensagemHistorico.findAll({
              where: { id: erpIds },
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['id', 'nome', 'email'],
                  required: false,
                },
              ],
            })
          : [],
      ]);

      const mapS = new Map(fullSaas.map((r) => [r.id, r]));
      const mapE = new Map(fullErp.map((r) => [r.id, r]));

      const erpEmpresaIds = [
        ...new Set(
          pageSlice
            .filter((s) => s.src === 'erp')
            .map((s) => mapE.get(s.id)?.getDataValue('empresa_id') as number | null | undefined)
            .filter((x): x is number => x != null && Number(x) > 0)
        ),
      ];
      const nomeEmpresaErp = new Map<number, string>();
      if (erpEmpresaIds.length > 0) {
        const empresas = await DadosEmpresa.findAll({
          where: { id: erpEmpresaIds },
          attributes: ['id', 'razao_social', 'nome_fantasia'],
        });
        for (const e of empresas) {
          const nome =
            e.nome_fantasia && String(e.nome_fantasia).trim() !== ''
              ? String(e.nome_fantasia).trim()
              : e.razao_social;
          nomeEmpresaErp.set(e.id, nome);
        }
      }

      const rowsPlain = pageSlice
        .map(({ id, src }) => {
          const row = src === 'saas' ? mapS.get(id) : mapE.get(id);
          if (!row) return null;
          const plain = row.get({ plain: true }) as unknown as Record<string, unknown>;
          if (src === 'erp') {
            const eid = plain.empresa_id as number | null | undefined;
            if (eid != null && nomeEmpresaErp.has(Number(eid))) {
              plain.empresa_nome = nomeEmpresaErp.get(Number(eid)) ?? null;
            }
            plain.historico_origem = 'erp';
            plain.historico_id_real = plain.id;
            plain.id = Number(plain.id) + ERP_HISTORICO_ID_BIAS;
          } else {
            plain.historico_origem = 'saas';
          }
          return plain;
        })
        .filter(Boolean) as Record<string, unknown>[];

      const limitNum = Number(limit);
      const totalPages = Math.ceil(total / limitNum);
      const pageNum = Number(page);
      const from = total > 0 ? offset + 1 : 0;
      const to = total > 0 ? Math.min(offset + limitNum, total) : 0;

      const result = {
        data: rowsPlain,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
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
      const idNum = Number(req.params.id);
      const fromErpList = Number.isFinite(idNum) && idNum >= ERP_HISTORICO_ID_BIAS;
      const pk = fromErpList ? idNum - ERP_HISTORICO_ID_BIAS : idNum;

      if (fromErpList) {
        const mensagem = await MensagemHistorico.findByPk(pk, {
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['id', 'nome', 'email'],
              required: false,
            },
          ],
        });
        if (!mensagem) {
          sendError(res, null, 'Mensagem não encontrada', 404);
          return;
        }
        const plain = mensagem.get({ plain: true }) as unknown as Record<string, unknown>;
        plain.historico_origem = 'erp';
        plain.historico_id_real = plain.id;
        plain.id = idNum;
        const eid = plain.empresa_id as number | null | undefined;
        if (eid != null && Number(eid) > 0) {
          const emp = await DadosEmpresa.findByPk(eid, {
            attributes: ['id', 'razao_social', 'nome_fantasia'],
          });
          if (emp) {
            plain.empresa_nome =
              emp.nome_fantasia && String(emp.nome_fantasia).trim() !== ''
                ? String(emp.nome_fantasia).trim()
                : emp.razao_social;
          }
        }
        sendSuccess(res, plain, 'Mensagem encontrada');
        return;
      }

      const mensagem = await SaasMensagemHistorico.findByPk(pk, {
        include: [
          {
            model: DadosEmpresa,
            as: 'empresa',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'email', 'telefone'],
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
            model: DadosEmpresa,
            as: 'empresa',
            attributes: ['id', 'razao_social', 'nome_fantasia'],
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
