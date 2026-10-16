import { Response as ExpressResponse } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../../../config/database';
import { MensagemHistorico } from '../../../models/comunicacao/MensagemHistorico';
import { Usuario } from '../../../models/cadastros/Usuario';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
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

function buildWhereFromQuery(req: SaasAuthenticatedRequest): Record<string, unknown> {
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

  const where: Record<string, unknown> = {};

  if (tipo) {
    where.tipo = tipo;
  }
  if (status) {
    where.status = status;
  }

  const searchTerm = search?.trim();
  if (searchTerm) {
    if (searchField === 'id') {
      const num = parseInt(searchTerm, 10);
      if (!Number.isNaN(num) && String(num) === searchTerm) {
        where.id = num;
      } else {
        (where as Record<string | symbol, unknown>)[Op.and] = [
          sequelize.where(sequelize.cast(sequelize.col('id'), 'CHAR'), { [Op.like]: `%${searchTerm}%` }),
        ];
      }
    } else if (searchField === 'tipo') {
      where.tipo = searchTerm;
    } else if (searchField === 'status') {
      where.status = searchTerm;
    } else if (['cliente_nome', 'titulo', 'destinatario', 'mensagem'].includes(searchField)) {
      (where as Record<string, unknown>)[searchField] = { [Op.like]: `%${searchTerm}%` };
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
  if (empresa_id) {
    where.empresa_id = empresa_id;
  }
  if (data_inicio || data_fim) {
    const createdAt: { [key: symbol]: Date } = {};
    if (data_inicio) {
      createdAt[Op.gte] = new Date(data_inicio);
    }
    if (data_fim) {
      createdAt[Op.lte] = new Date(data_fim);
    }
    where.created_at = createdAt;
  }

  return where;
}

function buildOrder(sortColumn: string, sortDirection: string): [string, string][] {
  const col = sortColumn && VALID_SORT_COLUMNS.includes(sortColumn) ? sortColumn : 'created_at';
  return [[col, (sortDirection ?? 'desc') === 'asc' ? 'ASC' : 'DESC']];
}

function includeForOrigem(origem: HistoricoOrigem | 'merged') {
  if (origem === HISTORICO_ORIGEM_ERP) {
    return [
      {
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'nome', 'email'],
        required: false,
      },
    ];
  }

  return [
    {
      model: DadosEmpresa,
      as: 'empresa',
      attributes: ['id', 'razao_social', 'nome_fantasia'],
      required: false,
    },
  ];
}

function mapRowToPlain(row: MensagemHistorico, origem: HistoricoOrigem): Record<string, unknown> {
  const plain = row.get({ plain: true }) as unknown as Record<string, unknown>;
  plain.historico_origem = origem;
  return plain;
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

      if (incluirErp) {
        where.historico_origem = { [Op.in]: [HISTORICO_ORIGEM_SAAS, HISTORICO_ORIGEM_ERP] };
      } else {
        where.historico_origem = HISTORICO_ORIGEM_SAAS;
      }

      const { count, rows } = await MensagemHistorico.findAndCountAll({
        where,
        include: incluirErp
          ? [
              {
                model: DadosEmpresa,
                as: 'empresa',
                attributes: ['id', 'razao_social', 'nome_fantasia'],
                required: false,
              },
              {
                model: Usuario,
                as: 'usuario',
                attributes: ['id', 'nome', 'email'],
                required: false,
              },
            ]
          : includeForOrigem(HISTORICO_ORIGEM_SAAS),
        limit,
        offset,
        order: buildOrder(sortColumn, sortDirection),
        distinct: true,
      });

      const data = rows.map((row) => {
        const origem = (row.getDataValue('historico_origem') as HistoricoOrigem) ?? HISTORICO_ORIGEM_SAAS;
        return mapRowToPlain(row, origem);
      });

      sendSuccess(
        res,
        {
          data,
          pagination: buildListPagination(page, limit, count),
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

      const mensagem = await MensagemHistorico.findByPk(idNum, {
        include: [
          {
            model: DadosEmpresa,
            as: 'empresa',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'email', 'telefone'],
            required: false,
          },
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

      const origem = (mensagem.getDataValue('historico_origem') as HistoricoOrigem) ?? HISTORICO_ORIGEM_SAAS;
      sendSuccess(res, mapRowToPlain(mensagem, origem), 'Mensagem encontrada');
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

      const where: Record<string, unknown> = {
        historico_origem: HISTORICO_ORIGEM_SAAS,
        entidade_tipo,
        entidade_id: Number(entidade_id),
      };
      if (empresa_id) {
        where.empresa_id = Number(empresa_id);
      }

      const { count, rows } = await MensagemHistorico.findAndCountAll({
        where,
        include: includeForOrigem(HISTORICO_ORIGEM_SAAS),
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      sendSuccess(
        res,
        {
          data: rows.map((row) => mapRowToPlain(row, HISTORICO_ORIGEM_SAAS)),
          pagination: buildListPagination(page, limit, count),
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
