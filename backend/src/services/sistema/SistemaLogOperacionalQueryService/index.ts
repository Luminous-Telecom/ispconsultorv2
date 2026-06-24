import { Op, literal, type OrderItem, type WhereOptions } from 'sequelize';
import { SistemaLogOperacional } from '../../../models/sistema/SistemaLogOperacional';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { formatCreatedAt } from '../../../utils/dateUtils';
import { buildPagination } from '../../../utils/pagination';
import {
  LOG_CONTEXTO_BLOCKDOMI_ACESSO,
  LOG_CONTEXTO_RPKI_SYNC,
  LOG_CONTEXTO_RPKI_VALIDATION,
  LOG_CONTEXTO_IXC_OS_SYNC,
  LOG_CONTEXTO_ROTINA_EXECUCAO,
  LOG_CONTEXTO_SSH_AUDIT,
  normalizeOperacionalPayload,
  sqlFiltrarLogContexto,
} from '../sistemaLogOperacionalContextos';

/** Rotas das listas TXT públicas (mesmo critério do blockdomiIpsPermitidosMiddleware). */
const ROTAS_API_TXT: readonly string[] = [
  '/domain/version',
  '/domain/version/',
  '/domain/all',
  '/domain/all/',
  '/v4/all',
  '/v4/all/',
  '/v6/all',
  '/v6/all/',
];

export class SistemaLogOperacionalQueryService {
  static rotinaExecucaoToListItem(row: SistemaLogOperacional): Record<string, unknown> {
    const p = normalizeOperacionalPayload(row.payload) ?? {};
    const dataInicio =
      typeof p.data_inicio === 'string'
        ? p.data_inicio
        : row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at);
    return {
      id: String(row.id),
      log_tipo: 'rotina',
      routine_id: p.routine_id ?? null,
      routine_nome: p.routine_nome ?? null,
      routine_tipo: p.routine_tipo ?? null,
      saas: p.origem === 'saas',
      status: p.status ?? 'executando',
      data_inicio: dataInicio,
      data_fim: typeof p.data_fim === 'string' ? p.data_fim : null,
      duracao_ms: p.duracao_ms ?? null,
      resultado: p.resultado ?? null,
      erro: p.erro ?? null,
      empresa_id: row.empresa_id,
      timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  static async buscarLogsRotinaExecucao(
    routineId?: number,
    limit = 100
  ): Promise<Array<Record<string, unknown>>> {
    const and: WhereOptions[] = [literal(sqlFiltrarLogContexto(LOG_CONTEXTO_ROTINA_EXECUCAO))];
    if (routineId != null) {
      and.push(
        literal(
          `CAST(JSON_UNQUOTE(JSON_EXTRACT(\`SistemaLogOperacional\`.\`payload\`, '$.routine_id')) AS UNSIGNED) = ${routineId}`
        )
      );
    }
    const rows = await SistemaLogOperacional.findAll({
      where: { [Op.and]: and },
      order: [['created_at', 'DESC']],
      limit,
    });
    return rows.map((r) => SistemaLogOperacionalQueryService.rotinaExecucaoToListItem(r));
  }

  static async limparLogsRotinaExecucaoAntigos(cutoffDate: Date): Promise<number> {
    return SistemaLogOperacional.destroy({
      where: {
        [Op.and]: [
          literal(sqlFiltrarLogContexto(LOG_CONTEXTO_ROTINA_EXECUCAO)),
          { created_at: { [Op.lt]: cutoffDate } },
        ],
      },
    });
  }

  static blockdomiAcessoToListItem(row: Record<string, unknown>): Record<string, unknown> {
    const p = normalizeOperacionalPayload(row.payload) ?? {};
    return {
      id: row.id,
      ip: p.ip ?? row.ip_address ?? null,
      rota: p.rota ?? null,
      metodo: p.metodo ?? null,
      status_http: p.status_http ?? null,
      sucesso: p.sucesso ?? null,
      mensagem_erro: p.mensagem_erro ?? null,
      user_agent: p.user_agent ?? row.user_agent ?? null,
      empresa_id: row.empresa_id ?? null,
      created_at: row.created_at,
      created_at_formatada: formatCreatedAt(row.created_at),
    };
  }

  private static async attachEmpresaNomes(
    rows: Array<Record<string, unknown>>
  ): Promise<Array<Record<string, unknown>>> {
    const ids = [
      ...new Set(
        rows
          .map((r) => r.empresa_id)
          .filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0)
      ),
    ];
    if (ids.length === 0) {
      return rows.map((r) => ({
        ...r,
        empresa_nome: (r.empresa_nome as string | null | undefined) ?? null,
      }));
    }
    const empresas = await DadosEmpresa.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'razao_social', 'nome_fantasia'],
    });
    const map = new Map<number, string>();
    for (const e of empresas) {
      map.set(e.id, (e.razao_social?.trim() || e.nome_fantasia?.trim() || `Empresa ${e.id}`).trim());
    }
    return rows.map((r) => {
      const eid = typeof r.empresa_id === 'number' ? r.empresa_id : null;
      const nome = eid != null && eid > 0 ? map.get(eid) ?? null : null;
      return { ...r, empresa_nome: nome };
    });
  }

  static async listBlockdomiAcesso(filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortColumn?: string;
    sortDirection?: string;
    sucesso?: boolean;
    origem?: 'api_txt' | 'sistema';
    empresa_id?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 15;
    const offset = (page - 1) * limit;
    const sortDir = filters.sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortCol = 'created_at';

    const and: WhereOptions[] = [literal(sqlFiltrarLogContexto(LOG_CONTEXTO_BLOCKDOMI_ACESSO))];

    if (filters.origem === 'api_txt') {
      const rotas = ROTAS_API_TXT.map((r) => `'${r.replace(/'/g, "''")}'`).join(', ');
      and.push(
        literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`SistemaLogOperacional\`.\`payload\`, '$.rota')) IN (${rotas})`
        )
      );
    } else if (filters.origem === 'sistema') {
      const rotas = ROTAS_API_TXT.map((r) => `'${r.replace(/'/g, "''")}'`).join(', ');
      and.push(
        literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`SistemaLogOperacional\`.\`payload\`, '$.rota')) NOT IN (${rotas})`
        )
      );
    }

    if (typeof filters.sucesso === 'boolean') {
      and.push(
        literal(
          `JSON_EXTRACT(\`SistemaLogOperacional\`.\`payload\`, '$.sucesso') = ${filters.sucesso ? 'true' : 'false'}`
        )
      );
    }

    if (filters.empresa_id != null && filters.empresa_id > 0) {
      and.push({
        [Op.or]: [{ empresa_id: filters.empresa_id }, { empresa_id: { [Op.is]: null } }],
      });
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      and.push({
        [Op.or]: [
          { ip_address: { [Op.like]: term } },
          { mensagem: { [Op.like]: term } },
          literal(
            `JSON_UNQUOTE(JSON_EXTRACT(\`SistemaLogOperacional\`.\`payload\`, '$.rota')) LIKE ${SistemaLogOperacional.sequelize!.escape(term)}`
          ),
          literal(
            `JSON_UNQUOTE(JSON_EXTRACT(\`SistemaLogOperacional\`.\`payload\`, '$.mensagem_erro')) LIKE ${SistemaLogOperacional.sequelize!.escape(term)}`
          ),
        ],
      });
    }

    const order: OrderItem[] = [[sortCol, sortDir]];

    const { count, rows } = await SistemaLogOperacional.findAndCountAll({
      where: { [Op.and]: and },
      limit,
      offset,
      order,
      raw: true,
    });

    const plain = (rows as unknown as Array<Record<string, unknown>>).map((row) =>
      SistemaLogOperacionalQueryService.blockdomiAcessoToListItem(row)
    );
    const data = await SistemaLogOperacionalQueryService.attachEmpresaNomes(plain);

    return {
      data,
      pagination: buildPagination(page, limit, count),
    };
  }

  static sshAuditToListItem(row: SistemaLogOperacional): Record<string, unknown> {
    const p = normalizeOperacionalPayload(row.payload) ?? {};
    return {
      id: String(row.id),
      timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      action: p.action ?? null,
      userId: p.user_id ?? null,
      empresa_id: row.empresa_id,
      deviceId: p.device_id ?? null,
      deviceName: p.device_name ?? null,
      command: p.command ?? null,
      output: p.output ?? null,
      success: p.success ?? true,
      errorMessage: p.error_message ?? null,
      ip: row.ip_address ?? p.ip ?? null,
      duration: p.duration ?? null,
    };
  }

  static async searchSshAuditLogs(params: {
    deviceId?: string;
    userId?: string;
    action?: string;
    logType?: 'equipamentos' | 'agentes';
    startDate?: string;
    endDate?: string;
    search?: string;
    searchField?: string;
    searchUserIds?: string[];
    page?: number;
    limit?: number;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    empresaId?: number;
  }): Promise<{ logs: Record<string, unknown>[]; total: number }> {
    const { page = 1, limit = 20 } = params;
    const and: WhereOptions[] = [literal(sqlFiltrarLogContexto(LOG_CONTEXTO_SSH_AUDIT))];
    const alias = 'SistemaLogOperacional';
    const seq = SistemaLogOperacional.sequelize!;

    if (params.logType === 'equipamentos') {
      and.push(
        literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.action')) NOT IN ('AGENT_CONNECT', 'AGENT_DISCONNECT')`
        )
      );
    } else if (params.logType === 'agentes') {
      and.push(
        literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.action')) IN ('AGENT_CONNECT', 'AGENT_DISCONNECT')`
        )
      );
    }

    if (params.empresaId != null && params.empresaId > 0) {
      and.push({ empresa_id: params.empresaId });
    }
    if (params.deviceId) {
      and.push(
        literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.device_id')) = ${seq.escape(params.deviceId)}`
        )
      );
    }
    if (params.userId) {
      and.push(
        literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.user_id')) = ${seq.escape(params.userId)}`
        )
      );
    }
    if (params.action) {
      and.push(
        literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.action')) = ${seq.escape(params.action)}`
        )
      );
    }

    if (params.startDate || params.endDate) {
      const range: { [Op.gte]?: Date; [Op.lte]?: Date } = {};
      if (params.startDate) range[Op.gte] = new Date(params.startDate);
      if (params.endDate) range[Op.lte] = new Date(params.endDate);
      and.push({ created_at: range });
    }

    const search = params.search?.trim();
    if (search) {
      const esc = seq.escape(`%${search}%`);
      const field = params.searchField?.trim();
      if (field === 'command') {
        and.push(literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.command')) LIKE ${esc}`));
      } else if (field === 'deviceName') {
        and.push(literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.device_name')) LIKE ${esc}`));
      } else if (field === 'userId') {
        if (params.searchUserIds && params.searchUserIds.length > 0) {
          const ids = params.searchUserIds.map((id) => seq.escape(id)).join(', ');
          and.push(literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.user_id')) IN (${ids})`));
        } else {
          and.push(literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.user_id')) LIKE ${esc}`));
        }
      } else if (field === 'errorMessage') {
        and.push(literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.error_message')) LIKE ${esc}`));
      } else {
        and.push({
          [Op.or]: [
            literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.command')) LIKE ${esc}`),
            literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.error_message')) LIKE ${esc}`),
            literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.device_name')) LIKE ${esc}`),
            literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.user_id')) LIKE ${esc}`),
          ],
        });
      }
    }

    const sortCol = 'created_at';
    const sortDir = params.sortDirection === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const { rows, count } = await SistemaLogOperacional.findAndCountAll({
      where: { [Op.and]: and },
      order: [[sortCol, sortDir]],
      limit,
      offset,
    });

    return {
      logs: rows.map((r) => SistemaLogOperacionalQueryService.sshAuditToListItem(r)),
      total: count,
    };
  }

  static rpkiSyncToListItem(row: SistemaLogOperacional): Record<string, unknown> {
    const p = normalizeOperacionalPayload(row.payload) ?? {};
    return {
      id: row.id,
      empresa_id: row.empresa_id,
      ca_id: p.ca_id ?? null,
      type: p.sync_type ?? null,
      trigger_type: p.trigger_type ?? null,
      status: p.status ?? null,
      remote_host: p.remote_host ?? null,
      message: p.message ?? row.mensagem ?? null,
      created_at: row.created_at,
    };
  }

  static async listRpkiSync(params: {
    page: number;
    limit: number;
    offset: number;
    empresaId?: number | null;
    search?: string;
    status?: string;
    baseWhere: {
      type?: 'provisioning' | 'publication';
      trigger_type?: 'roa' | 'aspa' | 'manual';
    };
  }): Promise<{ rows: Record<string, unknown>[]; count: number }> {
    const and: WhereOptions[] = [literal(sqlFiltrarLogContexto(LOG_CONTEXTO_RPKI_SYNC))];
    const alias = 'SistemaLogOperacional';
    const seq = SistemaLogOperacional.sequelize!;

    if (params.empresaId != null) and.push({ empresa_id: params.empresaId });
    if (params.baseWhere.type) {
      and.push(
        literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.sync_type')) = ${seq.escape(params.baseWhere.type)}`
        )
      );
    }
    if (params.baseWhere.trigger_type) {
      and.push(
        literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.trigger_type')) = ${seq.escape(params.baseWhere.trigger_type)}`
        )
      );
    }
    if (params.status && ['success', 'failed'].includes(params.status)) {
      and.push(
        literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.status')) = ${seq.escape(params.status)}`
        )
      );
    }
    if (params.search) {
      const esc = seq.escape(`%${params.search}%`);
      and.push({
        [Op.or]: [
          literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.remote_host')) LIKE ${esc}`),
          literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.message')) LIKE ${esc}`),
          { mensagem: { [Op.like]: `%${params.search}%` } },
        ],
      });
    }

    const { rows, count } = await SistemaLogOperacional.findAndCountAll({
      where: { [Op.and]: and },
      order: [['created_at', 'DESC']],
      limit: params.limit,
      offset: params.offset,
    });

    return {
      rows: rows.map((r) => SistemaLogOperacionalQueryService.rpkiSyncToListItem(r)),
      count,
    };
  }

  static async listRpkiValidation(params: {
    page: number;
    limit: number;
    offset: number;
    empresaId?: number | null;
    search?: string;
  }): Promise<{ rows: Record<string, unknown>[]; count: number }> {
    const and: WhereOptions[] = [literal(sqlFiltrarLogContexto(LOG_CONTEXTO_RPKI_VALIDATION))];
    const alias = 'SistemaLogOperacional';
    const seq = SistemaLogOperacional.sequelize!;

    if (params.empresaId != null) and.push({ empresa_id: params.empresaId });

    if (params.search) {
      const esc = seq.escape(`%${params.search}%`);
      and.push({
        [Op.or]: [
          literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.prefix')) LIKE ${esc}`),
          literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.reason')) LIKE ${esc}`),
          { mensagem: { [Op.like]: `%${params.search}%` } },
        ],
      });
    }

    const { rows, count } = await SistemaLogOperacional.findAndCountAll({
      where: { [Op.and]: and },
      order: [['created_at', 'DESC']],
      limit: params.limit,
      offset: params.offset,
    });

    return {
      rows: rows.map((row) => {
        const p = normalizeOperacionalPayload(row.payload) ?? {};
        return {
          id: row.id,
          empresa_id: row.empresa_id,
          prefix: p.prefix ?? null,
          asn: p.asn ?? null,
          prefix_length: p.prefix_length ?? null,
          state: p.state ?? null,
          matched_roa_id: p.matched_roa_id ?? null,
          reason: p.reason ?? null,
          request_ip: row.ip_address ?? null,
          message: row.mensagem ?? p.reason ?? null,
          created_at: row.created_at,
        };
      }),
      count,
    };
  }

  static async listRpkiValidationByEmpresa(
    empresaId: number | null,
    limit = 500
  ): Promise<Array<Record<string, unknown>>> {
    const and: WhereOptions[] = [literal(sqlFiltrarLogContexto(LOG_CONTEXTO_RPKI_VALIDATION))];
    if (empresaId == null) and.push({ empresa_id: { [Op.is]: null } });
    else and.push({ empresa_id: empresaId });

    const rows = await SistemaLogOperacional.findAll({
      where: { [Op.and]: and },
      order: [['created_at', 'DESC']],
      limit,
    });

    return rows.map((row) => {
      const p = normalizeOperacionalPayload(row.payload) ?? {};
      return {
        id: row.id,
        empresa_id: row.empresa_id,
        prefix: p.prefix ?? null,
        asn: p.asn ?? null,
        prefix_length: p.prefix_length ?? null,
        state: p.state ?? null,
        matched_roa_id: p.matched_roa_id ?? null,
        reason: p.reason ?? null,
        request_ip: row.ip_address ?? null,
        created_at: row.created_at,
      };
    });
  }

  static ixcOsSyncToListItem(row: SistemaLogOperacional): Record<string, unknown> {
    const p = normalizeOperacionalPayload(row.payload) ?? {};
    return {
      id: row.id,
      empresa_id: row.empresa_id,
      integracao_id: p.integracao_id ?? null,
      integracao_nome: p.integracao_nome ?? null,
      event_type: p.event_type ?? null,
      status: p.status ?? null,
      trigger_type: p.trigger_type ?? null,
      ordem_servico_id: p.ordem_servico_id ?? null,
      ixc_os_id: p.ixc_os_id ?? null,
      protocolo: p.protocolo ?? null,
      cliente_nome: p.cliente_nome ?? null,
      origem_abertura: p.origem_abertura ?? null,
      operador_nome: p.operador_nome ?? null,
      status_anterior: p.status_anterior ?? null,
      status_novo: p.status_novo ?? null,
      message: p.message ?? row.mensagem ?? null,
      created_at: row.created_at,
    };
  }

  static async listIxcOsSync(params: {
    page: number;
    limit: number;
    offset: number;
    empresaId?: number | null;
    search?: string;
    eventType?: string;
  }): Promise<{ rows: Record<string, unknown>[]; count: number }> {
    const and: WhereOptions[] = [literal(sqlFiltrarLogContexto(LOG_CONTEXTO_IXC_OS_SYNC))];
    const alias = 'SistemaLogOperacional';
    const seq = SistemaLogOperacional.sequelize!;

    if (params.empresaId != null) and.push({ empresa_id: params.empresaId });
    if (params.eventType?.trim()) {
      and.push(
        literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.event_type')) = ${seq.escape(params.eventType.trim())}`
        )
      );
    }
    if (params.search) {
      const esc = seq.escape(`%${params.search}%`);
      and.push({
        [Op.or]: [
          literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.protocolo')) LIKE ${esc}`),
          literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.cliente_nome')) LIKE ${esc}`),
          literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.operador_nome')) LIKE ${esc}`),
          literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.integracao_nome')) LIKE ${esc}`),
          literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${alias}\`.\`payload\`, '$.message')) LIKE ${esc}`),
          { mensagem: { [Op.like]: `%${params.search}%` } },
        ],
      });
    }

    const { rows, count } = await SistemaLogOperacional.findAndCountAll({
      where: { [Op.and]: and },
      order: [['created_at', 'DESC']],
      limit: params.limit,
      offset: params.offset,
    });

    return {
      rows: rows.map((r) => SistemaLogOperacionalQueryService.ixcOsSyncToListItem(r)),
      count,
    };
  }
}
